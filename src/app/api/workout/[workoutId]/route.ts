import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET a single workout
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const workoutId = (await params).workoutId

    // Find the workout and include its sets and exercises
    const workout = await prisma.workout.findUnique({
      where: {
        id: workoutId,
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

    if (!workout) {
      return new NextResponse('Workout not found', { status: 404 })
    }

    return NextResponse.json(workout)
  } catch (error) {
    console.error('Error fetching workout:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// PUT (update) a workout
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const workoutId = (await params).workoutId
    
    // Parse the request body
    const body = await request.json()
    const { name, exercises, scheduledDate, favorite } = body
    
    if (!name || !exercises || !Array.isArray(exercises)) {
      return new NextResponse('Invalid workout data', { status: 400 })
    }
    
    // Check if the workout exists and belongs to the user
    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        userId
      }
    })

    if (!existingWorkout) {
      return new NextResponse('Workout not found', { status: 404 })
    }
    
    // Track total volume
    let totalVolume = 0;
    
    // Transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Update the workout with basic fields
      await tx.workout.update({
        where: { id: workoutId },
        data: {
          name,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
          favorite: favorite !== undefined ? favorite : undefined
        } as any
      })
      
      // Delete all existing sets for this workout
      await tx.set.deleteMany({
        where: { workoutId }
      })
      
      // Create new sets and associated exercises
      for (const exercise of exercises) {
        const { name: exerciseName, muscles, equipment, sets } = exercise
        
        if (!sets || !Array.isArray(sets)) continue
        
        // Enhanced deduplication: Find by name AND matching muscles AND equipment
        let existingExercise = await tx.exercise.findFirst({
          where: {
            name: exerciseName,
            // Only include these conditions if the arrays are provided
            ...(muscles?.length > 0 ? {
              muscles: {
                equals: muscles
              }
            } : {}),
            ...(equipment?.length > 0 ? {
              equipment: {
                equals: equipment
              }
            } : {})
          }
        });

        // If no exact match, try to find by name
        if (!existingExercise) {
          existingExercise = await tx.exercise.findFirst({
            where: {
              name: exerciseName
            }
          });
        }
        
        for (const set of sets) {
          const reps = set.reps || 0;
          const weight = set.weight || 0;
          const setVolume = reps * weight;
          
          // Add to total volume
          totalVolume += setVolume;
          
          // Create a new set
          if (existingExercise) {
            // Use existing exercise
            await tx.set.create({
              data: {
                workoutId,
                reps,
                weight,
                volume: setVolume,
                exercises: {
                  connect: { id: existingExercise.id }
                }
              } as any
            });
          } else {
            // Create new exercise
            await tx.set.create({
              data: {
                workoutId,
                reps,
                weight,
                volume: setVolume,
                exercises: {
                  create: {
                    name: exerciseName,
                    muscles: muscles || [],
                    equipment: equipment || []
                  }
                }
              } as any
            });
          }
        }
      }
      
      // Update the workout with the total volume
      await tx.workout.update({
        where: { id: workoutId },
        data: { totalVolume } as any
      });
    })
    
    // Fetch the updated workout to return
    const updatedWorkout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        sets: {
          include: {
            exercises: true
          }
        }
      }
    });
    
    return NextResponse.json(updatedWorkout)
  } catch (error) {
    console.error('Error updating workout:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// DELETE a workout
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const workoutId = (await params).workoutId

    // First check if the workout exists and belongs to the user
    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        userId
      }
    })

    if (!existingWorkout) {
      return new NextResponse('Workout not found', { status: 404 })
    }

    // Delete all sets for this workout
    await prisma.set.deleteMany({
      where: { workoutId }
    })

    // Delete the workout
    await prisma.workout.delete({
      where: { id: workoutId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting workout:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 

