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

    // Find or create user profile
    let dbUser = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!dbUser) {
      // Create a new user profile if it doesn't exist
      dbUser = await prisma.user.create({
        data: {
          id: userId,
          email: '', // We'll update this when we get the user's email
          name: '',
          points: 0
        }
      })
    }

    // Get completed workouts count
    const workoutsCompleted = await prisma.workout.count({
      where: {
        userId: userId,
        completed: true
      }
    })

    return NextResponse.json({
      ...dbUser,
      workoutsCompleted,
      joinDate: dbUser.createdAt
    })
  } catch (error) {
    console.error('Error in GET /api/profile:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { name, age, gender, height, weight } = body

    console.log('Received data:', { name, age, gender, height, weight, heightType: typeof height, weightType: typeof weight })

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        name,
        age,
        gender,
        height,
        weight
      }
    })

    // Get completed workouts count
    const workoutsCompleted = await prisma.workout.count({
      where: {
        userId: userId,
        completed: true
      }
    })

    return NextResponse.json({
      ...updatedUser,
      workoutsCompleted,
      joinDate: updatedUser.createdAt
    })
  } catch (error) {
    console.error('Error in POST /api/profile:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 