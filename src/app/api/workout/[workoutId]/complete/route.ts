import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { workoutId } = await params

    // Fetch the workout to check if it exists and belongs to the user
    const workout = await prisma.workout.findUnique({
      where: {
        id: workoutId,
      },
    })

    if (!workout) {
      return new NextResponse('Workout not found', { status: 404 })
    }

    if (workout.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Toggle the completed status and set completedAt accordingly
    const completed = !workout.completed
    const completedAt = completed ? new Date() : null

    // Update the workout
    const updatedWorkout = await prisma.workout.update({
      where: {
        id: workoutId,
      },
      data: {
        completed,
        completedAt,
      },
    })

    return NextResponse.json(updatedWorkout)
  } catch (error) {
    console.error('Error in POST /api/workout/[workoutId]/complete:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 