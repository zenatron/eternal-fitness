import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { exercises as staticExercisesData } from '@/lib/exercises';
import {
  createWorkoutTemplate,
  validateWorkoutTemplate,
  calculateTemplateVolume,
  calculateEstimatedDuration,
  extractMuscleGroups,
  extractEquipment
} from '@/utils/workoutJsonUtils';
import {
  WorkoutTemplateData,
  WorkoutType,
  Difficulty,
  SetType
} from '@/types/workout';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 201) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [template/create]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

// 🚀 NEW JSON-BASED SCHEMA FOR TEMPLATE CREATION
const createSetSchema = z.object({
  // Strength training fields
  reps: z.number().int().positive().optional(),
  weight: z.number().nonnegative().optional(),

  // Cardio fields
  duration: z.number().positive().optional(), // seconds
  distance: z.number().positive().optional(), // meters
  calories: z.number().positive().optional(),
  heartRate: z.number().positive().optional(), // BPM
  pace: z.number().positive().optional(), // seconds per unit distance
  incline: z.number().nonnegative().optional(), // percentage
  resistance: z.number().positive().optional(), // level

  type: z.enum(['standard', 'warmup', 'working', 'dropset', 'superset', 'amrap', 'emom', 'tabata', 'rest', 'cardio_interval', 'cardio_steady', 'cardio_hiit']).optional().default('standard'),
  restTime: z.number().positive().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // Either reps (for strength) or duration/distance/calories (for cardio) must be provided
  const hasStrengthData = data.reps && data.reps > 0;
  const hasCardioData = data.duration || data.distance || data.calories;
  return hasStrengthData || hasCardioData;
}, {
  message: "Set must have either reps (for strength training) or duration/distance/calories (for cardio)"
});

const createExerciseSchema = z.object({
  exerciseKey: z.string().min(1, 'Exercise key is required'),
  sets: z.array(createSetSchema).min(1, 'Each exercise must have at least one set'),
  instructions: z.string().optional(),
  restBetweenSets: z.number().positive().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, { message: 'Template name is required' }),
  description: z.string().optional(),
  favorite: z.boolean().optional().default(false),
  workoutType: z.enum(['strength', 'cardio', 'hybrid', 'flexibility', 'sports']).optional().default('strength'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
  tags: z.array(z.string()).optional().default([]),
  exercises: z.array(createExerciseSchema).min(1, { message: 'Template must have at least one exercise' }),
});

type CreateTemplateData = z.infer<typeof createTemplateSchema>;

// 🚀 HELPER: GET EXERCISE DATA FROM STATIC DATA (for enrichment)
function getExerciseData(exerciseKey: string) {
  const staticData = staticExercisesData[exerciseKey as keyof typeof staticExercisesData];
  if (staticData) {
    return {
      name: staticData.name,
      muscles: staticData.muscles,
      equipment: staticData.equipment,
    };
  }

  // Fallback for unknown exercises
  return {
    name: exerciseKey, // Use the key as the name
    muscles: [],
    equipment: [],
  };
}

// 🚀 NEW JSON-BASED POST HANDLER
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    // Validate request body
    const validationResult = createTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse(
        'Invalid template data',
        400,
        validationResult.error.errors,
      );
    }

    const validatedData = validationResult.data;

    // 🎯 BUILD JSON WORKOUT DATA
    const exercisesWithData = validatedData.exercises.map((ex, index) => {
      const exerciseData = getExerciseData(ex.exerciseKey);
      return {
        exerciseKey: ex.exerciseKey,
        name: exerciseData.name,
        muscles: exerciseData.muscles,
        equipment: exerciseData.equipment,
        sets: ex.sets.map((set, setIndex) => ({
          reps: set.reps,
          weight: set.weight,
          duration: set.duration,
          distance: set.distance,
          calories: set.calories,
          heartRate: set.heartRate,
          pace: set.pace,
          incline: set.incline,
          resistance: set.resistance,
          type: set.type,
          restTime: set.restTime,
          notes: set.notes,
        })),
        instructions: ex.instructions,
        restBetweenSets: ex.restBetweenSets,
      };
    });

    // Create the JSON workout template data
    const workoutData = createWorkoutTemplate(
      validatedData.name,
      exercisesWithData,
      {
        description: validatedData.description,
        tags: validatedData.tags,
        workoutType: validatedData.workoutType as WorkoutType,
        difficulty: validatedData.difficulty as Difficulty,
      }
    );

    // Validate the created workout data
    if (!validateWorkoutTemplate(workoutData)) {
      return errorResponse('Invalid workout template structure', 500);
    }

    // Calculate computed fields
    const totalVolume = calculateTemplateVolume(workoutData.exercises);
    const estimatedDuration = calculateEstimatedDuration(workoutData.exercises);
    const exerciseCount = workoutData.exercises.length;

    // 🎯 CREATE TEMPLATE WITH JSON DATA
    const createdTemplate = await prisma.workoutTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        favorite: validatedData.favorite,
        userId: userId,
        workoutData: workoutData as any, // Prisma Json type
        totalVolume,
        estimatedDuration,
        exerciseCount,
        difficulty: validatedData.difficulty,
        workoutType: validatedData.workoutType,
        tags: validatedData.tags || [],
      },
    });

    console.log(`✅ Created JSON-based workout template: ${createdTemplate.name} (${createdTemplate.id})`);

    return successResponse(createdTemplate);
  } catch (error: any) {
    console.error('Error creating JSON-based template:', error);
    return errorResponse('Internal Server Error creating template', 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
