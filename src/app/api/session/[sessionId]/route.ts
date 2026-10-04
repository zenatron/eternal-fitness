import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions, userStats, monthlyStats } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { computeStreakFromHistory, getStreakBaseline, unwindWorkoutCompletion } from '@/lib/workout/completion';
import { monthOf, dayKeyOf } from '@/utils/datetime';
import { getUserTimeZone } from '@/lib/userTimeZone';
import { errorResponse, successResponse } from '@/lib/api/response';
import { recomputePerformanceVolume } from '@/lib/volume';

const performanceSchema = z.record(z.object({
  exerciseKey: z.string(),
  perSide: z.boolean().optional(),
  sets: z.array(z.object({
    setId: z.string(),
    actualReps: z.number().int().nonnegative().max(10000).optional(),
    actualWeight: z.number().nonnegative().max(100000).optional(),
    actualDuration: z.number().positive().max(86400).optional(),
    actualRpe: z.number().min(1).max(10).optional(),
    completed: z.boolean(),
    skipped: z.boolean().optional(),
    notes: z.string().max(2000).optional(),
    restTime: z.number().nonnegative().optional(),
  })),
  exerciseNotes: z.string().max(2000).optional(),
  // Accepted for compatibility, then ignored: volume is recomputed from the
  // sets (see recomputePerformanceVolume) so a routine edit can neither
  // corrupt totals nor smuggle arbitrary numbers into lifetime stats.
  totalVolume: z.number().optional(),
  averageRpe: z.number().optional(),
}));

const updateSessionSchema = z.object({
  duration: z.number().int().positive().max(86400).optional(),
  notes: z.string().max(10000).optional(),
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
        if (validatedData.scheduledAt && oldCompletedAt) {
          // A completed workout is in every lifetime total, monthly bucket and
          // streak day; un-completing it here would leave those numbers
          // counting a session that no query can see. Rescheduling a done
          // workout is a delete-and-relog, not a field edit.
          throw new Error('CannotUncomplete');
        }
        updatePayload.scheduledAt = validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null;
      }

      if (validatedData.performance) {
        // Recompute volume from the sets — the edit modal used to send bare
        // reps×weight, which silently halved dumbbell volume (and lifetime
        // stats with it, via the diff below). The stored per-side flag and the
        // session's own template snapshot decide the multiplier; the library
        // is deliberately NOT consulted, so legacy rows keep their saved
        // totals (see volume.ts, "Deliberately not retroactive").
        const existingTemplateSnapshot = (existing.performanceData as unknown as { templateSnapshot?: { exercises?: { id?: string; exerciseKey?: string; perSide?: boolean }[] } })?.templateSnapshot ?? null;
        const recomputed = recomputePerformanceVolume(validatedData.performance, existingTemplateSnapshot);
        const perf = recomputed.performance;
        const newVolume = recomputed.totalVolume;
        const newCompletedSets = recomputed.completedSets;
        const newTotalSets = recomputed.totalSets;
        const newExercises = recomputed.totalExercises;
        const skippedSets = recomputed.skippedSets;
        const adherenceScore = newTotalSets > 0 ? Math.round((newCompletedSets / newTotalSets) * 100) : 100;

        const existingPerfData = (existing.performanceData as unknown as Record<string, unknown>) || {};
        const existingMetrics = (existingPerfData.metrics as Record<string, unknown>) || {};
        updatePayload.performanceData = {
          ...existingPerfData,
          performance: perf,
          metrics: {
            ...existingMetrics,
            totalVolume: newVolume,
            totalSets: newTotalSets,
            totalExercises: newExercises,
            completedSets: newCompletedSets,
            skippedSets,
            adherenceScore,
            // The PR/volume record lists on the session row are display
            // history, not live state (userStats owns the real records);
            // recomputing them from an edited set list would silently rewrite
            // which session "set" a record. Keep whatever was recorded.
            personalRecords: existingMetrics.personalRecords ?? [],
            volumeRecords: existingMetrics.volumeRecords ?? [],
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
    if (error.message === 'CannotUncomplete') {
      return errorResponse('A completed workout cannot be turned back into a scheduled one — delete it and reschedule instead', 400);
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

    /*
     * A deletion must unwind what `recordWorkoutCompletion` wound up. It used to
     * delete the row and stop there, so every deleted workout stayed counted in
     * lifetime totals, monthly buckets and the streaks forever — inflating the
     * very numbers the log exists to keep honest. Mirrors the reconciliation the
     * PUT above already does, in the same transaction.
     */
    const deleted = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(workoutSessions)
        .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));

      if (!existing) return null;

      if (existing.completedAt) {
        // Filed by the user's calendar month, exactly as completion recorded it.
        const timeZone = await getUserTimeZone(userId, tx);

        await unwindWorkoutCompletion(tx, {
          userId,
          totals: {
            totalVolume: existing.totalVolume || 0,
            totalSets: existing.totalSets || 0,
            totalExercises: existing.totalExercises || 0,
          },
          durationSeconds: existing.duration || 0,
          completionTime: existing.completedAt,
          timeZone,
        });

        // Delete first: the streak recompute below scans completed sessions,
        // and the row must be gone before it runs or the deleted workout still
        // counts toward the streak it is being removed from.
        await tx
          .delete(workoutSessions)
          .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));

        // Streaks are recomputed from what remains; the longest is floored at the
        // recorded value so history that once earned it keeps it.
        const baseline = await getStreakBaseline(tx, userId);
        const streak = await computeStreakFromHistory(tx, userId, timeZone, baseline);
        await tx
          .update(userStats)
          .set({
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastWorkoutAt: streak.lastWorkoutAt,
          })
          .where(eq(userStats.userId, userId));
      } else {
        await tx
          .delete(workoutSessions)
          .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));
      }

      return { id: sessionId };
    });

    if (!deleted) {
      return errorResponse('Session not found or access denied', 404, { sessionId });
    }

    // Re-evaluate achievements outside the transaction, matching PUT.
    try {
      await updateUniqueExercisesCount(userId);
      await updateUserAchievements(userId);
    } catch (achievementError) {
      console.error('Error updating achievements after session delete:', achievementError);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { sessionId } = await params;
    return errorResponse('Internal Server Error deleting session', 500, { sessionId, error: error instanceof Error ? error.message : String(error) });
  }
}
