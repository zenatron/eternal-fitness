import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
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

// --- Standard Response Helpers (Re-added) ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [template/{id}]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

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
export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { templateId } = await params;

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
      return errorResponse('Template not found or access denied', 404, {
        templateId,
      });
    }

    console.log(`✅ Fetched JSON-based template: ${template.name} (${template.id})`);

    return successResponse(template);
  } catch (error) {
    const { templateId } = await params;
    console.error(`Error fetching template ${templateId}:`, error);
    return errorResponse('Internal Server Error', 500, {
      templateId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// PUT (update) a template - JSON-based FULL REPLACE
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { templateId } = await params;
    const body = await request.json();

    // Debug: Log the incoming request body
    console.log('PUT /api/template/[templateId] - Received body:', JSON.stringify(body, null, 2));

    // Validate request body
    const validationResult = updateTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse(
        'Invalid template data',
        400,
        validationResult.error.errors,
      );
    }

    const validatedData = validationResult.data;

    // Create workout template data structure
    const exercisesWithStaticData = validatedData.exercises.map((ex, exIndex) => {
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

    const workoutData = createWorkoutTemplate(
      validatedData.name,
      exercisesWithStaticData,
      {
        description: validatedData.description,
        tags: validatedData.tags,
        workoutType: validatedData.workoutType,
        difficulty: validatedData.difficulty,
      }
    );

    // Validate the created workout data
    const validationErrors = validateWorkoutTemplate(workoutData);
    if (validationErrors.length > 0) {
      return errorResponse(
        'Invalid workout template structure',
        400,
        { validationErrors }
      );
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

    return successResponse(updatedTemplate);
  } catch (error: any) {
    const { templateId } = await params;

    // Handle template not found or access denied
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return errorResponse('Template not found or access denied', 404, {
        templateId,
      });
    }

    console.error(`Error updating template ${templateId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code);
    }
    return errorResponse('Internal Server Error updating template', 500, {
      templateId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// DELETE a template
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { templateId } = await params;

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

    return new NextResponse(null, { status: 204 }); // Success, No Content
  } catch (error: any) {
    // Handle specific not found error from transaction
    const { templateId } = await params;
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, {
        templateId,
      });
    }

    console.error(`Error deleting template ${templateId}:`, error);
    // Handle other potential errors (e.g., Prisma constraint errors if relations aren't deleted correctly)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code);
    }
    return errorResponse('Internal Server Error deleting template', 500, {
      templateId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
