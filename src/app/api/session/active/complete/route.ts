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
import { processWorkoutSessionPRs } from '@/utils/personalRecords';
import { awardWorkoutXP } from '@/lib/xp';
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

      // Calculate streak
      let newStreak = 1;
      let newLongestStreak = 1;

      // Fetch current streak values
      const [streakData] = await tx
        .select({
          currentStreak: userStats.currentStreak,
          longestStreak: userStats.longestStreak,
          lastWorkoutAt: userStats.lastWorkoutAt,
        })
        .from(userStats)
        .where(eq(userStats.userId, userId));

      if (streakData) {
        const lastWorkoutDate = streakData.lastWorkoutAt;
        if (lastWorkoutDate) {
          const lastDate = new Date(lastWorkoutDate);
          const today = new Date(completionTime);
          // Compare calendar dates (strip time)
          lastDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            newStreak = Math.max(1, streakData.currentStreak);
          } else if (diffDays === 1) {
            // Consecutive day - increment streak
            newStreak = streakData.currentStreak + 1;
          }
          // else diffDays > 1, streak resets to 1
        }
        newLongestStreak = Math.max(streakData.longestStreak, newStreak);
      }

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
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
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

    return successResponse({
      session,
      message: 'Workout completed successfully',
      achievements: achievementResult,
      newPRs,
      workoutXP,
      totalAwarded,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to complete active session: ${errorMessage}`, 500);
  }
}
