import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { z } from 'zod';
// Import the static exercises data
import { exercises as staticExercisesData } from '@/lib/exercises';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 201) => {
  // Default 201 for POST success
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

// --- Zod Schema for POST Request (Template Creation) ---
const createSetSchema = z.object({
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  exercises: z
    .array(z.string())
    .length(1, 'Each set must link to exactly one exercise ID'),
});

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, { message: 'Template name is required' }),
  favorite: z.boolean().optional().default(false), // Default favorite to false
  sets: z
    .array(createSetSchema)
    .min(1, { message: 'Template must have at least one set' }),
});

// Type alias for validated POST data
type CreateTemplateData = z.infer<typeof createTemplateSchema>;

// --- Helper: Find or Create Exercise (Identical to the one in [templateId]/route.ts) ---
// Consider moving this to a shared lib/utils file if used in multiple places
async function findOrCreateExercise(
  tx: Prisma.TransactionClient,
  exerciseIdKey: string,
): Promise<string | null> {
  const existing = await tx.exercise.findUnique({
    where: { id: exerciseIdKey },
    select: { id: true },
  });
  if (existing) return existing.id;

  const staticData =
    staticExercisesData[exerciseIdKey as keyof typeof staticExercisesData];
  if (!staticData) {
    console.warn(`Static exercise data not found for key: ${exerciseIdKey}`);
    return null;
  }

  try {
    const newExercise = await tx.exercise.create({
      data: {
        id: exerciseIdKey,
        name: staticData.name,
        muscles: staticData.muscles,
        equipment: staticData.equipment,
      },
      select: { id: true },
    });
    return newExercise.id;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      console.warn(
        `Race condition creating exercise ${exerciseIdKey}, finding again.`,
      );
      const foundAfterRace = await tx.exercise.findUnique({
        where: { id: exerciseIdKey },
        select: { id: true },
      });
      return foundAfterRace?.id ?? null;
    } else {
      console.error(`Failed to create exercise ${exerciseIdKey}:`, error);
      return null;
    }
  }
}

// --- POST Handler ---
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

    // Use transaction for atomicity
    const createdTemplate = await prisma.$transaction(async (tx) => {
      // 1. Create the WorkoutTemplate base record
      const template = await tx.workoutTemplate.create({
        data: {
          name: validatedData.name,
          userId: userId,
          favorite: validatedData.favorite, // Already defaulted by Zod
          totalVolume: 0, // Initialize, will calculate next
        },
      });

      // 2. Create Sets and calculate Total Volume
      let calculatedTotalVolume = 0;
      for (const setData of validatedData.sets) {
        const exerciseIdKey = setData.exercises[0];
        const exerciseIdToConnect = await findOrCreateExercise(
          tx,
          exerciseIdKey,
        );

        const reps = setData.reps;
        const weight = setData.weight;
        const setVolume = reps * weight;
        calculatedTotalVolume += setVolume;

        await tx.set.create({
          data: {
            reps,
            weight,
            volume: setVolume,
            workoutTemplate: { connect: { id: template.id } },
            exercise: { connect: { id: exerciseIdToConnect ?? '' } },
          },
        });
      }

      // 3. Update the template with the calculated volume
      const finalTemplate = await tx.workoutTemplate.update({
        where: { id: template.id },
        data: { totalVolume: calculatedTotalVolume },
        include: {
          sets: {
            orderBy: { createdAt: 'asc' },
            include: { exercise: true },
          },
        },
      });

      return finalTemplate;
    }); // End Transaction

    return successResponse(createdTemplate); // Use 201 Created status
  } catch (error: any) {
    console.error('Error creating template:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle potential unique constraint errors on template name if needed
      console.error('Prisma Error Code:', error.code);
    }
    return errorResponse('Internal Server Error creating template', 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
