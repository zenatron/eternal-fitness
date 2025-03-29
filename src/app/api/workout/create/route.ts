import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { name, exercises, scheduledDate, favorite } = body

    if (!name || !exercises || !Array.isArray(exercises)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request body: name and exercises array required' }), 
        { status: 400 }
      )
    }

    // Create the workout
    const workout = await prisma.workout.create({
      data: {
        name,
        userId,
        completed: false,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        favorite: favorite !== undefined ? favorite : false,
        totalVolume: 0 // Initialize with 0, will update after calculating
      } as any
    })

    // Track total volume as we create sets
    let totalVolume = 0;

    // Create or find exercises and create sets
    for (const exerciseData of exercises) {
      if (!exerciseData.name || !exerciseData.sets) {
        throw new Error(`Invalid exercise data: ${JSON.stringify(exerciseData)}`)
      }

      // Enhanced deduplication: Find by name AND matching muscles AND equipment
      let exercise = await prisma.exercise.findFirst({
        where: {
          name: exerciseData.name,
          // Only include these conditions if the arrays are provided
          ...(exerciseData.muscles?.length > 0 ? {
            muscles: {
              equals: exerciseData.muscles || []
            }
          } : {}),
          ...(exerciseData.equipment?.length > 0 ? {
            equipment: {
              equals: exerciseData.equipment || []
            }
          } : {})
        }
      })

      if (!exercise) {
        // If no exact match, see if there's a name match with similar content
        exercise = await prisma.exercise.findFirst({
          where: {
            name: exerciseData.name,
          }
        });

        // If even that doesn't exist, create a new exercise
        if (!exercise) {
          exercise = await prisma.exercise.create({
            data: {
              name: exerciseData.name,
              muscles: exerciseData.muscles || [],
              equipment: exerciseData.equipment || [],
            }
          })
        }
      }

      // Create sets for this exercise
      for (const set of exerciseData.sets) {
        const reps = set.reps || 0;
        const weight = set.weight || 0;
        const setVolume = reps * weight;
        
        // Add to total volume
        totalVolume += setVolume;
        
        await prisma.set.create({
          data: {
            reps,
            weight,
            volume: setVolume, // Store the volume for this set
            workout: {
              connect: {
                id: workout.id
              }
            },
            exercises: {
              connect: {
                id: exercise.id
              }
            }
          } as any
        })
      }
    }
    
    // Update the workout with the calculated total volume
    await prisma.workout.update({
      where: { id: workout.id },
      data: { totalVolume } as any
    });

    // Return the created workout with its sets
    const createdWorkout = await prisma.workout.findUnique({
      where: {
        id: workout.id
      },
      include: {
        sets: {
          include: {
            exercises: true
          }
        }
      }
    })

    return NextResponse.json(createdWorkout)
  } catch (error) {
    console.error('Error in POST /api/workout/create:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 