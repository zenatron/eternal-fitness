import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// Response helpers
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
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

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const userStats = await prisma.userStats.findUnique({
      where: { userId },
      select: {
        activeWorkoutId: true,
        activeWorkoutData: true,
        activeWorkoutStartedAt: true,
      },
    });

    if (!userStats?.activeWorkoutId || !userStats.activeWorkoutData) {
      return successResponse({ activeSession: null });
    }

    const activeSessionData = userStats.activeWorkoutData as ActiveWorkoutSessionData;
    
    return successResponse({ 
      activeSession: {
        ...activeSessionData,
        startedAt: userStats.activeWorkoutStartedAt,
      }
    });
  } catch (error) {
    console.error('Error fetching active session:', error);
    return errorResponse('Failed to fetch active session', 500);
  }
}

// ============================================================================
// POST: Start a new active workout session
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const validationResult = startSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse('Invalid session data', 400, validationResult.error.errors);
    }

    const { templateId, templateName, template } = validationResult.data;

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
      return errorResponse('User already has an active workout session', 409, {
        activeWorkoutId: existingUserStats.activeWorkoutId,
        startedAt: existingUserStats.activeWorkoutStartedAt,
      });
    }

    // Verify the template exists and belongs to the user
    const workoutTemplate = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!workoutTemplate) {
      return errorResponse('Template not found or not owned by user', 404);
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
        activeWorkoutData: activeSessionData,
        activeWorkoutStartedAt: now,
      },
      create: {
        userId,
        activeWorkoutId: templateId,
        activeWorkoutData: activeSessionData,
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

    return successResponse({ 
      activeSession: activeSessionData,
      message: 'Active workout session started successfully'
    });
  } catch (error) {
    console.error('Error starting active session:', error);
    return errorResponse('Failed to start active session', 500);
  }
}

// ============================================================================
// PATCH: Update active workout session
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const validationResult = updateSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse('Invalid update data', 400, validationResult.error.errors);
    }

    const updates = validationResult.data;

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
      return errorResponse('No active workout session found', 404);
    }

    const currentSessionData = userStats.activeWorkoutData as ActiveWorkoutSessionData;
    const now = new Date();

    // Check for version conflicts (optimistic locking)
    if (updates.version && updates.version !== currentSessionData.version) {
      return errorResponse('Session data has been modified by another client', 409, {
        currentVersion: currentSessionData.version,
        providedVersion: updates.version,
      });
    }

    // Validate session data integrity
    if (!currentSessionData.templateId || !currentSessionData.originalTemplate) {
      return errorResponse('Invalid session data structure', 400);
    }

    // Merge updates with current session data
    const updatedSessionData: ActiveWorkoutSessionData = {
      ...currentSessionData,
      ...updates,
      lastPauseTime: updates.lastPauseTime ? new Date(updates.lastPauseTime) : currentSessionData.lastPauseTime,
      version: currentSessionData.version + 1,
      lastUpdated: now,
    };

    // Update UserStats with new session data
    await prisma.userStats.update({
      where: { userId },
      data: {
        activeWorkoutData: updatedSessionData,
      },
    });

    return successResponse({ 
      activeSession: updatedSessionData,
      message: 'Active workout session updated successfully'
    });
  } catch (error) {
    console.error('Error updating active session:', error);
    return errorResponse('Failed to update active session', 500);
  }
}

// ============================================================================
// DELETE: End active workout session
// ============================================================================

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Clear active session data
    await prisma.userStats.update({
      where: { userId },
      data: {
        activeWorkoutId: null,
        activeWorkoutData: null,
        activeWorkoutStartedAt: null,
      },
    });

    return successResponse({ 
      message: 'Active workout session ended successfully'
    });
  } catch (error) {
    console.error('Error ending active session:', error);
    return errorResponse('Failed to end active session', 500);
  }
}
