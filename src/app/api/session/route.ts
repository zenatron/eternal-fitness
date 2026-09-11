import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions, userStats } from '@/lib/db/schema';
import { eq, and, isNotNull, desc, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { errorResponse, parseLimitParam, successResponse } from '@/lib/api/response';
import {
  createWorkoutSession,
  calculateSessionMetrics,
} from '@/utils/workoutJsonUtils';
import { ExercisePerformance, WorkoutTemplateData } from '@/types/workout';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { awardWorkoutXP } from '@/lib/xp';
import { getUserTimeZone } from '@/lib/userTimeZone';
import {
  computeStreakFromHistory,
  getStreakBaseline,
  recordWorkoutCompletion,
} from '@/lib/workout/completion';



const legacySessionSchema = z.object({
  templateId: z.string(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  performance: z.array(z.any()).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = legacySessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid session data', 400, validationResult.error.errors);
    }

    const { templateId, scheduledAt, duration, notes, performance } = validationResult.data;
    const isScheduling = !!scheduledAt;

    const [template] = await db
      .select()
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

    if (!template) {
      return errorResponse('Template not found or not owned by user', 404, { templateId });
    }

    const templateData = template.workoutData as WorkoutTemplateData;

    if (isScheduling) {
      const [newSession] = await db
        .insert(workoutSessions)
        .values({
          userId,
          workoutTemplateId: templateId,
          scheduledAt: new Date(scheduledAt!),
          notes,
          performanceData: {
            templateSnapshot: templateData,
            performance: {},
            environment: {},
            metrics: {
              totalVolume: 0, totalSets: 0, totalExercises: 0,
              completedSets: 0, skippedSets: 0,
              personalRecords: [], volumeRecords: [], adherenceScore: 0,
            },
          },
          totalVolume: 0,
          totalSets: 0,
          totalExercises: 0,
        })
        .returning();

      return successResponse(newSession, 201);
    } else {
      const jsonPerformance: Record<string, ExercisePerformance> = {};
      if (performance && Array.isArray(performance)) {
        performance.forEach((item, index) => {
          const exerciseKey = `exercise-${index + 1}`;
          jsonPerformance[exerciseKey] = {
            exerciseKey,
            sets: item.sets || [],
            exerciseNotes: item.notes || '',
            totalVolume: 0,
            performanceRating: 3,
          };
        });
      }

      const sessionData = createWorkoutSession(templateData, jsonPerformance);
      const metrics = calculateSessionMetrics(jsonPerformance);

      const newSession = await db.transaction(async (tx) => {
        const [session] = await tx
          .insert(workoutSessions)
          .values({
            userId,
            workoutTemplateId: templateId,
            completedAt: new Date(),
            duration,
            notes,
            performanceData: sessionData,
            totalVolume: metrics.totalVolume,
            totalSets: metrics.totalSets,
            totalExercises: metrics.totalExercises,
            personalRecords: metrics.personalRecords?.length || 0,
          })
          .returning();

        try {
          await processWorkoutSessionPRs(userId, session.id, jsonPerformance, templateData, tx);
        } catch (error) {
          console.error('Error processing PRs:', error);
        }

        /*
         * The shared completion bookkeeping. This legacy route predates it and
         * silently skipped streak recompute, lifetime/monthly totals, XP and
         * achievements — a workout logged here was invisible to every number the
         * profile shows. See lib/workout/completion.ts for why both completion
         * paths must go through the same writer.
         */
        const completionTime = session.completedAt ?? new Date();
        const timeZone = await getUserTimeZone(userId, tx);
        const streak = await computeStreakFromHistory(
          tx,
          userId,
          timeZone,
          await getStreakBaseline(tx, userId)
        );

        await recordWorkoutCompletion(tx, {
          userId,
          timeZone,
          totals: {
            totalVolume: metrics.totalVolume,
            totalSets: metrics.totalSets,
            totalExercises: metrics.totalExercises,
          },
          durationSeconds: duration ?? 0,
          completionTime,
          streak,
        });

        return session;
      });

      // Re-evaluate achievements and XP outside the transaction, matching the
      // logging path.
      try {
        await updateUniqueExercisesCount(userId);
        await updateUserAchievements(userId);
      } catch (achievementError) {
        console.error('Error updating achievements after legacy session create:', achievementError);
      }
      try {
        await awardWorkoutXP(userId, { newPRs: metrics.personalRecords?.length || 0 });
      } catch (xpError) {
        console.error('Error awarding workout XP:', xpError);
      }

      return successResponse(newSession, 201);
    }
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    // Keyset-paginated and projected — performanceData carries a full template
    // snapshot per row and would dominate the payload. Set-level detail belongs
    // to GET /api/session/[sessionId].
    const { searchParams } = new URL(request.url);
    const limit = parseLimitParam(searchParams.get('limit'));
    const before = searchParams.get('before');
    const beforeDate = before && !Number.isNaN(Date.parse(before)) ? new Date(before) : null;

    const sessions = await db.query.workoutSessions.findMany({
      columns: {
        id: true,
        completedAt: true,
        scheduledAt: true,
        duration: true,
        notes: true,
        totalVolume: true,
        totalSets: true,
        totalExercises: true,
        personalRecords: true,
        workoutTemplateId: true,
      },
      where: and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.completedAt),
        beforeDate ? lt(workoutSessions.completedAt, beforeDate) : undefined
      ),
      orderBy: desc(workoutSessions.completedAt),
      limit,
      with: {
        workoutTemplate: {
          columns: { id: true, name: true },
        },
      },
    });

    const nextCursor =
      sessions.length === limit
        ? (sessions[sessions.length - 1].completedAt?.toISOString() ?? null)
        : null;

    return successResponse({ sessions, nextCursor });
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}
