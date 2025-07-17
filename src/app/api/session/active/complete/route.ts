import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// Response helpers
const successResponse = (data: any, status = 200) => {
  return NextResponse.json(data, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(`API Error (${status}):`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status }
  );
};
import {
  ActiveWorkoutSessionData,
  WorkoutSessionData,
  SessionMetrics,
  ExercisePerformance
} from '@/types/workout';
import { calculateSessionMetrics, convertExerciseProgressToPerformance } from '@/utils/workoutJsonUtils';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const completeSessionSchema = z.object({
  duration: z.number().optional(),
  notes: z.string().optional(),
  completedAt: z.string().optional(), // ISO date string
});

// ============================================================================
// POST: Complete active workout session
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const validationResult = completeSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse('Invalid completion data', 400, validationResult.error.errors);
    }

    const { duration, notes, completedAt } = validationResult.data;

    const session = await prisma.$transaction(async (tx) => {
      // Get current active session
      const userStats = await tx.userStats.findUnique({
        where: { userId },
        select: {
          activeWorkoutId: true,
          activeWorkoutData: true,
          activeWorkoutStartedAt: true,
        },
      });

      if (!userStats?.activeWorkoutId || !userStats.activeWorkoutData) {
        throw new Error('No active workout session found');
      }

      const activeSessionData = userStats.activeWorkoutData as unknown as ActiveWorkoutSessionData;
      const completionTime = completedAt ? new Date(completedAt) : new Date();

      // Calculate session duration if not provided
      const sessionDuration = duration || (
        userStats.activeWorkoutStartedAt
          ? Math.floor((completionTime.getTime() - userStats.activeWorkoutStartedAt.getTime() - activeSessionData.pausedTime) / 1000)
          : 0
      );

      // Use modified template if available, otherwise use original
      const finalTemplate = activeSessionData.modifiedTemplate || activeSessionData.originalTemplate;

      // Determine which performance data to use
      let performanceData = activeSessionData.performance;

      // If performance is empty but exerciseProgress has data, convert it
      if (Object.keys(performanceData).length === 0 && activeSessionData.exerciseProgress && Object.keys(activeSessionData.exerciseProgress).length > 0) {
        console.log('🔄 Converting exerciseProgress to performance format');
        console.log('🔍 ExerciseProgress data:', JSON.stringify(activeSessionData.exerciseProgress, null, 2));
        performanceData = convertExerciseProgressToPerformance(activeSessionData.exerciseProgress, finalTemplate);
        console.log('✅ Converted performance data:', JSON.stringify(performanceData, null, 2));
      }

      // Calculate session metrics
      console.log('🔍 Performance data structure:', JSON.stringify(performanceData, null, 2));
      console.log('🔍 Performance data keys:', Object.keys(performanceData));
      console.log('🔍 Performance data values:', Object.values(performanceData));

      const metrics = calculateSessionMetrics(performanceData);
      console.log('📊 Calculated metrics:', JSON.stringify(metrics, null, 2));

      // Create workout session data
      const sessionData: WorkoutSessionData = {
        templateSnapshot: finalTemplate,
        performance: performanceData, // Use the converted performance data
        metrics,
        environment: {
          // Add any environment data here if needed
        },
        timeline: [], // Could be populated with exercise timing data
      };

      // Create the completed workout session
      const session = await tx.workoutSession.create({
        data: {
          userId,
          workoutTemplateId: activeSessionData.templateId,
          completedAt: completionTime,
          duration: sessionDuration,
          notes: notes || activeSessionData.sessionNotes,
          performanceData: sessionData as any,
          totalVolume: metrics.totalVolume,
          totalSets: metrics.totalSets,
          totalExercises: metrics.totalExercises,
          personalRecords: metrics.personalRecords?.length || 0,
        },
        include: {
          workoutTemplate: {
            select: { name: true }
          }
        }
      });

      // Update user stats
      await tx.userStats.update({
        where: { userId },
        data: {
          // Clear active session
          activeWorkoutId: null,
          activeWorkoutData: null as any,
          activeWorkoutStartedAt: null,

          // Update workout stats
          totalWorkouts: { increment: 1 },
          totalVolume: { increment: metrics.totalVolume },
          totalSets: { increment: metrics.totalSets },
          totalExercises: { increment: metrics.totalExercises },
          totalTrainingHours: { increment: sessionDuration ? sessionDuration / 3600 : 0 },
          lastWorkoutAt: completionTime,
        },
      });

      // Update monthly stats
      const currentYear = completionTime.getFullYear();
      const currentMonth = completionTime.getMonth() + 1;

      await tx.monthlyStats.upsert({
        where: {
          userId_year_month: { userId, year: currentYear, month: currentMonth },
        },
        update: {
          workoutsCount: { increment: 1 },
          volume: { increment: metrics.totalVolume },
          trainingHours: { increment: sessionDuration ? sessionDuration / 3600 : 0 },
        },
        create: {
          userId,
          year: currentYear,
          month: currentMonth,
          workoutsCount: 1,
          volume: metrics.totalVolume,
          trainingHours: sessionDuration ? sessionDuration / 3600 : 0,
        },
      });

      // Update personal records if any were achieved
      if (metrics.personalRecords && metrics.personalRecords.length > 0) {
        const currentUserStats = await tx.userStats.findUnique({
          where: { userId },
          select: { personalRecords: true },
        });

        const currentPRs = (currentUserStats?.personalRecords as any) || {};

        // Update PRs with new records
        for (const pr of metrics.personalRecords) {
          const exerciseKey = (pr as any).exercise || (pr as any).exerciseKey;
          if (!currentPRs[exerciseKey]) {
            currentPRs[exerciseKey] = {};
          }

          if ((pr as any).type === 'weight') {
            currentPRs[exerciseKey].maxWeight = (pr as any).value;
            currentPRs[exerciseKey].maxWeightDate = completionTime.toISOString();
          } else if ((pr as any).type === 'volume') {
            currentPRs[exerciseKey].maxVolume = (pr as any).value;
            currentPRs[exerciseKey].maxVolumeDate = completionTime.toISOString();
          }
        }

        await tx.userStats.update({
          where: { userId },
          data: { personalRecords: currentPRs },
        });
      }

      return session;
    });

    // Update achievements and unique exercises count (outside transaction for better performance)
    try {
      await Promise.all([
        updateUserAchievements(userId),
        updateUniqueExercisesCount(userId),
      ]);
    } catch (achievementError) {
      console.error('Error updating achievements:', achievementError);
      // Don't fail the whole request if achievements fail
    }

    return successResponse({
      session,
      message: 'Workout completed successfully'
    });

  } catch (error) {
    console.error('Error completing active session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(`Failed to complete active session: ${errorMessage}`, 500);
  }
}
