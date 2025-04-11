import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { z } from 'zod';
// Import the static exercises data - adjust path if necessary
import { exercises as staticExercisesData } from "@/lib/exercises";

// --- Standard Response Helpers (Re-added) ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(`API Error (${status}) [template/{id}]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: { message, ...(details && { details }) } }, { status });
};

// --- Zod Schema for PUT Request (Full Update) (Re-added) ---
const setSchema = z.object({
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  exercises: z.array(z.string()).length(1, "Each set must link to exactly one exercise ID"),
});

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1, { message: 'Template name is required' }),
  favorite: z.boolean().optional(),
  sets: z.array(setSchema).min(1, { message: 'Template must have at least one set' }),
});

type UpdateTemplateData = z.infer<typeof updateTemplateSchema>;

// --- Helper: Find or Create Exercise within Transaction (Re-added) ---
async function findOrCreateExercise(tx: Prisma.TransactionClient, exerciseIdKey: string): Promise<string | null> {
  // ... (Implementation as defined previously) ...
  // 1. Check if exercise exists by the provided ID/key
  const existing = await tx.exercise.findUnique({
    where: { id: exerciseIdKey },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  // 2. If not found, get data from static list
  const staticData = staticExercisesData[exerciseIdKey as keyof typeof staticExercisesData];
  if (!staticData) {
    console.warn(`Exercise key ${exerciseIdKey} not found in static data. Cannot create.`);
    return null; // Indicate exercise couldn't be linked
  }

  // 3. Attempt to create the exercise
  try {
    console.log(`Creating exercise from static data: ${exerciseIdKey} (${staticData.name})`);
    const newExercise = await tx.exercise.create({
      data: {
        id: exerciseIdKey, // Use the key as the ID
        name: staticData.name,
        muscles: staticData.muscles,
        equipment: staticData.equipment,
      },
      select: { id: true },
    });
    return newExercise.id;
  } catch (error: unknown) {
    // Handle potential race condition (P2002: Unique constraint violation)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.warn(`Race condition: Exercise ${exerciseIdKey} likely created concurrently. Finding again.`);
      const foundAfterRace = await tx.exercise.findUnique({ 
        where: { id: exerciseIdKey }, 
        select: { id: true } 
      });
      return foundAfterRace?.id ?? null; // Return ID if found, otherwise null
    } else {
      console.error(`Failed to create exercise ${exerciseIdKey}:`, error);
      return null; // For now, return null and log error
    }
  }
}

// GET a single template
export async function GET(request: Request, { params }: { params: { templateId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { templateId } = await params;

    const template = await prisma.workoutTemplate.findUnique({
      where: {
        id: templateId,
        userId,
      },
      include: {
        sets: {
          orderBy: { createdAt: 'asc' },
          include: {
            exercise: true,
          },
        },
      },
    });

    if (!template) {
      return errorResponse('Template not found or access denied', 404, { templateId });
    }

    return successResponse(template);

  } catch (error) {
    console.error(`Error fetching template ${params.templateId}:`, error);
    return errorResponse('Internal Server Error', 500, { 
      templateId: params.templateId, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}

// PUT (update) a template - FULL REPLACE
export async function PUT(request: Request, { params }: { params: { templateId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { templateId } = params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid template data', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    // --- Transaction for atomic update ---
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // 1. Verify template exists and belongs to the user
      const existingTemplate = await tx.workoutTemplate.findUnique({
        where: { id: templateId, userId },
        select: { id: true, favorite: true }, // Select fields needed
      });

      if (!existingTemplate) {
        throw new Error('TemplateNotFound'); // Specific error for handling later
      }

      // 2. Update template basic info
      await tx.workoutTemplate.update({
        where: { id: templateId },
        data: {
          name: validatedData.name,
          favorite: validatedData.favorite !== undefined ? validatedData.favorite : existingTemplate.favorite,
          totalVolume: 0, // Reset volume, will recalculate
        },
      });

      // 3. Delete existing sets associated with the template
      await tx.set.deleteMany({ where: { workoutTemplateId: templateId } });

      // 4. Create new sets and calculate total volume
      let calculatedTotalVolume = 0;
      const setCreatePromises: Prisma.PrismaPromise<any>[] = []; // Array to hold promises for set creation

      for (const setData of validatedData.sets) {
        const exerciseIdKey = setData.exercises[0]; // Assuming exactly one exercise per set from schema
        const exerciseId = await findOrCreateExercise(tx, exerciseIdKey);

        if (!exerciseId) {
          // Handle case where exercise couldn't be found or created
          // Options: throw an error, skip the set, etc.
          // For now, let's log a warning and skip this set.
          console.warn(`Skipping set creation because exercise ID ${exerciseIdKey} could not be resolved.`);
          continue; // Skip to the next set
        }

        const reps = setData.reps;
        const weight = setData.weight;
        const setVolume = reps * weight;
        calculatedTotalVolume += setVolume;

        // Prepare the set creation promise
        setCreatePromises.push(
          tx.set.create({
            data: {
              reps: reps,
              weight: weight,
              workoutTemplateId: templateId,
              exerciseId: exerciseId, // Link to the found/created exercise
              // createdAt/updatedAt are handled by Prisma defaults
            },
          })
        );
      }

      // Execute all set creation promises
      await Promise.all(setCreatePromises);
      console.log(`Created ${setCreatePromises.length} sets for template ${templateId}`);

      // 5. Update the template with the final calculated volume
      const finalTemplate = await tx.workoutTemplate.update({
        where: { id: templateId },
        data: { totalVolume: calculatedTotalVolume },
        include: {
          sets: {
            orderBy: { createdAt: 'asc' },
            include: { exercise: true },
          },
        },
      });

      return finalTemplate;
    }, {
        maxWait: 10000,
        timeout: 20000, 
    }); // End Transaction

    return successResponse(updatedTemplate);

  } catch (error: any) {
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, { templateId: params.templateId });
    }
    
    console.error(`Error updating template ${params.templateId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma Error Code:", error.code);
    }
    return errorResponse('Internal Server Error updating template', 500, { 
      templateId: params.templateId, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}

// DELETE a template
export async function DELETE(request: Request, { params }: { params: { templateId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { templateId } = params;

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

      // 2. Delete associated WorkoutSessions first (if they reference templateId directly)
      // Uncomment and adjust if your schema links sessions directly to templates
      /*
      await tx.workoutSession.deleteMany({
        where: { workoutTemplateId: templateId, userId }, // Ensure user owns sessions too
      });
      console.log(`Deleted associated sessions for template ${templateId}`);
      */

      // 3. Delete associated Sets (exercises are handled via findOrCreate, not deleted here)
      await tx.set.deleteMany({
        where: { workoutTemplateId: templateId },
      });
      console.log(`Deleted associated sets for template ${templateId}`);

      // 4. Delete the template itself
      await tx.workoutTemplate.delete({
        where: { id: templateId }, // Already know it exists and belongs to user
      });
      console.log(`Deleted template ${templateId}`);
    }); // End Transaction

    return new NextResponse(null, { status: 204 }); // Success, No Content

  } catch (error: any) {
    // Handle specific not found error from transaction
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, { templateId: params.templateId });
    }

    console.error(`Error deleting template ${params.templateId}:`, error);
    // Handle other potential errors (e.g., Prisma constraint errors if relations aren't deleted correctly)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Prisma Error Code:", error.code);
    }
    return errorResponse('Internal Server Error deleting template', 500, { 
      templateId: params.templateId, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}
