import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions, userStats, monthlyStats } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { dayKeyOf, monthOf } from '@/utils/datetime';
import { getUserTimeZone } from '@/lib/userTimeZone';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [session/{id}]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

const performanceSchema = z.record(z.object({
  exerciseKey: z.string(),
  sets: z.array(z.object({
    setId: z.string(),
    actualReps: z.number().optional(),
    actualWeight: z.number().optional(),
    actualDuration: z.number().optional(),
    actualRpe: z.number().optional(),
    completed: z.boolean(),
    skipped: z.boolean().optional(),
    notes: z.string().optional(),
    restTime: z.number().optional(),
  })),
  exerciseNotes: z.string().optional(),
  totalVolume: z.number(),
  averageRpe: z.number().optional(),
}));

const updateSessionSchema = z.object({
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  performance: performanceSchema.optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { sessionId } = await params;

    const session = await db.query.workoutSessions.findFirst({
      where: and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)),
      with: {
        workoutTemplate: {
          columns: { id: true, name: true },
        },
      },
    });

    if (!session) {
      return errorResponse('Session not found or access denied', 404, { sessionId });
    }

    return successResponse(session);
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { sessionId } = await params;
    const body = await request.json();

    const validationResult = updateSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    const updatedSession = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(workoutSessions)
        .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));

      if (!existing) throw new Error('SessionNotFound');

      const oldVolume = existing.totalVolume || 0;
      const oldDuration = existing.duration || 0;
      const oldSets = existing.totalSets || 0;
      const oldExercises = existing.totalExercises || 0;
      const oldCompletedAt = existing.completedAt;

      const updatePayload: Record<string, unknown> = {};

      if (validatedData.duration !== undefined) updatePayload.duration = validatedData.duration;
      if (validatedData.notes !== undefined) updatePayload.notes = validatedData.notes;

      if (validatedData.completedAt) {
        updatePayload.completedAt = new Date(validatedData.completedAt);
        updatePayload.scheduledAt = null;
      } else if (validatedData.scheduledAt !== undefined) {
        updatePayload.scheduledAt = validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null;
        if (updatePayload.scheduledAt) updatePayload.completedAt = null;
      }

      if (validatedData.performance) {
        const perf = validatedData.performance;
        const newVolume = Object.values(perf).reduce((t, ep) => t + ep.totalVolume, 0);
        const newCompletedSets = Object.values(perf).reduce(
          (t, ep) => t + ep.sets.filter(s => s.completed).length, 0
        );
        const newTotalSets = Object.values(perf).reduce((t, ep) => t + ep.sets.length, 0);
        const newExercises = Object.keys(perf).length;
        const skippedSets = Object.values(perf).reduce(
          (t, ep) => t + ep.sets.filter(s => s.skipped).length, 0
        );
        const adherenceScore = newTotalSets > 0 ? Math.round((newCompletedSets / newTotalSets) * 100) : 100;

        const existingPerfData = (existing.performanceData as unknown as Record<string, unknown>) || {};
        updatePayload.performanceData = {
          ...existingPerfData,
          performance: perf,
          metrics: {
            totalVolume: newVolume,
            totalSets: newTotalSets,
            totalExercises: newExercises,
            completedSets: newCompletedSets,
            skippedSets,
            adherenceScore,
            personalRecords: [],
            volumeRecords: [],
          },
        };
        updatePayload.totalVolume = newVolume;
        updatePayload.totalSets = newCompletedSets;
        updatePayload.totalExercises = newExercises;
      }

      const [updated] = await tx
        .update(workoutSessions)
        .set(updatePayload)
        .where(eq(workoutSessions.id, sessionId))
        .returning();

      // Recalculate stats diffs if volume, duration, sets, or exercises changed
      const newVolume = (updatePayload.totalVolume as number) ?? oldVolume;
      const newDuration = (updatePayload.duration as number) ?? oldDuration;
      const newSets = (updatePayload.totalSets as number) ?? oldSets;
      const newExercises = (updatePayload.totalExercises as number) ?? oldExercises;

      const volumeDiff = newVolume - oldVolume;
      const hoursDiff = (newDuration - oldDuration) / 3600;
      const setsDiff = newSets - oldSets;
      const exercisesDiff = newExercises - oldExercises;

      const hasStatsDiff = volumeDiff !== 0 || hoursDiff !== 0 || setsDiff !== 0 || exercisesDiff !== 0;

      if (hasStatsDiff) {
        await tx
          .update(userStats)
          .set({
            totalVolume: sql`GREATEST(0, ${userStats.totalVolume} + ${volumeDiff})`,
            totalTrainingHours: sql`GREATEST(0, ${userStats.totalTrainingHours} + ${hoursDiff})`,
            totalSets: sql`GREATEST(0, ${userStats.totalSets} + ${setsDiff})`,
            totalExercises: sql`GREATEST(0, ${userStats.totalExercises} + ${exercisesDiff})`,
          })
          .where(eq(userStats.userId, userId));
      }

      // Handle completedAt date change — move monthly stats between buckets
      const newCompletedAt = (updatePayload.completedAt as Date) ?? oldCompletedAt;
      if (oldCompletedAt && newCompletedAt) {
        /*
         * Has to file months the same way `recordWorkoutCompletion` does — the
         * user's calendar — or editing a session could decrement a bucket the
         * workout was never counted in and credit one it does not belong to,
         * leaving both months permanently wrong.
         */
        const timeZone = await getUserTimeZone(userId, tx);
        const { year: oldYear, month: oldMonth } = monthOf(dayKeyOf(oldCompletedAt, timeZone));
        const { year: newYear, month: newMonth } = monthOf(dayKeyOf(newCompletedAt, timeZone));

        if (oldYear !== newYear || oldMonth !== newMonth) {
          // Decrement old month bucket
          await tx
            .update(monthlyStats)
            .set({
              workoutsCount: sql`GREATEST(0, ${monthlyStats.workoutsCount} - 1)`,
              volume: sql`GREATEST(0, ${monthlyStats.volume} - ${oldVolume})`,
              trainingHours: sql`GREATEST(0, ${monthlyStats.trainingHours} - ${oldDuration / 3600})`,
            })
            .where(and(
              eq(monthlyStats.userId, userId),
              eq(monthlyStats.year, oldYear),
              eq(monthlyStats.month, oldMonth),
            ));

          // Upsert new month bucket
          await tx
            .insert(monthlyStats)
            .values({
              userId,
              year: newYear,
              month: newMonth,
              workoutsCount: 1,
              volume: newVolume,
              trainingHours: newDuration / 3600,
            })
            .onConflictDoUpdate({
              target: [monthlyStats.userId, monthlyStats.year, monthlyStats.month],
              set: {
                workoutsCount: sql`${monthlyStats.workoutsCount} + 1`,
                volume: sql`${monthlyStats.volume} + ${newVolume}`,
                trainingHours: sql`${monthlyStats.trainingHours} + ${newDuration / 3600}`,
              },
            });
        } else if (hasStatsDiff) {
          // Same month but values changed — apply diffs
          await tx
            .update(monthlyStats)
            .set({
              volume: sql`GREATEST(0, ${monthlyStats.volume} + ${volumeDiff})`,
              trainingHours: sql`GREATEST(0, ${monthlyStats.trainingHours} + ${hoursDiff})`,
            })
            .where(and(
              eq(monthlyStats.userId, userId),
              eq(monthlyStats.year, oldYear),
              eq(monthlyStats.month, oldMonth),
            ));
        }
      }

      return updated;
    });

    // Re-evaluate achievements outside the transaction
    try {
      await updateUniqueExercisesCount(userId);
      await updateUserAchievements(userId);
    } catch (achievementError) {
      console.error('Error updating achievements after session edit:', achievementError);
    }

    return successResponse(updatedSession);
  } catch (error: any) {
    const { sessionId } = await params;
    if (error.message === 'SessionNotFound') {
      return errorResponse('Session not found or access denied', 404, { sessionId });
    }
    return errorResponse('Internal Server Error updating session', 500, { sessionId, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { sessionId } = await params;

    const deleted = await db
      .delete(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
      .returning({ id: workoutSessions.id });

    if (deleted.length === 0) {
      return errorResponse('Session not found or access denied', 404, { sessionId });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { sessionId } = await params;
    return errorResponse('Internal Server Error deleting session', 500, { sessionId, error: error instanceof Error ? error.message : String(error) });
  }
}
