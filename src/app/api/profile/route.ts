import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

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

    // Find user profile
    const dbUser = await prisma.user.findUnique({
      where: {
        id: userId
      }
    })

    if (!dbUser) {
      console.log('No profile found for user:', userId)
      return NextResponse.json({ 
        error: true,
        message: 'Profile not found',
        needsSetup: true
      }, { status: 404 })
    }

    // Get completed workout sessions count
    const workoutsCompleted = await prisma.workoutSession.count({
      where: {
        userId: userId,
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

      // Get completed workout sessions count
      const workoutsCompleted = await prisma.workoutSession.count({
        where: {
          userId,
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

export async function PUT(request: Request) {
  try {
    // Get both auth and user data
    const authData = await auth()
    const user = await currentUser()
    const userId = authData.userId
    
    console.log('PUT profile - Auth data:', { 
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
    
    const { name, age, gender, height, weight, useMetric, weightGoal } = body

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
    const numericWeightGoal = weightGoal ? Number(weightGoal) : null

    console.log('Processed profile data:', { 
      userId, 
      name, 
      age: numericAge, 
      gender, 
      height: numericHeight, 
      weight: numericWeight,
      useMetric,
      weightGoal: numericWeightGoal
    })

    // Check if user exists in DB
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ 
        error: true, 
        message: 'Profile not found. Please set up your profile first.' 
      }, { status: 404 })
    }

    try {
      // Update existing user
      console.log('Updating user profile in database')
      
      const result = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          age: numericAge,
          gender,
          height: numericHeight,
          weight: numericWeight,
          useMetric: useMetric !== undefined ? useMetric : existingUser.useMetric,
          weightGoal: numericWeightGoal
        }
      })

      // Get completed workout sessions count
      const workoutsCompleted = await prisma.workoutSession.count({
        where: {
          userId,
        }
      })

      console.log('Profile updated successfully for user:', userId)
      
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
        message: 'Database error while updating profile', 
        details: String(dbError) 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error in PUT /api/profile:', error)
    return NextResponse.json({ 
      error: true, 
      message: 'Internal server error', 
      details: String(error) 
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    // Check if this is an internal API call with a specific userId
    // or an authenticated user trying to delete their own account
    let userIdToDelete: string | null = null
    
    if (userId) {
      // If userId is provided in the query string, this is an internal call
      // (webhook or admin operation)
      userIdToDelete = userId
      console.log('DELETE profile requested for user:', userIdToDelete)
    } else {
      // Otherwise, this is a user-initiated operation - require auth
      const { userId: authenticatedUserId } = await auth()
      
      if (!authenticatedUserId) {
        return NextResponse.json({ 
          error: true, 
          message: 'Unauthorized - you must be logged in' 
        }, { status: 401 })
      }
      
      userIdToDelete = authenticatedUserId
      console.log('User requested to delete their own profile:', userIdToDelete)
    }
    
    if (!userIdToDelete) {
      return NextResponse.json({ 
        error: true, 
        message: 'No user ID provided for deletion' 
      }, { status: 400 })
    }

    // Start database transaction to ensure all related data is deleted
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete UserStats (references user)
      await tx.userStats.deleteMany({
        where: { userId: userIdToDelete }
      });
      console.log(`Deleted UserStats for user ${userIdToDelete}`);

      // 2. Delete MonthlyStats (references user)
      await tx.monthlyStats.deleteMany({
        where: { userId: userIdToDelete }
      });
      console.log(`Deleted MonthlyStats for user ${userIdToDelete}`);

      // 3. Delete WorkoutSessions (references user and template)
      await tx.workoutSession.deleteMany({
          where: { userId: userIdToDelete }
      });
      console.log(`Deleted WorkoutSessions for user ${userIdToDelete}`);
      
      // 4. Delete WorkoutTemplates (references user)
      // Cascading deletes (if set up in schema) should handle related Exercises/Sets
      const deletedTemplates = await tx.workoutTemplate.deleteMany({
        where: { userId: userIdToDelete }
      });
      console.log(`Deleted ${deletedTemplates.count} WorkoutTemplates for user ${userIdToDelete}`);
      
      // 5. Finally, delete the user profile
      const deletedUser = await tx.user.delete({
        where: { id: userIdToDelete }
      });
      
      return { deletedUser, templatesDeleted: deletedTemplates.count };
    });
    
    console.log(`Successfully deleted user ${userIdToDelete} from database`);
    
    return NextResponse.json({
      success: true,
      message: 'User profile and all associated data deleted successfully',
      data: {
        userId: userIdToDelete,
        templatesDeleted: result.templatesDeleted
      }
    });

  } catch (error) {
    console.error('Error in DELETE /api/profile:', error);
    
    // Check if this is a "record not found" error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ 
        error: true,
        message: 'User profile not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: true,
      message: 'Error deleting user profile', 
      details: String(error) 
    }, { status: 500 })
  }
}

// Export a function that can be used internally from other files
export async function deleteUserById(userId: string) {
  if (!userId) {
    throw new Error('User ID is required for deletion')
  }

  try {
    // Start database transaction to ensure all related data is deleted
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete UserStats (references user)
      await tx.userStats.deleteMany({
        where: { userId }
      });
      console.log(`Deleted UserStats for user ${userId}`);

      // 2. Delete MonthlyStats (references user)
      await tx.monthlyStats.deleteMany({
        where: { userId }
      });
      console.log(`Deleted MonthlyStats for user ${userId}`);

      // 3. Delete WorkoutSessions (references user and template)
      await tx.workoutSession.deleteMany({
          where: { userId }
      });
      console.log(`Deleted WorkoutSessions for user ${userId}`);
      
      // 4. Delete WorkoutTemplates (references user)
      // Cascading deletes (if set up in schema) should handle related Exercises/Sets
      const deletedTemplates = await tx.workoutTemplate.deleteMany({
        where: { userId }
      });
      console.log(`Deleted ${deletedTemplates.count} WorkoutTemplates for user ${userId}`);
      
      // 5. Finally, delete the user profile
      const deletedUser = await tx.user.delete({
        where: { id: userId }
      });
      
      return { deletedUser, templatesDeleted: deletedTemplates.count };
    });
    
    console.log(`Successfully deleted user ${userId} from database`);
    return { success: true, userId, templatesDeleted: result.templatesDeleted };
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    throw error;
  }
} 