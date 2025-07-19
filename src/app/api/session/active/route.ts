import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, createValidatedApiHandler } from '@/lib/api-utils';
import { 
  ActiveWorkoutSessionData, 
  ActiveSessionUpdatePayload,
  WorkoutTemplateData 
} from '@/types/workout';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const startSessionSchema = z.object({
  templateId: z.string(),
  templateName: z.string(),
  template: z.any(), // WorkoutTemplateData - will validate structure separately
});

const updateSessionSchema = z.object({
  performance: z.record(z.any()).optional(),
  modifiedTemplate: z.any().optional(), // WorkoutTemplateData
  exerciseProgress: z.record(z.any()).optional(),
  sessionNotes: z.string().optional(),
  pausedTime: z.number().optional(),
  isTimerActive: z.boolean().optional(),
  lastPauseTime: z.string().optional(), // ISO date string
  version: z.number().optional(), // For optimistic locking
});

// ============================================================================
// GET: Retrieve active workout session
// ============================================================================

export const GET = createApiHandler(async (userId) => {
  const userStats = await prisma.userStats.findUnique({
    where: { userId },
    select: {
      activeWorkoutId: true,
      activeWorkoutData: true,
      activeWorkoutStartedAt: true,
    },
  });

  if (!userStats?.activeWorkoutId || !userStats.activeWorkoutData) {
    return {
      data: { activeSession: null },
      message: 'No active workout session found'
    };
  }

  const activeSessionData = userStats.activeWorkoutData as unknown as ActiveWorkoutSessionData;

  return {
    data: {
      activeSession: {
        ...activeSessionData,
        startedAt: userStats.activeWorkoutStartedAt,
      }
    },
    message: 'Active workout session retrieved successfully'
  };
});

// ============================================================================
// POST: Start a new active workout session
// ============================================================================

export const POST = createValidatedApiHandler(
  startSessionSchema,
  async (userId, { templateId, templateName, template }) => {

    // Check if user already has an active session
    const existingUserStats = await prisma.userStats.findUnique({
      where: { userId },
      select: {
        activeWorkoutId: true,
        activeWorkoutData: true,
        activeWorkoutStartedAt: true,
      },
    });

    if (existingUserStats?.activeWorkoutId) {
      throw new Error('User already has an active workout session');
    }

    // Verify the template exists and belongs to the user
    const workoutTemplate = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!workoutTemplate) {
      throw new Error('Template not found or not owned by user');
    }

    const now = new Date();
    const activeSessionData: ActiveWorkoutSessionData = {
      templateId,
      templateName,
      originalTemplate: template as WorkoutTemplateData,
      startedAt: now,
      pausedTime: 0,
      isTimerActive: true,
      performance: {},
      exerciseProgress: {},
      sessionNotes: '',
      version: 1,
      lastUpdated: now,
    };

    // Update UserStats with active session data
    const updatedUserStats = await prisma.userStats.upsert({
      where: { userId },
      update: {
        activeWorkoutId: templateId,
        activeWorkoutData: activeSessionData as any,
        activeWorkoutStartedAt: now,
      },
      create: {
        userId,
        activeWorkoutId: templateId,
        activeWorkoutData: activeSessionData as any,
        activeWorkoutStartedAt: now,
        totalWorkouts: 0,
        totalSets: 0,
        totalExercises: 0,
        totalVolume: 0,
        totalTrainingHours: 0,
        currentStreak: 0,
        longestStreak: 0,
        activeWeeks: 0,
        uniqueExercises: 0,
      },
    });

    return {
      data: { activeSession: activeSessionData },
      message: 'Active workout session started successfully'
    };
  }
);

// ============================================================================
// PATCH: Update active workout session
// ============================================================================

export const PATCH = createValidatedApiHandler(
  updateSessionSchema,
  async (userId, updateData) => {
    // Get current active session
    const userStats = await prisma.userStats.findUnique({
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

    const currentSessionData = userStats.activeWorkoutData as unknown as ActiveWorkoutSessionData;
    const now = new Date();

    // Check for version conflicts (optimistic locking)
    if (updateData.version && updateData.version !== currentSessionData.version) {
      throw new Error('Session data has been modified by another client');
    }

    // Validate session data integrity
    if (!currentSessionData.templateId || !currentSessionData.originalTemplate) {
      throw new Error('Invalid session data structure');
    }

    // Merge updates with current session data
    const updatedSessionData: ActiveWorkoutSessionData = {
      ...currentSessionData,
      ...updateData,
      lastPauseTime: updateData.lastPauseTime ? new Date(updateData.lastPauseTime) : currentSessionData.lastPauseTime,
      version: currentSessionData.version + 1,
      lastUpdated: now,
    };

    // Update UserStats with new session data
    await prisma.userStats.update({
      where: { userId },
      data: {
        activeWorkoutData: updatedSessionData as any,
      },
    });

    return {
      data: { activeSession: updatedSessionData },
      message: 'Active workout session updated successfully'
    };
  }
);

// ============================================================================
// DELETE: End active workout session
// ============================================================================

export const DELETE = createApiHandler(async (userId) => {
  // Clear active session data
  await prisma.userStats.update({
    where: { userId },
    data: {
      activeWorkoutId: null,
      activeWorkoutData: null as any,
      activeWorkoutStartedAt: null,
    },
  });

  return {
    data: { activeSession: null },
    message: 'Active workout session ended successfully'
  };
});
