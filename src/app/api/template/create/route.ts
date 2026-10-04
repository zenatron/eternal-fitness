import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates } from '@/lib/db/schema';
import { z } from 'zod';
import { exercises as staticExercisesData } from '@/lib/exercises';
import {
  createWorkoutTemplate,
  validateWorkoutTemplate,
  calculateTemplateVolume,
  calculateEstimatedDuration,
} from '@/utils/workoutJsonUtils';
import { WorkoutType, Difficulty } from '@/types/workout';
import { errorResponse } from '@/lib/api/response';

const successResponse = (data: unknown, status = 201) => {
  return NextResponse.json({ data }, { status });
};

const createSetSchema = z.object({
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

const createExerciseSchema = z.object({
  exerciseKey: z.string().min(1, 'Exercise key is required'),
  sets: z.array(createSetSchema).min(1, 'Each exercise must have at least one set'),
  instructions: z.string().max(5000).optional(),
  restBetweenSets: z.number().nonnegative().max(3600).optional(),
  /** Weight is per limb; volume counts it twice. See lib/volume.ts. */
  perSide: z.boolean().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, { message: 'Template name is required' }).max(120),
  description: z.string().max(5000).optional(),
  favorite: z.boolean().optional().default(false),
  workoutType: z.enum(['strength', 'cardio', 'hybrid', 'flexibility', 'sports']).optional().default('strength'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  exercises: z.array(createExerciseSchema).min(1, { message: 'Template must have at least one exercise' }),
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

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = createTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid template data', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    const exercisesWithData = validatedData.exercises.map((ex) => {
      const exerciseData = getExerciseData(ex.exerciseKey);
      return {
        exerciseKey: ex.exerciseKey,
        name: exerciseData.name,
        muscles: exerciseData.muscles,
        equipment: exerciseData.equipment,
        perSide: ex.perSide ?? exerciseData.perSide,
        sets: ex.sets.map((set) => ({
          reps: set.reps,
          weight: set.weight,
          type: set.type,
          restTime: set.restTime,
          notes: set.notes,
        })),
        instructions: ex.instructions,
        restBetweenSets: ex.restBetweenSets,
      };
    });

    const workoutData = createWorkoutTemplate(validatedData.name, exercisesWithData, {
      description: validatedData.description,
      tags: validatedData.tags,
      workoutType: validatedData.workoutType as WorkoutType,
      difficulty: validatedData.difficulty as Difficulty,
    });

    if (!validateWorkoutTemplate(workoutData)) {
      return errorResponse('Invalid workout template structure', 500);
    }

    const totalVolume = calculateTemplateVolume(workoutData.exercises);
    const estimatedDuration = calculateEstimatedDuration(workoutData.exercises);
    const exerciseCount = workoutData.exercises.length;

    const [createdTemplate] = await db
      .insert(workoutTemplates)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        favorite: validatedData.favorite,
        userId,
        workoutData,
        totalVolume,
        estimatedDuration,
        exerciseCount,
        difficulty: validatedData.difficulty,
        workoutType: validatedData.workoutType,
        tags: validatedData.tags || [],
      })
      .returning();

    return successResponse(createdTemplate);
  } catch (error) {
    return errorResponse('Internal Server Error creating template', 500, error instanceof Error ? error.message : String(error));
  }
}
