import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { userStats, workoutTemplates } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  ActiveWorkoutSessionData,
  WorkoutTemplateData,
} from '@/types/workout';
import { z } from 'zod';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}):`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

const startSessionSchema = z.object({
  templateId: z.string(),
  templateName: z.string(),
  template: z.any(),
});

const updateSessionSchema = z.object({
  performance: z.record(z.any()).optional(),
  modifiedTemplate: z.any().optional(),
  exerciseProgress: z.record(z.any()).optional(),
  sessionNotes: z.string().optional(),
  pausedTime: z.number().optional(),
  isTimerActive: z.boolean().optional(),
  lastPauseTime: z.string().optional(),
  version: z.number().optional(),
});

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const [stats] = await db
      .select({
        activeWorkoutId: userStats.activeWorkoutId,
        activeWorkoutData: userStats.activeWorkoutData,
        activeWorkoutStartedAt: userStats.activeWorkoutStartedAt,
      })
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (!stats?.activeWorkoutId || !stats.activeWorkoutData) {
      return successResponse({ activeSession: null });
    }

    const activeSessionData = stats.activeWorkoutData as ActiveWorkoutSessionData;

    return successResponse({
      activeSession: {
        ...activeSessionData,
        startedAt: stats.activeWorkoutStartedAt,
      },
    });
  } catch (error) {
    return errorResponse('Failed to fetch active session', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = startSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid session data', 400, validationResult.error.errors);
    }

    const { templateId, templateName, template } = validationResult.data;

    const [existingStats] = await db
      .select({
        activeWorkoutId: userStats.activeWorkoutId,
        activeWorkoutStartedAt: userStats.activeWorkoutStartedAt,
      })
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (existingStats?.activeWorkoutId) {
      return errorResponse('User already has an active workout session', 409, {
        activeWorkoutId: existingStats.activeWorkoutId,
        startedAt: existingStats.activeWorkoutStartedAt,
      });
    }

    const [workoutTemplate] = await db
      .select({ id: workoutTemplates.id })
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

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

    await db
      .insert(userStats)
      .values({
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
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          activeWorkoutId: templateId,
          activeWorkoutData: activeSessionData,
          activeWorkoutStartedAt: now,
        },
      });

    return successResponse({
      activeSession: activeSessionData,
      message: 'Active workout session started successfully',
    });
  } catch (error) {
    return errorResponse('Failed to start active session', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = updateSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid update data', 400, validationResult.error.errors);
    }

    const updates = validationResult.data;

    const [stats] = await db
      .select({
        activeWorkoutId: userStats.activeWorkoutId,
        activeWorkoutData: userStats.activeWorkoutData,
        activeWorkoutStartedAt: userStats.activeWorkoutStartedAt,
      })
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (!stats?.activeWorkoutId || !stats.activeWorkoutData) {
      return errorResponse('No active workout session found', 404);
    }

    const currentSessionData = stats.activeWorkoutData as ActiveWorkoutSessionData;
    const now = new Date();

    if (updates.version && updates.version !== currentSessionData.version) {
      return errorResponse('Session data has been modified by another client', 409, {
        currentVersion: currentSessionData.version,
        providedVersion: updates.version,
      });
    }

    if (!currentSessionData.templateId || !currentSessionData.originalTemplate) {
      return errorResponse('Invalid session data structure', 400);
    }

    const updatedSessionData: ActiveWorkoutSessionData = {
      ...currentSessionData,
      ...updates,
      lastPauseTime: updates.lastPauseTime ? new Date(updates.lastPauseTime) : currentSessionData.lastPauseTime,
      version: currentSessionData.version + 1,
      lastUpdated: now,
    };

    await db
      .update(userStats)
      .set({ activeWorkoutData: updatedSessionData })
      .where(eq(userStats.userId, userId));

    return successResponse({
      activeSession: updatedSessionData,
      message: 'Active workout session updated successfully',
    });
  } catch (error) {
    return errorResponse('Failed to update active session', 500);
  }
}

export async function DELETE() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    await db
      .update(userStats)
      .set({
        activeWorkoutId: null,
        activeWorkoutData: null,
        activeWorkoutStartedAt: null,
      })
      .where(eq(userStats.userId, userId));

    return successResponse({ message: 'Active workout session ended successfully' });
  } catch (error) {
    return errorResponse('Failed to end active session', 500);
  }
}
