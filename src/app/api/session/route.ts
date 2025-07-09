import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
  createWorkoutSession,
  calculateSessionMetrics
} from '@/utils/workoutJsonUtils';
import {
  ExercisePerformance,
  WorkoutTemplateData
} from '@/types/workout';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [session]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

// Schema for backward compatibility with old API format
const legacySessionSchema = z.object({
  templateId: z.string().cuid(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  performance: z.array(z.any()).optional(), // Legacy array format
});

// POST function: Create a new session (updated to use JSON system)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const validationResult = legacySessionSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse('Invalid session data', 400, validationResult.error.errors);
    }

    const { templateId, scheduledAt, duration, notes, performance } = validationResult.data;
    const isScheduling = !!scheduledAt;

    // Get the template
    const template = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      return errorResponse('Template not found or not owned by user', 404, { templateId });
    }

    const templateData = (template as any).workoutData as WorkoutTemplateData;

    if (isScheduling) {
      // Create scheduled session
      const newSession = await prisma.workoutSession.create({
        data: {
          userId,
          workoutTemplateId: templateId,
          scheduledAt: new Date(scheduledAt),
          notes,
          performanceData: {
            templateSnapshot: templateData,
            performance: {},
            environment: {},
            metrics: {
              totalVolume: 0,
              totalSets: 0,
              totalExercises: 0,

              personalRecords: [],
              volumeRecords: []
            }
          },
          totalVolume: 0,
          totalSets: 0,
          totalExercises: 0,
        } as any,
        include: {
          workoutTemplate: { select: { name: true } },
        },
      });

      return successResponse(newSession, 201);
    } else {
      // Convert legacy performance format to JSON format if provided
      const jsonPerformance: Record<string, ExercisePerformance> = {};

      if (performance && Array.isArray(performance)) {
        // Convert legacy array format to new object format
        performance.forEach((item, index) => {
          const exerciseKey = `exercise-${index + 1}`;
          jsonPerformance[exerciseKey] = {
            exerciseKey: exerciseKey,
            sets: item.sets || [],
            exerciseNotes: item.notes || '',
            totalVolume: 0,
            performanceRating: 3
          };
        });
      }

      // Create completed session using JSON system
      const sessionData = createWorkoutSession(templateData, jsonPerformance);
      const metrics = calculateSessionMetrics(jsonPerformance);

      const newSession = await prisma.workoutSession.create({
        data: {
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
        } as any,
        include: {
          workoutTemplate: { select: { name: true } },
        },
      });

      return successResponse(newSession, 201);
    }
  } catch (error) {
    console.error('Error in POST /api/session:', error);
    return errorResponse('Internal Server Error', 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// GET function: Fetch completed sessions (updated to use JSON system)
export async function GET() {
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
      include: {
        workoutTemplate: {
          select: { id: true, name: true },
        },
      },
    });

    return successResponse(sessions);
  } catch (error) {
    console.error('Error in GET /api/session:', error);
    return errorResponse('Internal Server Error', 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}