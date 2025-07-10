import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Zod schema for profile (POST)
const profileSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  age: z.number().int().positive().nullable().optional(),
  gender: z.string().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  useMetric: z.boolean().optional(),
  weightGoal: z.number().positive().nullable().optional(),
});

// Helper for standard success response
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

// Helper for standard error response
const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}):`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      // Explicitly select fields to avoid over-fetching
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        height: true,
        weight: true,
        useMetric: true,
        weightGoal: true,
        points: true,
        createdAt: true,
        // Add other fields as needed for the profile page
      },
    });

    if (!dbUser) {
      // Use a specific message and status for profile not found
      return errorResponse('Profile not found', 404, { needsSetup: true });
    }

    // Get completed workout sessions count separately
    const workoutsCompleted = await prisma.workoutSession.count({
      where: {
        userId: userId,
        completedAt: { not: null }, // Only count completed sessions
      },
    });

    // Combine user data and count for the response
    const profileData = {
      ...dbUser,
      workoutsCompleted,
      joinDate: dbUser.createdAt, // Keep joinDate alias if frontend expects it
    };

    return successResponse(profileData);
  } catch (error) {
    // Generic catch-all error handler
    return errorResponse(
      'Internal Server Error',
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    // Validate request body using Zod
    const validationResult = profileSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }, // Only select id to check existence
    });

    if (existingUser) {
      return errorResponse('Profile already exists. Use PUT to update.', 409); // Conflict
    }

    try {
      const email = user?.emailAddresses?.[0]?.emailAddress || '';

      const createdUser = await prisma.user.create({
        data: {
          id: userId,
          email,
          ...validatedData,
          // Ensure nullable fields are correctly passed
          age: validatedData.age ?? null,
          gender: validatedData.gender ?? null,
          height: validatedData.height ?? null,
          weight: validatedData.weight ?? null,
          points: 0, // Initialize points
          // useMetric and weightGoal are not part of create schema
        },
      });

      // Fetch workoutsCompleted separately (optional, depends on frontend need)
      const workoutsCompleted = await prisma.workoutSession.count({
        where: { userId: userId, completedAt: { not: null } },
      });

      const profileData = {
        ...createdUser,
        workoutsCompleted,
        joinDate: createdUser.createdAt,
      };

      return successResponse(profileData, 201); // 201 Created
    } catch (dbError) {
      // Handle potential database errors (e.g., unique constraint if Clerk webhook ran first)
      return errorResponse(
        'Database error creating profile',
        500,
        dbError instanceof Error ? dbError.message : String(dbError),
      );
    }
  } catch (error) {
    // Generic catch-all error handler
    return errorResponse(
      'Internal Server Error',
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    // Validate request body using Zod
    const validationResult = profileSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    try {
      // Check if user exists first
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      });

      let updatedUser;

      if (existingUser) {
        // User exists, just update the profile fields (don't touch email)
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            ...validatedData,
            // Ensure nullable fields are correctly passed for updates
            age: validatedData.age ?? null,
            gender: validatedData.gender ?? null,
            height: validatedData.height ?? null,
            weight: validatedData.weight ?? null,
            weightGoal: validatedData.weightGoal ?? null,
            // Only update useMetric if provided, otherwise keep existing value
            ...(validatedData.useMetric !== undefined && { useMetric: validatedData.useMetric }),
          },
          // Select the fields needed for the response
          select: {
            id: true,
            email: true,
            name: true,
            age: true,
            gender: true,
            height: true,
            weight: true,
            useMetric: true,
            weightGoal: true,
            points: true,
            createdAt: true,
          },
        });
      } else {
        // User doesn't exist, create new user
        const user = await currentUser();
        const email = user?.emailAddresses?.[0]?.emailAddress || '';

        updatedUser = await prisma.user.create({
          data: {
            id: userId,
            email,
            ...validatedData,
            // Ensure nullable fields are correctly passed for creation
            age: validatedData.age ?? null,
            gender: validatedData.gender ?? null,
            height: validatedData.height ?? null,
            weight: validatedData.weight ?? null,
            weightGoal: validatedData.weightGoal ?? null,
            useMetric: validatedData.useMetric ?? true, // Default to metric for new users
            points: 0, // Initialize points for new users
          },
          // Select the fields needed for the response
          select: {
            id: true,
            email: true,
            name: true,
            age: true,
            gender: true,
            height: true,
            weight: true,
            useMetric: true,
            weightGoal: true,
            points: true,
            createdAt: true,
          },
        });
      }

      // Get workoutsCompleted separately
      const workoutsCompleted = await prisma.workoutSession.count({
        where: { userId: userId, completedAt: { not: null } },
      });

      const profileData = {
        ...updatedUser,
        workoutsCompleted,
        joinDate: updatedUser.createdAt,
      };

      return successResponse(profileData);
    } catch (dbError) {
      return errorResponse(
        'Database error updating profile',
        500,
        dbError instanceof Error ? dbError.message : String(dbError),
      );
    }
  } catch (error) {
    return errorResponse(
      'Internal Server Error',
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function DELETE(request: Request) {
  let userIdToDelete: string | null = null;

  try {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId'); // For internal calls

    if (userIdParam) {
      // Internal call (e.g., webhook)
      userIdToDelete = userIdParam;
      console.log(
        '[Internal] DELETE profile requested for user:',
        userIdToDelete,
      );
      // Consider adding some form of authentication/secret key for internal calls
    } else {
      // User-initiated deletion
      const { userId: authenticatedUserId } = await auth();
      if (!authenticatedUserId) {
        return errorResponse('Unauthorized', 401);
      }
      userIdToDelete = authenticatedUserId;
      console.log('User requested self-deletion:', userIdToDelete);
    }

    if (!userIdToDelete) {
      // Should technically not happen if logic above is correct
      return errorResponse('User ID for deletion could not be determined', 400);
    }

    // Call the reusable deletion logic
    const result = await deleteUserById(userIdToDelete);

    return successResponse(result, 200); // Or 204 if no content is expected
  } catch (error: any) {
    // Catch errors from deleteUserById or auth()
    if (error?.code === 'P2025' || error?.message?.includes('not found')) {
      // Handle case where user to delete doesn't exist
      return errorResponse('User profile not found', 404, {
        userId: userIdToDelete,
      });
    } else if (error?.message === 'Unauthorized') {
      // Catch re-thrown auth error
      return errorResponse('Unauthorized', 401);
    }
    return errorResponse('Error deleting user profile', 500, {
      userId: userIdToDelete,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// --- Reusable User Deletion Logic ---

export async function deleteUserById(userId: string) {
  if (!userId) {
    throw new Error('User ID is required for deletion'); // Throw error for internal handling
  }
  console.log(
    `Attempting to delete user and associated data for ID: ${userId}`,
  );

  try {
    // Transaction ensures all deletions succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Important: Define the order of deletion based on foreign key constraints

      // 1. Delete dependent records first
      await tx.userStats.deleteMany({ where: { userId } });
      await tx.monthlyStats.deleteMany({ where: { userId } });
      await tx.workoutSession.deleteMany({ where: { userId } });

      // 2. Delete templates (which might have sets/exercises linked via cascading delete in schema)
      const deletedTemplates = await tx.workoutTemplate.deleteMany({
        where: { userId },
      });
      console.log(
        `Deleted ${deletedTemplates.count} WorkoutTemplates for user ${userId}`,
      );

      // 3. Finally, delete the user itself
      // Prisma throws P2025 if user not found, which is handled by the transaction
      const deletedUser = await tx.user.delete({ where: { id: userId } });
      console.log(`Deleted User record for ${userId}`);

      return {
        userId: deletedUser.id,
        templatesDeleted: deletedTemplates.count,
        // Add other counts if needed
      };
    });

    console.log(`Successfully deleted user ${userId} and associated data.`);
    return {
      success: true,
      message: 'User profile and associated data deleted successfully.',
      data: result,
    };
  } catch (error) {
    console.error(
      `Error during transaction for deleting user ${userId}:`,
      error,
    );
    // Re-throw the error so the calling function (DELETE handler) can catch it
    // This allows handling specific errors like P2025 (Not Found) there
    throw error;
  }
}
