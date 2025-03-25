import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function DELETE(
  request: Request,
  { params }: { params: { workoutId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // First verify the workout belongs to the user
    const workout = await prisma.workout.findUnique({
      where: {
        id: params.workoutId,
      },
      include: {
        sets: true
      }
    })

    if (!workout) {
      return new NextResponse('Workout not found', { status: 404 })
    }

    if (workout.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // First disconnect all exercises from sets
    for (const set of workout.sets) {
      await prisma.set.update({
        where: {
          id: set.id
        },
        data: {
          exercises: {
            set: [] // This disconnects all exercises from the set
          }
        }
      })
    }

    // Then delete all sets associated with this workout
    await prisma.set.deleteMany({
      where: {
        workoutId: params.workoutId
      }
    })

    // Finally delete the workout
    await prisma.workout.delete({
      where: {
        id: params.workoutId,
      }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/workouts/[workoutId]:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 