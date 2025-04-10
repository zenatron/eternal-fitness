import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
// Import the static exercises list
import { exercises as staticExercisesData } from "@/lib/exercises";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { name, favorite, sets } = body;
    console.log("Received create template request:", {
      name,
      favorite,
      setsCount: sets?.length,
    });

    if (!name || !sets || !Array.isArray(sets)) {
      return new NextResponse(
        JSON.stringify({
          error: "Invalid request body: name and sets array required",
        }),
        { status: 400 }
      );
    }

    // Log the structure of the first set to understand what's being received
    if (sets.length > 0) {
      console.log("First set structure:", JSON.stringify(sets[0]));
    }

    // Use transaction for atomicity
    const createdTemplate = await prisma.$transaction(async (tx) => {
      // Create the WorkoutTemplate with only the fields that exist in the schema
      const template = await tx.workoutTemplate.create({
        data: {
          name,
          userId,
          favorite: favorite !== undefined ? favorite : false,
          totalVolume: 0, // Initialize with 0, will update after calculating
        },
      });

      // Track total volume as we create sets
      let totalVolume = 0;

      // Create sets with exercises (using find-or-create logic)
      for (const set of sets) {
        // Expecting set.exercises to be an array with one ID (key from static list)
        if (
          !set.exercises ||
          !Array.isArray(set.exercises) ||
          set.exercises.length === 0
        ) {
          console.warn(
            `Skipping set creation in template ${template.id} due to missing/invalid exercises array:`,
            set
          );
          continue;
        }

        const exerciseIdKey = set.exercises[0]; // The key/ID from the static list
        let exerciseToConnectId: string | null = null;

        // 1. Find existing exercise by ID (key)
        const existingExercise = await tx.exercise.findUnique({
          where: { id: exerciseIdKey },
          select: { id: true }, // Only need the ID if it exists
        });

        if (existingExercise) {
          exerciseToConnectId = existingExercise.id;
          console.log(`Found existing exercise with ID: ${exerciseIdKey}`);
        } else {
          // 2. If not found, try to create it using static data
          const exerciseData =
            staticExercisesData[
              exerciseIdKey as keyof typeof staticExercisesData
            ];
          if (exerciseData) {
            console.log(
              `Exercise ${exerciseIdKey} not found, attempting to create...`
            );
            try {
              const newExercise = await tx.exercise.create({
                data: {
                  id: exerciseIdKey, // Use the key as the ID
                  name: exerciseData.name,
                  muscles: exerciseData.muscles,
                  equipment: exerciseData.equipment,
                  // Default createdAt/updatedAt are handled by Prisma
                },
              });
              exerciseToConnectId = newExercise.id;
              console.log(
                `Successfully created exercise with ID: ${exerciseIdKey}`
              );
            } catch (createError: unknown) {
              // Handle potential race condition if another request created it concurrently
              if (
                createError instanceof Prisma.PrismaClientKnownRequestError &&
                createError.code === "P2002"
              ) {
                console.warn(
                  `Race condition: Exercise ${exerciseIdKey} was likely created concurrently. Attempting to find again.`
                );
                // Attempt to find it again
                const foundAfterRace = await tx.exercise.findUnique({
                  where: { id: exerciseIdKey },
                  select: { id: true },
                });
                if (foundAfterRace) {
                  exerciseToConnectId = foundAfterRace.id;
                } else {
                  console.error(
                    `Failed to find exercise ${exerciseIdKey} even after race condition check.`,
                    createError
                  );
                }
              } else {
                console.error(
                  `Failed to create exercise ${exerciseIdKey}:`,
                  createError
                );
                // Decide if we should throw or continue without linking
                // For now, log error and continue without linking
              }
            }
          } else {
            console.warn(
              `Exercise key ${exerciseIdKey} from set data not found in static exercises list. Set will be created without exercise link.`
            );
          }
        }

        // Create the set record
        const reps = set.reps || 0;
        const weight = set.weight || 0;
        const setVolume = reps * weight;
        totalVolume += setVolume;

        try {
          const setData: Prisma.SetCreateInput = {
            reps,
            weight,
            volume: setVolume,
            workoutTemplate: { connect: { id: template.id } }, // Connect to template
          };

          // Only connect exercise if we found or created a valid ID
          if (exerciseToConnectId) {
            setData.exercises = { connect: [{ id: exerciseToConnectId }] };
          }

          await tx.set.create({ data: setData });
        } catch (error: unknown) {
          console.error(
            `Error creating set for template ${template.id}:`,
            error
          );
          // Rethrow? Or log and continue? For now, log and continue.
          // Consider if template creation should fail if a set fails.
        }
      }

      // Update the template with the calculated total volume
      const updatedTemplate = await tx.workoutTemplate.update({
        where: { id: template.id },
        data: { totalVolume },
        include: {
          // Include sets and exercises in the final return
          sets: {
            include: {
              exercises: true,
            },
          },
        },
      });

      return updatedTemplate;
    });

    return NextResponse.json(createdTemplate);
  } catch (error: unknown) {
    console.error("Error in POST /api/template/create:", error);
    // Import Prisma namespace for error checking
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma errors if needed
      console.error("Prisma Error Code:", error.code);
    }
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
