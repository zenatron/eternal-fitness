import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET a single workout
export async function GET(
  request: Request,
  { params }: { params: { workoutId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const workoutId = params.workoutId

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
  { params }: { params: { workoutId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const workoutId = params.workoutId
    
    // Parse the request body
    const body = await request.json()
    const { name, exercises } = body
    
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
    
    // Transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Update the workout name
      await tx.workout.update({
        where: { id: workoutId },
        data: { name }
      })
      
      // Delete all existing sets for this workout
      await tx.set.deleteMany({
        where: { workoutId }
      })
      
      // Create new sets and associated exercises
      for (const exercise of exercises) {
        const { name: exerciseName, muscles, equipment, sets } = exercise
        
        if (!sets || !Array.isArray(sets)) continue
        
        for (const set of sets) {
          const { reps, weight, unit } = set
          
          // Create a new set with the exercise
          await tx.set.create({
            data: {
              workoutId,
              reps: reps || 0,
              weight: weight || 0,
              exercises: {
                create: {
                  name: exerciseName,
                  muscles: muscles || [],
                  equipment: equipment || []
                }
              }
            }
          })
        }
      }
    })
    
    return NextResponse.json({ message: 'Workout updated successfully' })
  } catch (error) {
    console.error('Error updating workout:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// DELETE a workout
export async function DELETE(
  request: Request,
  { params }: { params: { workoutId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const workoutId = params.workoutId

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

