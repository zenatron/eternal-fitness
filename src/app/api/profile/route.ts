import { currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createApiHandler, createValidatedApiHandler, ApiError } from '@/lib/api-utils';

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

export const GET = createApiHandler(async (userId) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!dbUser) {
    throw new ApiError('Profile not found', 404, { needsSetup: true });
  }

  // Get completed workout sessions count
  const workoutsCompleted = await prisma.workoutSession.count({
    where: {
      userId: userId,
      completedAt: { not: null },
    },
  });

  return {
    ...dbUser,
    workoutsCompleted,
    joinDate: dbUser.createdAt, // Keep joinDate alias if frontend expects it
  };
});

export const POST = createValidatedApiHandler(
  profileSchema,
  async (userId, validatedData) => {
    const user = await currentUser();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (existingUser) {
      throw new ApiError('Profile already exists. Use PUT to update.', 409);
    }

    const email = user?.emailAddresses?.[0]?.emailAddress || '';

    const createdUser = await prisma.user.create({
      data: {
        id: userId,
        email,
        ...validatedData,
        age: validatedData.age ?? null,
        gender: validatedData.gender ?? null,
        height: validatedData.height ?? null,
        weight: validatedData.weight ?? null,
        points: 0,
      },
    });

    // Fetch workoutsCompleted separately
    const workoutsCompleted = await prisma.workoutSession.count({
      where: { userId: userId, completedAt: { not: null } },
    });

    return {
      ...createdUser,
      workoutsCompleted,
      joinDate: createdUser.createdAt,
    };
  }
);

export const PUT = createValidatedApiHandler(
  profileSchema,
  async (userId, validatedData) => {
    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });

    let updatedUser;

    if (existingUser) {
      // User exists, just update the profile fields
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...validatedData,
          age: validatedData.age ?? null,
          gender: validatedData.gender ?? null,
          height: validatedData.height ?? null,
          weight: validatedData.weight ?? null,
          weightGoal: validatedData.weightGoal ?? null,
          ...(validatedData.useMetric !== undefined && { useMetric: validatedData.useMetric }),
        },
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
          age: validatedData.age ?? null,
          gender: validatedData.gender ?? null,
          height: validatedData.height ?? null,
          weight: validatedData.weight ?? null,
          weightGoal: validatedData.weightGoal ?? null,
          useMetric: validatedData.useMetric ?? true,
          points: 0,
        },
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

    return {
      ...updatedUser,
      workoutsCompleted,
      joinDate: updatedUser.createdAt,
    };
  }
);

export const DELETE = createApiHandler(async (userId, request) => {
  const url = new URL(request.url);
  const userIdParam = url.searchParams.get('userId');

  // Allow internal calls with userId param, otherwise use authenticated user
  const userIdToDelete = userIdParam || userId;

  console.log(userIdParam ? '[Internal]' : '[User]', 'DELETE profile requested for:', userIdToDelete);

  return await deleteUserById(userIdToDelete);
});

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
