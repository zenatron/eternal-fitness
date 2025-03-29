import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST to toggle favorite status
export async function POST(
  request: Request,
  { params }: { params: { workoutId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const workoutId = params.workoutId
    
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
    
    // TypeScript workaround - cast to any to handle new field
    const currentFavoriteStatus = (existingWorkout as any).favorite || false
    
    // Toggle the favorite status
    const updatedWorkout = await prisma.workout.update({
      where: { id: workoutId },
      data: { 
        // TypeScript workaround - use unknown key in object
        favorite: !currentFavoriteStatus
      } as any
    })
    
    return NextResponse.json({
      favorite: (updatedWorkout as any).favorite
    })
  } catch (error) {
    console.error('Error toggling favorite status:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 