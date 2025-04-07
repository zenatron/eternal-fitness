import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient, Prisma } from '@prisma/client'
// Import the static exercises list
import { exercises as staticExercisesData } from '@/lib/exercises';

const prisma = new PrismaClient()

// GET a single template
export async function GET(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const templateId = (await params).templateId

    // Find the template using prisma.workoutTemplate
    const template = await prisma.workoutTemplate.findUnique({
      where: {
        id: templateId,
        userId
      },
      include: {
        sets: {
          include: {
            exercises: true
          }
        }
      }
    })

    if (!template) {
      return new NextResponse('Template not found', { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// PUT (update) a template - Handles FULL updates only now
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  console.log("PUT /api/template/[templateId] received request for FULL UPDATE");
  try {
    const { userId } = await auth()
    
    if (!userId) {
      console.error("Unauthorized PUT request for template update");
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const templateId = (await params).templateId
    
    const body = await request.json()
    // Expect full template data for updates
    const { name, favorite, sets } = body
    
    console.log(`Request Body for template ${templateId} FULL UPDATE:`, JSON.stringify(body));

    // This is treated as a full template update
    console.log(`Handling full update for template ${templateId}`);
    
    // Validate that we have the required fields for a full update
    if (!name || !sets || !Array.isArray(sets)) {
      console.error(`Invalid full update data for template ${templateId}:`, { nameExists: !!name, setsExists: !!sets, setsIsArray: Array.isArray(sets) });
      return new NextResponse(
        JSON.stringify({ error: 'Invalid template data: name and sets array required for full update' }), 
        { status: 400 }
      )
    }
    
    // Check if the template exists and belongs to the user before starting transaction
    const existingTemplate = await prisma.workoutTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    });

    if (!existingTemplate) {
      console.error(`Full update failed: Template ${templateId} not found or unauthorized`);
      return new NextResponse('Template not found', { status: 404 })
    }
    
    // Transaction to update template and sets
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      // Update the template basic fields
      await tx.workoutTemplate.update({
        where: { id: templateId },
        data: {
          name,
          favorite: favorite !== undefined ? favorite : existingTemplate.favorite 
        }
      });
      
      // Delete all existing sets for this template
      await tx.set.deleteMany({
        where: { workoutTemplateId: templateId }
      });
      
      // Re-create sets and calculate total volume
      let totalVolume = 0;
      
      // --- Start: Find-or-create logic for exercises during set recreation --- 
      for (const set of sets) {
        if (!set.exercises || !Array.isArray(set.exercises) || set.exercises.length === 0) {
            console.warn(`Skipping set creation in template ${templateId} update due to missing/invalid exercises array:`, set);
            continue;
        }
        
        const exerciseIdKey = set.exercises[0]; // The key/ID from the static list
        let exerciseToConnectId: string | null = null;

        // 1. Find existing exercise by ID (key)
        const existingExercise = await tx.exercise.findUnique({
          where: { id: exerciseIdKey },
          select: { id: true } // Only need the ID if it exists
        });

        if (existingExercise) {
          exerciseToConnectId = existingExercise.id;
        } else {
          // 2. If not found, try to create it using static data
          const exerciseData = staticExercisesData[exerciseIdKey as keyof typeof staticExercisesData];
          if (exerciseData) {
            console.log(`Exercise ${exerciseIdKey} not found during update, attempting to create...`);
            try {
              const newExercise = await tx.exercise.create({
                data: {
                  id: exerciseIdKey, // Use the key as the ID
                  name: exerciseData.name,
                  muscles: exerciseData.muscles,
                  equipment: exerciseData.equipment,
                }
              });
              exerciseToConnectId = newExercise.id;
              console.log(`Successfully created exercise with ID: ${exerciseIdKey} during update`);
            } catch (createError: unknown) { // Explicitly type caught error
              // Handle potential race condition
              if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === 'P2002') { 
                 console.warn(`Race condition during update: Exercise ${exerciseIdKey} was likely created concurrently. Finding again.`);
                 const foundAfterRace = await tx.exercise.findUnique({ where: { id: exerciseIdKey }, select: { id: true } });
                 exerciseToConnectId = foundAfterRace?.id || null;
              } else {
                 console.error(`Failed to create exercise ${exerciseIdKey} during update:`, createError);
              }
            }
          } else {
            console.warn(`Exercise key ${exerciseIdKey} from update data not found in static exercises list. Set will be created without exercise link.`);
          }
        }

        // Create the set record
        const reps = set.reps || 0;
        const weight = set.weight || 0;
        const setVolume = reps * weight;
        totalVolume += setVolume;

        try {
          // Use Prisma.SetCreateInput type
          const setData: Prisma.SetCreateInput = {
              reps,
              weight,
              volume: setVolume,
              workoutTemplate: { connect: { id: templateId } }, // Connect to template
          };

          // Only connect exercise if we found or created a valid ID
          if (exerciseToConnectId) {
            setData.exercises = { connect: [{ id: exerciseToConnectId }] };
          }

          await tx.set.create({ data: setData });

        } catch (error: unknown) { // Explicitly type caught error
          console.error(`Error re-creating set for template ${templateId} during update:`, error);
        }
      }
      // --- End: Find-or-create logic --- 
      
      // Update the template with the final total volume
      const finalTemplate = await tx.workoutTemplate.update({
        where: { id: templateId },
        data: { totalVolume },
        include: {
          sets: {
            include: {
              exercises: true
            }
          }
        }
      });
      return finalTemplate;
    });
    
    console.log(`Successfully performed full update for template ${templateId}`);
    return NextResponse.json(updatedTemplate);

  } catch (error: unknown) { // Explicitly type caught error
    console.error(`General error in PUT /api/template/[templateId] (${(params as any)?.templateId || 'unknown ID'}):`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Prisma Error Code:", error.code);
    }
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// DELETE a template
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const templateId = (await params).templateId

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // First check if the template exists and belongs to the user
      const existingTemplate = await tx.workoutTemplate.findFirst({
        where: {
          id: templateId,
          userId
        }
      });

      if (!existingTemplate) {
        // Throw an error to rollback transaction if not found
        throw new Error('Template not found'); 
      }

      // Delete all associated sessions first (important!) -> This relation wasn't added in the previous edit, but should be handled if sessions exist
      // await tx.workoutSession.deleteMany({ 
      //   where: { workoutTemplateId: templateId }
      // });

      // Delete all sets for this template
      await tx.set.deleteMany({
        where: { workoutTemplateId: templateId }
      });

      // Delete the template itself
      await tx.workoutTemplate.delete({
        where: { id: templateId }
      });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    // Handle specific 'Template not found' error from transaction
    if (error instanceof Error && error.message === 'Template not found') {
      return new NextResponse('Template not found', { status: 404 });
    }
    console.error('Error deleting template:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 

