import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
  createWorkoutSession,
  calculateSessionMetrics,
  calculateExerciseVolume,
  detectPersonalRecords,
  validateWorkoutSession
} from '@/utils/workoutJsonUtils';
import {
  WorkoutSessionData,
  ExercisePerformance,
  PerformedSet,
  WorkoutTemplateData
} from '@/types/workout';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [session-json/]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

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
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const validationResult = postSessionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return errorResponse('Invalid session data', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    // Check if this is completing a scheduled session
    if ('scheduledSessionId' in validatedData) {
      return await completeScheduledSession(userId, validatedData);
    } else {
      return await createNewSession(userId, validatedData);
    }
  } catch (error) {
    console.error('Error in POST /api/session-json:', error);
    return errorResponse('Internal Server Error', 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

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
    return errorResponse('Template not found or not owned by user', 404, { templateId });
  }

  const templateData = template.workoutData as WorkoutTemplateData;

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
    return successResponse(newSession, 201);
  } else {
    // Create immediate completed session
    if (!performance) {
      return errorResponse('Performance data required for completed session', 400);
    }

    const sessionData = createWorkoutSession(templateData, performance);
    
    if (!validateWorkoutSession(sessionData)) {
      return errorResponse('Invalid workout session structure', 500);
    }

    const completionTime = new Date();

    const [newSession] = await prisma.$transaction(async (tx) => {
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
    return successResponse(newSession, 201);
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
    return errorResponse('Scheduled session not found or already completed', 404, { scheduledSessionId });
  }

  const templateData = scheduledSession.workoutTemplate.workoutData as WorkoutTemplateData;
  const sessionData = createWorkoutSession(templateData, performance);
  
  if (!validateWorkoutSession(sessionData)) {
    return errorResponse('Invalid workout session structure', 500);
  }

  // Add environment data if provided
  if (environment) {
    sessionData.environment = environment;
  }

  const completionTime = new Date();

  const [updatedSession] = await prisma.$transaction(async (tx) => {
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

  console.log(`✅ Completed scheduled JSON session: ${updatedSession.id}`);
  return successResponse(updatedSession);
}

// 🚀 GET - Fetch JSON-based Sessions
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

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
    return successResponse(sessions);
  } catch (error) {
    console.error('Error in GET /api/session-json:', error);
    return errorResponse('Internal Server Error', 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
