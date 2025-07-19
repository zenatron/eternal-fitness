import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createApiHandler, createValidatedApiHandler } from '@/lib/api-utils';
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

// --- Zod Schema for PUT Request (JSON-based Update) ---
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

type UpdateTemplateData = z.infer<typeof updateTemplateSchema>;

// --- Helper: Get Exercise Data from Static Data ---
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

// 🚀 GET a single JSON-based template
export const GET = createApiHandler(async (userId, request, params) => {
  const { templateId } = params;

  // Validate templateId
  if (!templateId || templateId === 'undefined') {
    throw new Error('Invalid template ID provided');
  }

    // 🎯 FETCH JSON-BASED TEMPLATE
    const template = await prisma.workoutTemplate.findUnique({
      where: {
        id: templateId,
        userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        favorite: true,
        createdAt: true,
        updatedAt: true,
        workoutData: true, // JSON workout data
        totalVolume: true,
        estimatedDuration: true,
        exerciseCount: true,
        difficulty: true,
        workoutType: true,
        tags: true,
        userId: true,
      },
    });

  if (!template) {
    throw new Error('Template not found or access denied');
  }

  console.log(`✅ Fetched JSON-based template: ${template.name} (${template.id})`);
  return template;
});

// PUT (update) a template - JSON-based FULL REPLACE
export const PUT = createValidatedApiHandler(
  updateTemplateSchema,
  async (userId, validatedData, request, params) => {
    const { templateId } = params;

    // Validate templateId
    if (!templateId || templateId === 'undefined') {
      throw new Error('Invalid template ID provided');
    }

    // Debug: Log the incoming request body
    console.log('PUT /api/template/[templateId] - Received body:', JSON.stringify(validatedData, null, 2));

    // Create workout template data structure
    const exercisesWithStaticData = validatedData.exercises.map((ex, exIndex) => {
      const exerciseData = getExerciseData(ex.exerciseKey);
      return {
        exerciseKey: ex.exerciseKey,
        name: exerciseData.name,
        muscles: exerciseData.muscles,
        equipment: exerciseData.equipment,
        sets: ex.sets.map(set => ({
          ...set,
          type: set.type as SetType || SetType.WORKING
        })),
        instructions: ex.instructions,
        restBetweenSets: ex.restBetweenSets,
      };
    });

    const workoutData = createWorkoutTemplate(
      validatedData.name,
      exercisesWithStaticData,
      {
        description: validatedData.description,
        tags: validatedData.tags,
        workoutType: validatedData.workoutType as WorkoutType,
        difficulty: validatedData.difficulty as Difficulty,
      }
    );

    // Validate the created workout data
    const isValid = validateWorkoutTemplate(workoutData);
    if (!isValid) {
      throw new Error('Invalid workout template structure');
    }

    // Calculate computed fields
    const totalVolume = calculateTemplateVolume(workoutData.exercises);
    const estimatedDuration = calculateEstimatedDuration(workoutData.exercises);
    const exerciseCount = workoutData.exercises.length;

    // Update template with JSON data
    const updatedTemplate = await prisma.workoutTemplate.update({
      where: {
        id: templateId,
        userId, // Ensure user owns the template
      },
      data: {
        name: validatedData.name,
        favorite: validatedData.favorite,
        workoutData: workoutData as any, // Prisma Json type
        totalVolume,
        estimatedDuration,
        exerciseCount,
        difficulty: validatedData.difficulty || 'intermediate',
        workoutType: validatedData.workoutType || 'strength',
      },
      select: {
        id: true,
        name: true,
        favorite: true,
        createdAt: true,
        updatedAt: true,
        workoutData: true,
        totalVolume: true,
        estimatedDuration: true,
        exerciseCount: true,
        difficulty: true,
        workoutType: true,
        userId: true,
      },
    });

    console.log(`✅ Updated JSON-based template: ${updatedTemplate.name} (${updatedTemplate.id})`);

    return updatedTemplate;
  }
);

// DELETE a template
export const DELETE = createApiHandler(async (userId, request, params) => {
  const { templateId } = params;

  // Validate templateId
  if (!templateId || templateId === 'undefined') {
    throw new Error('Invalid template ID provided');
  }

    // Use a transaction for atomicity, although deleting dependencies first is key
    await prisma.$transaction(async (tx) => {
      // 1. Verify template exists and belongs to the user *before* deleting
      const existingTemplate = await tx.workoutTemplate.findUnique({
        where: { id: templateId, userId },
        select: { id: true }, // Only need ID to confirm existence and ownership
      });

      if (!existingTemplate) {
        throw new Error('TemplateNotFound'); // Abort transaction
      }

      // 🚀 JSON-BASED DELETION - Much simpler!
      // Delete associated WorkoutSessions (they reference templateId)
      await tx.workoutSession.deleteMany({
        where: { workoutTemplateId: templateId, userId },
      });
      console.log(`Deleted associated sessions for template ${templateId}`);

      // Delete the template itself (no sets to delete - they're in JSON!)
      await tx.workoutTemplate.delete({
        where: { id: templateId },
      });
      console.log(`✅ Deleted JSON-based template ${templateId}`);
  }); // End Transaction

  return { message: 'Template deleted successfully', templateId };
});
