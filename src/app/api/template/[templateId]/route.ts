import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { exercises as staticExercisesData } from '@/lib/exercises';
import {
  createWorkoutTemplate,
  validateWorkoutTemplate,
  calculateTemplateVolume,
  calculateEstimatedDuration,
} from '@/utils/workoutJsonUtils';

import { errorResponse, successResponse } from '@/lib/api/response';

const updateSetSchema = z.object({
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative().max(100000).optional(),
  duration: z.number().positive().max(86400).optional(),
  distance: z.number().positive().max(1000000).optional(),
  type: z.enum(['standard', 'warmup', 'working', 'dropset', 'superset', 'amrap', 'emom', 'tabata', 'rest']).optional().default('standard'),
  // nonnegative, not positive: cardio sets rest 0s by design (the builder
  // sends 0 for every cardio set), and rejecting that made any template
  // containing a cardio exercise impossible to save.
  restTime: z.number().nonnegative().max(3600).optional(),
  notes: z.string().max(2000).optional(),
});

const updateExerciseSchema = z.object({
  exerciseKey: z.string().min(1, 'Exercise key is required'),
  sets: z.array(updateSetSchema).min(1, 'Each exercise must have at least one set'),
  instructions: z.string().max(5000).optional(),
  restBetweenSets: z.number().nonnegative().max(3600).optional(),
  /** Weight is per limb; volume counts it twice. See lib/volume.ts. */
  perSide: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1, { message: 'Template name is required' }).max(120),
  description: z.string().max(5000).optional(),
  favorite: z.boolean().optional(),
  workoutType: z.enum(['strength', 'cardio', 'hybrid', 'flexibility', 'sports']).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  exercises: z.array(updateExerciseSchema).min(1, { message: 'Template must have at least one exercise' }),
});

function getExerciseData(exerciseKey: string) {
  const staticData = staticExercisesData[exerciseKey as keyof typeof staticExercisesData];
  if (staticData) {
    return {
      name: staticData.name,
      muscles: staticData.muscles,
      equipment: staticData.equipment,
      perSide: staticData.perSide,
    };
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
        perSide: ex.perSide ?? exerciseData.perSide,
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
        // description/tags live in columns the list view reads; dropping them
        // here left a template whose card described an older version of
        // itself after any edit.
        description: validatedData.description ?? null,
        tags: validatedData.tags ?? [],
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

    /*
     * Deleting a template keeps the workouts done with it. It used to delete
     * that history too — a user tidying up an old routine lost months of
     * logged sessions, and the PRs set in them were left pointing at rows that
     * no longer existed. Every session carries its own template snapshot, so
     * history renders without the template; the link is simply cleared.
     *
     * Only *unfinished* scheduled sessions go with the template: they are plans
     * for a workout that no longer exists.
     */
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: workoutTemplates.id })
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

      if (!existing) throw new Error('TemplateNotFound');

      await tx
        .delete(workoutSessions)
        .where(and(
          eq(workoutSessions.workoutTemplateId, templateId),
          eq(workoutSessions.userId, userId),
          isNull(workoutSessions.completedAt),
        ));
      await tx
        .update(workoutSessions)
        .set({ workoutTemplateId: null })
        .where(and(eq(workoutSessions.workoutTemplateId, templateId), eq(workoutSessions.userId, userId)));
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
