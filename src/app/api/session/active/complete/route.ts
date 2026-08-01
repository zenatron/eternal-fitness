import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions, userStats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  computeStreakFromHistory,
  getStreakBaseline,
  recordWorkoutCompletion,
} from '@/lib/workout/completion';
import {
  ActiveWorkoutSessionData,
  WorkoutSessionData,
} from '@/types/workout';
import { calculateSessionMetrics, convertExerciseProgressToPerformance } from '@/utils/workoutJsonUtils';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';
import { awardWorkoutXP } from '@/lib/xp';
import {
  findIdempotentResponse,
  getIdempotencyKey,
  pruneIdempotencyKeys,
  recordIdempotentResponse,
} from '@/lib/idempotency';
import { z } from 'zod';

const ENDPOINT = 'session/active/complete';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json(data, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}):`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

const completeSessionSchema = z.object({
  duration: z.number().optional(),
  notes: z.string().optional(),
  completedAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = completeSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid completion data', 400, validationResult.error.errors);
    }

    const { duration, notes, completedAt } = validationResult.data;

    // Offline clients replay this request; without the dedupe below a workout
    // completed with no signal would be logged twice, permanently inflating
    // volume, streak and XP.
    const idempotencyKey = getIdempotencyKey(request);
    if (idempotencyKey) {
      const existing = await findIdempotentResponse(userId, idempotencyKey, ENDPOINT);
      if (existing) {
        return successResponse({
          ...(existing.response as Record<string, unknown>),
          deduplicated: true,
        });
      }
    }

    const session = await db.transaction(async (tx) => {
      const [stats] = await tx
        .select({
          activeWorkoutId: userStats.activeWorkoutId,
          activeWorkoutData: userStats.activeWorkoutData,
          activeWorkoutStartedAt: userStats.activeWorkoutStartedAt,
        })
        .from(userStats)
        .where(eq(userStats.userId, userId));

      if (!stats?.activeWorkoutId || !stats.activeWorkoutData) {
        throw new Error('No active workout session found');
      }

      const activeSessionData = stats.activeWorkoutData as ActiveWorkoutSessionData;
      const completionTime = completedAt ? new Date(completedAt) : new Date();

      // Prefer the client's own elapsed count, then the tracked active seconds.
      // The wall-clock fallback subtracted `pausedTime` from a millisecond
      // difference while `pausedTime` was in seconds, so a paused workout came
      // out essentially un-subtracted; it is now only a last resort.
      const trackedSeconds =
        activeSessionData.accumulatedSeconds ??
        (activeSessionData.pausedTime || 0);

      const sessionDuration =
        duration ??
        (trackedSeconds > 0
          ? Math.floor(trackedSeconds)
          : stats.activeWorkoutStartedAt
            ? Math.floor(
                (completionTime.getTime() - stats.activeWorkoutStartedAt.getTime()) / 1000
              )
            : 0);

      const finalTemplate = activeSessionData.modifiedTemplate || activeSessionData.originalTemplate;

      let performanceData = activeSessionData.performance;
      if (Object.keys(performanceData).length === 0 && activeSessionData.exerciseProgress && Object.keys(activeSessionData.exerciseProgress).length > 0) {
        performanceData = convertExerciseProgressToPerformance(activeSessionData.exerciseProgress, finalTemplate);
      }

      const metrics = calculateSessionMetrics(performanceData);

      const sessionData: WorkoutSessionData = {
        templateSnapshot: finalTemplate,
        performance: performanceData,
        metrics,
        environment: {},
        timeline: [],
      };

      const [createdSession] = await tx
        .insert(workoutSessions)
        .values({
          userId,
          workoutTemplateId: activeSessionData.templateId,
          completedAt: completionTime,
          duration: sessionDuration,
          notes: notes || activeSessionData.sessionNotes,
          performanceData: sessionData,
          totalVolume: metrics.totalVolume,
          // Completed, not attempted — matches what the summary screen reports
          // and what /api/session/log has always stored. See WorkoutTotals.
          totalSets: metrics.completedSets,
          totalExercises: metrics.totalExercises,
          personalRecords: metrics.personalRecords?.length || 0,
        })
        .returning();

      // Recomputed from history rather than incremented from `lastWorkoutAt`:
      // sessions can also be inserted into the past via /api/session/log, and an
      // incremental count cannot see a gap that was filled in behind it.
      const streak = await computeStreakFromHistory(
        tx,
        userId,
        await getStreakBaseline(tx, userId)
      );

      await recordWorkoutCompletion(tx, {
        userId,
        totals: {
          totalVolume: metrics.totalVolume,
          totalSets: metrics.completedSets,
          totalExercises: metrics.totalExercises,
        },
        durationSeconds: sessionDuration,
        completionTime,
        streak,
        clearActiveWorkout: true,
      });

      return createdSession;
    });

    // Process PRs outside transaction using the proper detection system
    let newPRs: any[] = [];
    try {
      const prResult = await processWorkoutSessionPRs(
        userId,
        session.id,
        (session.performanceData as WorkoutSessionData).performance,
        (session.performanceData as WorkoutSessionData).templateSnapshot,
      );
      newPRs = prResult.newPRs;
    } catch (prError) {
      console.error('Error processing PRs for completed session:', prError);
    }

    let achievementResult = { newAchievements: [] as string[], totalAchievements: 0, pointsAwarded: 0, progress: {} as Record<string, number> };
    try {
      // Update unique exercises count first, then check achievements
      // (achievements depend on the updated uniqueExercises count)
      await updateUniqueExercisesCount(userId);
      achievementResult = await updateUserAchievements(userId);
    } catch (achievementError) {
      console.error('Error updating achievements:', achievementError);
    }

    // Award workout XP
    let workoutXP = 100;
    try {
      workoutXP = await awardWorkoutXP(userId, { newPRs: newPRs.length });
    } catch (xpError) {
      console.error('Error awarding workout XP:', xpError);
    }

    const totalAwarded = achievementResult.pointsAwarded + workoutXP;

    const payload = {
      session,
      message: 'Workout completed successfully',
      achievements: achievementResult,
      newPRs,
      workoutXP,
      totalAwarded,
    };

    if (idempotencyKey) {
      // Stored after the work is done, so a crash mid-transaction leaves the key
      // unrecorded and the retry genuinely re-runs.
      await recordIdempotentResponse(userId, idempotencyKey, ENDPOINT, payload);
      // Opportunistic housekeeping; failures here are swallowed internally.
      void pruneIdempotencyKeys();
    }

    return successResponse(payload);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to complete active session: ${errorMessage}`, 500);
  }
}
