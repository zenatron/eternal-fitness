import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const workouts = await prisma.workout.findMany({
      where: {
        userId
      },
      include: {
        sets: {
          include: {
            exercises: {
              select: {
                name: true,
                muscles: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(workouts)
  } catch (error) {
    console.error('Error in GET /api/workouts:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 