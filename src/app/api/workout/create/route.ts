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
      } as any
    })

    // Create or find exercises and create sets
    for (const exerciseData of exercises) {
      if (!exerciseData.name || !exerciseData.sets) {
        throw new Error(`Invalid exercise data: ${JSON.stringify(exerciseData)}`)
      }

      // Find or create the exercise
      let exercise = await prisma.exercise.findFirst({
        where: {
          name: exerciseData.name,
        }
      })

      if (!exercise) {
        exercise = await prisma.exercise.create({
          data: {
            name: exerciseData.name,
            muscles: exerciseData.muscles || [],
            equipment: exerciseData.equipment || [],
          }
        })
      }

      // Create sets for this exercise
      for (const set of exerciseData.sets) {
        await prisma.set.create({
          data: {
            reps: set.reps,
            weight: set.weight,
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
          }
        })
      }
    }

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