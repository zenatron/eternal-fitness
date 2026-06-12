import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions, userStats, monthlyStats } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  ActiveWorkoutSessionData,
  WorkoutSessionData,
} from '@/types/workout';
import { calculateSessionMetrics, convertExerciseProgressToPerformance } from '@/utils/workoutJsonUtils';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { z } from 'zod';

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

      const sessionDuration = duration || (
        stats.activeWorkoutStartedAt
          ? Math.floor((completionTime.getTime() - stats.activeWorkoutStartedAt.getTime() - activeSessionData.pausedTime) / 1000)
          : 0
      );

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
          totalSets: metrics.totalSets,
          totalExercises: metrics.totalExercises,
          personalRecords: metrics.personalRecords?.length || 0,
        })
        .returning();

      // Clear active session and update stats
      await tx
        .update(userStats)
        .set({
          activeWorkoutId: null,
          activeWorkoutData: null,
          activeWorkoutStartedAt: null,
          totalWorkouts: sql`${userStats.totalWorkouts} + 1`,
          totalVolume: sql`${userStats.totalVolume} + ${metrics.totalVolume}`,
          totalSets: sql`${userStats.totalSets} + ${metrics.totalSets}`,
          totalExercises: sql`${userStats.totalExercises} + ${metrics.totalExercises}`,
          totalTrainingHours: sql`${userStats.totalTrainingHours} + ${sessionDuration ? sessionDuration / 3600 : 0}`,
          lastWorkoutAt: completionTime,
        })
        .where(eq(userStats.userId, userId));

      // Upsert monthly stats
      const currentYear = completionTime.getFullYear();
      const currentMonth = completionTime.getMonth() + 1;
      await tx
        .insert(monthlyStats)
        .values({
          userId,
          year: currentYear,
          month: currentMonth,
          workoutsCount: 1,
          volume: metrics.totalVolume,
          trainingHours: sessionDuration ? sessionDuration / 3600 : 0,
        })
        .onConflictDoUpdate({
          target: [monthlyStats.userId, monthlyStats.year, monthlyStats.month],
          set: {
            workoutsCount: sql`${monthlyStats.workoutsCount} + 1`,
            volume: sql`${monthlyStats.volume} + ${metrics.totalVolume}`,
            trainingHours: sql`${monthlyStats.trainingHours} + ${sessionDuration ? sessionDuration / 3600 : 0}`,
          },
        });

      // Update PRs if any
      if (metrics.personalRecords && metrics.personalRecords.length > 0) {
        const [currentStats] = await tx
          .select({ personalRecords: userStats.personalRecords })
          .from(userStats)
          .where(eq(userStats.userId, userId));

        const currentPRs = (currentStats?.personalRecords as any) || {};

        for (const pr of metrics.personalRecords) {
          const exerciseKey = (pr as any).exercise || (pr as any).exerciseKey;
          if (!currentPRs[exerciseKey]) currentPRs[exerciseKey] = {};

          if ((pr as any).type === 'weight') {
            currentPRs[exerciseKey].maxWeight = (pr as any).value;
            currentPRs[exerciseKey].maxWeightDate = completionTime.toISOString();
          } else if ((pr as any).type === 'volume') {
            currentPRs[exerciseKey].maxVolume = (pr as any).value;
            currentPRs[exerciseKey].maxVolumeDate = completionTime.toISOString();
          }
        }

        await tx
          .update(userStats)
          .set({ personalRecords: currentPRs })
          .where(eq(userStats.userId, userId));
      }

      return createdSession;
    });

    try {
      await Promise.all([
        updateUserAchievements(userId),
        updateUniqueExercisesCount(userId),
      ]);
    } catch (achievementError) {
      console.error('Error updating achievements:', achievementError);
    }

    return successResponse({ session, message: 'Workout completed successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to complete active session: ${errorMessage}`, 500);
  }
}
