import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createApiHandler, createValidatedApiHandler } from '@/lib/api-utils';
import {
  createWorkoutSession,
  calculateSessionMetrics,
  calculateExerciseVolume,
  detectPersonalRecords,
  validateWorkoutSession,
  convertExerciseProgressToPerformance
} from '@/utils/workoutJsonUtils';
import {
  WorkoutSessionData,
  ExercisePerformance,
  PerformedSet,
  WorkoutTemplateData
} from '@/types/workout';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';

// 🚀 JSON-BASED SESSION SCHEMAS
const performedSetSchema = z.object({
  setId: z.string(),
  actualReps: z.number().int().nonnegative().optional(),
  actualWeight: z.number().nonnegative().optional(),
  actualDuration: z.number().positive().optional(),
  actualDistance: z.number().positive().optional(),
  actualRpe: z.number().min(1).max(10).optional(),
  restTime: z.number().nonnegative().optional(),
  completed: z.boolean(),
  skipped: z.boolean().optional(),
  notes: z.string().optional(),
  failurePoint: z.enum(['form', 'strength', 'endurance', 'time']).optional(),
  assistanceUsed: z.boolean().optional(),
  technique: z.enum(['good', 'fair', 'poor']).optional(),
});

const exercisePerformanceSchema = z.object({
  exerciseKey: z.string(),
  sets: z.array(performedSetSchema),
  exerciseNotes: z.string().optional(),
  performanceRating: z.number().min(1).max(5).optional(),
  difficultyRating: z.number().min(1).max(5).optional(),
});

const environmentDataSchema = z.object({
  location: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  weather: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  crowdLevel: z.enum(['empty', 'light', 'moderate', 'busy', 'packed']).optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  sleepQuality: z.number().min(1).max(10).optional(),
  stressLevel: z.number().min(1).max(10).optional(),
  nutrition: z.object({
    preWorkoutMeal: z.string().optional(),
    hydration: z.number().optional(),
    supplements: z.array(z.string()).optional(),
  }).optional(),
});

const createSessionSchema = z.object({
  templateId: z.string().cuid(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  performance: z.record(z.string(), exercisePerformanceSchema).optional(),
  environment: environmentDataSchema.optional(),
});

const completeScheduledSessionSchema = z.object({
  scheduledSessionId: z.string().cuid(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  performance: z.record(z.string(), exercisePerformanceSchema),
  environment: environmentDataSchema.optional(),
});

const postSessionSchema = z.union([
  createSessionSchema,
  completeScheduledSessionSchema,
]);

// 🚀 POST - Create or Complete JSON-based Session
export const POST = createValidatedApiHandler(
  postSessionSchema,
  async (userId, validatedData) => {
    // Check if this is completing a scheduled session
    if ('scheduledSessionId' in validatedData) {
      return await completeScheduledSession(userId, validatedData);
    } else {
      return await createNewSession(userId, validatedData);
    }
  }
);

// 🎯 CREATE NEW SESSION (immediate or scheduled)
async function createNewSession(userId: string, data: z.infer<typeof createSessionSchema>) {
  const { templateId, scheduledAt, duration, notes, performance, environment } = data;
  const isScheduling = !!scheduledAt;

  // Get the template
  const template = await prisma.workoutTemplate.findFirst({
    where: { id: templateId, userId },
    select: { 
      id: true, 
      name: true, 
      workoutData: true,
      totalVolume: true,
      estimatedDuration: true,
    },
  });

  if (!template) {
    throw new Error('Template not found or not owned by user');
  }

  const templateData = template.workoutData as unknown as WorkoutTemplateData;

  if (isScheduling) {
    // Just create the scheduled session
    const newSession = await prisma.workoutSession.create({
      data: {
        userId,
        workoutTemplateId: templateId,
        notes,
        duration,
        totalVolume: 0,
        totalSets: 0,
        totalExercises: 0,
        personalRecords: 0,
        scheduledAt: new Date(scheduledAt!),
        completedAt: null,
        performanceData: {
          templateSnapshot: templateData,
          performance: {},
          metrics: {
            totalVolume: 0,
            totalSets: 0,
            totalExercises: 0,
            completedSets: 0,
            skippedSets: 0,
            personalRecords: [],
            volumeRecords: [],
            adherenceScore: 0,
          },
          environment,
        } as any,
      },
      include: { workoutTemplate: { select: { name: true } } },
    });

    console.log(`✅ Created scheduled JSON session: ${newSession.id}`);
    return newSession;
  } else {
    // Create immediate completed session
    if (!performance) {
      throw new Error('Performance data required for completed session');
    }

    // Convert performance data to the expected format
    const convertedPerformance = convertExerciseProgressToPerformance(performance, templateData);
    const sessionData = createWorkoutSession(templateData, convertedPerformance);
    
    if (!validateWorkoutSession(sessionData)) {
      throw new Error('Invalid workout session structure');
    }

    const completionTime = new Date();

    const newSession = await prisma.$transaction(async (tx) => {
      // Create the session
      const session = await tx.workoutSession.create({
        data: {
          userId,
          workoutTemplateId: templateId,
          notes,
          duration,
          totalVolume: sessionData.metrics.totalVolume,
          totalSets: sessionData.metrics.totalSets,
          totalExercises: sessionData.metrics.totalExercises,
          personalRecords: sessionData.metrics.personalRecords.length,
          scheduledAt: null,
          completedAt: completionTime,
          performanceData: sessionData as any,
        },
        include: { workoutTemplate: { select: { name: true } } },
      });

      // Process personal records
      try {
        const prResults = await processWorkoutSessionPRs(
          userId,
          session.id,
          performance,
          templateData
        );
        console.log(`✅ Processed ${prResults.newPRs.length} new PRs for session ${session.id}`);
      } catch (error) {
        console.error('Error processing PRs:', error);
        // Don't fail the session creation if PR processing fails
      }

      // Update user stats
      const userStats = await tx.userStats.upsert({
        where: { userId },
        update: {
          totalWorkouts: { increment: 1 },
          totalVolume: { increment: sessionData.metrics.totalVolume },
          totalSets: { increment: sessionData.metrics.totalSets },
          totalExercises: { increment: sessionData.metrics.totalExercises },
          totalTrainingHours: { increment: duration ? duration / 60 : 0 },
          lastWorkoutAt: completionTime,
        },
        create: {
          userId,
          totalWorkouts: 1,
          totalVolume: sessionData.metrics.totalVolume,
          totalSets: sessionData.metrics.totalSets,
          totalExercises: sessionData.metrics.totalExercises,
          totalTrainingHours: duration ? duration / 60 : 0,
          lastWorkoutAt: completionTime,
          currentStreak: 1,
          longestStreak: 1,
        },
      });

      return session;
    });

    console.log(`✅ Created completed JSON session: ${newSession.id}`);
    return newSession;
  }
}

// 🎯 COMPLETE SCHEDULED SESSION
async function completeScheduledSession(userId: string, data: z.infer<typeof completeScheduledSessionSchema>) {
  const { scheduledSessionId, duration, notes, performance, environment } = data;

  // Get the scheduled session
  const scheduledSession = await prisma.workoutSession.findFirst({
    where: {
      id: scheduledSessionId,
      userId,
      completedAt: null, // Must be uncompleted
    },
    include: {
      workoutTemplate: {
        select: { workoutData: true, name: true },
      },
    },
  });

  if (!scheduledSession) {
    throw new Error('Scheduled session not found or already completed');
  }

  const templateData = scheduledSession.workoutTemplate.workoutData as unknown as WorkoutTemplateData;
  const convertedPerformance = convertExerciseProgressToPerformance(performance, templateData);
  const sessionData = createWorkoutSession(templateData, convertedPerformance);

  if (!validateWorkoutSession(sessionData)) {
    throw new Error('Invalid workout session structure');
  }

  // Add environment data if provided
  if (environment) {
    sessionData.environment = environment;
  }

  const completionTime = new Date();

  const updatedSession = await prisma.$transaction(async (tx) => {
    // Update the session
    const session = await tx.workoutSession.update({
      where: { id: scheduledSessionId },
      data: {
        completedAt: completionTime,
        duration,
        notes,
        totalVolume: sessionData.metrics.totalVolume,
        totalSets: sessionData.metrics.totalSets,
        totalExercises: sessionData.metrics.totalExercises,
        personalRecords: sessionData.metrics.personalRecords.length,
        performanceData: sessionData as any,
      },
      include: { workoutTemplate: { select: { name: true } } },
    });

    // Process personal records
    try {
      const prResults = await processWorkoutSessionPRs(
        userId,
        session.id,
        performance,
        templateData
      );
      console.log(`✅ Processed ${prResults.newPRs.length} new PRs for scheduled session ${session.id}`);
    } catch (error) {
      console.error('Error processing PRs:', error);
      // Don't fail the session completion if PR processing fails
    }

    // Calculate current streak
    const currentUserStats = await tx.userStats.findUnique({
      where: { userId },
      select: { lastWorkoutAt: true, currentStreak: true, longestStreak: true }
    });

    let newStreak = 1;
    let newLongestStreak = 1;

    if (currentUserStats) {
      newLongestStreak = currentUserStats.longestStreak || 1;

      if (currentUserStats.lastWorkoutAt) {
        const lastWorkoutDate = new Date(currentUserStats.lastWorkoutAt);
        const completionDate = new Date(completionTime);

        // Set both dates to start of day for comparison
        lastWorkoutDate.setHours(0, 0, 0, 0);
        completionDate.setHours(0, 0, 0, 0);

        const daysDifference = Math.floor((completionDate.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDifference === 0) {
          // Same day - maintain current streak
          newStreak = currentUserStats.currentStreak || 1;
        } else if (daysDifference === 1) {
          // Consecutive day - increment streak
          newStreak = (currentUserStats.currentStreak || 0) + 1;
        } else {
          // Gap in workouts - reset streak
          newStreak = 1;
        }
      }

      // Update longest streak if current streak is higher
      if (newStreak > newLongestStreak) {
        newLongestStreak = newStreak;
      }
    }

    // Update user stats
    const userStats = await tx.userStats.upsert({
      where: { userId },
      update: {
        totalWorkouts: { increment: 1 },
        totalVolume: { increment: sessionData.metrics.totalVolume },
        totalSets: { increment: sessionData.metrics.totalSets },
        totalExercises: { increment: sessionData.metrics.totalExercises },
        totalTrainingHours: { increment: duration ? duration / 60 : 0 },
        lastWorkoutAt: completionTime,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
      },
      create: {
        userId,
        totalWorkouts: 1,
        totalVolume: sessionData.metrics.totalVolume,
        totalSets: sessionData.metrics.totalSets,
        totalExercises: sessionData.metrics.totalExercises,
        totalTrainingHours: duration ? duration / 60 : 0,
        lastWorkoutAt: completionTime,
        currentStreak: 1,
        longestStreak: 1,
      },
    });

    return session;
  });

  console.log(`✅ Completed scheduled JSON session: ${updatedSession.id}`);
  return updatedSession;
}

// 🚀 GET - Fetch JSON-based Sessions
export const GET = createApiHandler(async (userId) => {
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      completedAt: { not: null },
    },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      completedAt: true,
      scheduledAt: true,
      duration: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      performanceData: true,
      totalVolume: true,
      totalSets: true,
      totalExercises: true,
      personalRecords: true,
      workoutTemplate: {
        select: { id: true, name: true },
      },
    },
  });

  console.log(`✅ Fetched ${sessions.length} JSON-based sessions for user ${userId}`);
  return sessions;
});
