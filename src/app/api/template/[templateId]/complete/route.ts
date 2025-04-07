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
    const workout = await prisma.workoutTemplate.findUnique({
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
  } catch (error) {
    console.error('Error in POST /api/template/[templateId]/complete:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 