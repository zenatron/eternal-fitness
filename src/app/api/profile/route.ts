import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        error: true, 
        message: 'Unauthorized - you must be logged in' 
      }, { status: 401 })
    }

    console.log('GET profile for user:', userId)

    // Find or create user profile
    let dbUser = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!dbUser) {
      console.log('No profile found, creating skeleton profile for:', userId)
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
    return NextResponse.json({ 
      error: true,
      message: 'Internal Server Error', 
      details: String(error) 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Get both auth and user data
    const authData = await auth()
    const user = await currentUser()
    const userId = authData.userId
    
    console.log('POST profile - Auth data:', { 
      userId, 
      isSignedIn: !!userId,
      userEmail: user?.emailAddresses?.[0]?.emailAddress 
    })
    
    if (!userId) {
      return NextResponse.json({ 
        error: true, 
        message: 'Unauthorized - you must be logged in' 
      }, { status: 401 })
    }

    // Parse the request body
    const bodyText = await request.text()
    console.log('Raw request body:', bodyText)
    
    let body
    try {
      body = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json({ 
        error: true, 
        message: 'Invalid request format - JSON parsing failed',
        details: String(parseError)
      }, { status: 400 })
    }
    
    const { name, age, gender, height, weight } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ 
        error: true, 
        message: 'Name is required' 
      }, { status: 400 })
    }

    // Convert numeric values
    const numericAge = age ? Number(age) : null
    const numericHeight = height ? Number(height) : null
    const numericWeight = weight ? Number(weight) : null

    console.log('Processed profile data:', { 
      userId, 
      name, 
      age: numericAge, 
      gender, 
      height: numericHeight, 
      weight: numericWeight 
    })

    // Check if user exists in DB
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    try {
      let result
      
      // Create or update user
      if (!existingUser) {
        console.log('Creating new user profile in database')
        
        // Get email from Clerk if available
        const email = user?.emailAddresses?.[0]?.emailAddress || ''
        
        result = await prisma.user.create({
          data: {
            id: userId,
            email,
            name,
            age: numericAge,
            gender,
            height: numericHeight,
            weight: numericWeight,
            points: 0
          }
        })
      } else {
        console.log('Updating existing user profile in database')
        
        result = await prisma.user.update({
          where: { id: userId },
          data: {
            name,
            age: numericAge,
            gender,
            height: numericHeight,
            weight: numericWeight
          }
        })
      }

      // Get completed workouts count
      const workoutsCompleted = await prisma.workout.count({
        where: {
          userId,
          completed: true
        }
      })

      console.log('Profile saved successfully for user:', userId)
      
      // Return success response
      return NextResponse.json({
        ...result,
        workoutsCompleted,
        joinDate: result.createdAt
      })
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ 
        error: true, 
        message: 'Database error while saving profile', 
        details: String(dbError) 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/profile:', error)
    return NextResponse.json({ 
      error: true, 
      message: 'Internal server error', 
      details: String(error) 
    }, { status: 500 })
  }
} 