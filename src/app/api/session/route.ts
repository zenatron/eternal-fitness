import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions, userStats } from '@/lib/db/schema';
import { eq, and, isNotNull, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  createWorkoutSession,
  calculateSessionMetrics,
} from '@/utils/workoutJsonUtils';
import { ExercisePerformance, WorkoutTemplateData } from '@/types/workout';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [session]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

const legacySessionSchema = z.object({
  templateId: z.string(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  performance: z.array(z.any()).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = legacySessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid session data', 400, validationResult.error.errors);
    }

    const { templateId, scheduledAt, duration, notes, performance } = validationResult.data;
    const isScheduling = !!scheduledAt;

    const [template] = await db
      .select()
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

    if (!template) {
      return errorResponse('Template not found or not owned by user', 404, { templateId });
    }

    const templateData = template.workoutData as WorkoutTemplateData;

    if (isScheduling) {
      const [newSession] = await db
        .insert(workoutSessions)
        .values({
          userId,
          workoutTemplateId: templateId,
          scheduledAt: new Date(scheduledAt!),
          notes,
          performanceData: {
            templateSnapshot: templateData,
            performance: {},
            environment: {},
            metrics: {
              totalVolume: 0, totalSets: 0, totalExercises: 0,
              completedSets: 0, skippedSets: 0,
              personalRecords: [], volumeRecords: [], adherenceScore: 0,
            },
          },
          totalVolume: 0,
          totalSets: 0,
          totalExercises: 0,
        })
        .returning();

      return successResponse(newSession, 201);
    } else {
      const jsonPerformance: Record<string, ExercisePerformance> = {};
      if (performance && Array.isArray(performance)) {
        performance.forEach((item, index) => {
          const exerciseKey = `exercise-${index + 1}`;
          jsonPerformance[exerciseKey] = {
            exerciseKey,
            sets: item.sets || [],
            exerciseNotes: item.notes || '',
            totalVolume: 0,
            performanceRating: 3,
          };
        });
      }

      const sessionData = createWorkoutSession(templateData, jsonPerformance);
      const metrics = calculateSessionMetrics(jsonPerformance);

      const newSession = await db.transaction(async (tx) => {
        const [session] = await tx
          .insert(workoutSessions)
          .values({
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
          })
          .returning();

        try {
          await processWorkoutSessionPRs(userId, session.id, jsonPerformance, templateData);
        } catch (error) {
          console.error('Error processing PRs:', error);
        }

        return session;
      });

      return successResponse(newSession, 201);
    }
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const sessions = await db.query.workoutSessions.findMany({
      where: and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)),
      orderBy: desc(workoutSessions.completedAt),
      with: {
        workoutTemplate: {
          columns: { id: true, name: true },
        },
      },
    });

    return successResponse(sessions);
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}
