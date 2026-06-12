import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { exercises as staticExercisesData } from '@/lib/exercises';
import {
  createWorkoutTemplate,
  validateWorkoutTemplate,
  calculateTemplateVolume,
  calculateEstimatedDuration,
} from '@/utils/workoutJsonUtils';
import { WorkoutType, Difficulty } from '@/types/workout';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [template/{id}]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

const updateSetSchema = z.object({
  reps: z.number().int().positive(),
  weight: z.number().nonnegative().optional(),
  duration: z.number().positive().optional(),
  type: z.enum(['standard', 'warmup', 'working', 'dropset', 'superset', 'amrap', 'emom', 'tabata', 'rest']).optional().default('standard'),
  restTime: z.number().positive().optional(),
  notes: z.string().optional(),
});

const updateExerciseSchema = z.object({
  exerciseKey: z.string().min(1, 'Exercise key is required'),
  sets: z.array(updateSetSchema).min(1, 'Each exercise must have at least one set'),
  instructions: z.string().optional(),
  restBetweenSets: z.number().positive().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1, { message: 'Template name is required' }),
  description: z.string().optional(),
  favorite: z.boolean().optional(),
  workoutType: z.enum(['strength', 'cardio', 'hybrid', 'flexibility', 'sports']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z.array(z.string()).optional(),
  exercises: z.array(updateExerciseSchema).min(1, { message: 'Template must have at least one exercise' }),
});

function getExerciseData(exerciseKey: string) {
  const staticData = staticExercisesData[exerciseKey as keyof typeof staticExercisesData];
  if (staticData) {
    return { name: staticData.name, muscles: staticData.muscles, equipment: staticData.equipment };
  }
  return { name: exerciseKey, muscles: [], equipment: [] };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { templateId } = await params;

    const [template] = await db
      .select()
      .from(workoutTemplates)
      .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

    if (!template) {
      return errorResponse('Template not found or access denied', 404, { templateId });
    }

    return successResponse(template);
  } catch (error) {
    const { templateId } = await params;
    return errorResponse('Internal Server Error', 500, { templateId, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { templateId } = await params;
    const body = await request.json();

    const validationResult = updateTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid template data', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    const exercisesWithStaticData = validatedData.exercises.map((ex) => {
      const exerciseData = getExerciseData(ex.exerciseKey);
      return {
        exerciseKey: ex.exerciseKey,
        name: exerciseData.name,
        muscles: exerciseData.muscles,
        equipment: exerciseData.equipment,
        sets: ex.sets,
        instructions: ex.instructions,
        restBetweenSets: ex.restBetweenSets,
      };
    });

    const workoutData = createWorkoutTemplate(validatedData.name, exercisesWithStaticData, {
      description: validatedData.description,
      tags: validatedData.tags,
      workoutType: validatedData.workoutType,
      difficulty: validatedData.difficulty,
    });

    if (!validateWorkoutTemplate(workoutData)) {
      return errorResponse('Invalid workout template structure', 400);
    }

    const totalVolume = calculateTemplateVolume(workoutData.exercises);
    const estimatedDuration = calculateEstimatedDuration(workoutData.exercises);
    const exerciseCount = workoutData.exercises.length;

    const [updatedTemplate] = await db
      .update(workoutTemplates)
      .set({
        name: validatedData.name,
        favorite: validatedData.favorite,
        workoutData,
        totalVolume,
        estimatedDuration,
        exerciseCount,
        difficulty: validatedData.difficulty || 'intermediate',
        workoutType: validatedData.workoutType || 'strength',
      })
      .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)))
      .returning();

    if (!updatedTemplate) {
      return errorResponse('Template not found or access denied', 404, { templateId });
    }

    return successResponse(updatedTemplate);
  } catch (error) {
    const { templateId } = await params;
    return errorResponse('Internal Server Error updating template', 500, { templateId, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { templateId } = await params;

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: workoutTemplates.id })
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

      if (!existing) throw new Error('TemplateNotFound');

      await tx.delete(workoutSessions).where(and(eq(workoutSessions.workoutTemplateId, templateId), eq(workoutSessions.userId, userId)));
      await tx.delete(workoutTemplates).where(eq(workoutTemplates.id, templateId));
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    const { templateId } = await params;
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, { templateId });
    }
    return errorResponse('Internal Server Error deleting template', 500, { templateId, error: error instanceof Error ? error.message : String(error) });
  }
}
