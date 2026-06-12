import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, workoutSessions, userStats, monthlyStats, workoutTemplates } from '@/lib/db/schema';
import { eq, and, isNotNull, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { deleteUserById } from '@/utils/userDeletion';

const profileSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  age: z.number().int().positive().nullable().optional(),
  gender: z.string().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  useMetric: z.boolean().optional(),
  weightGoal: z.number().positive().nullable().optional(),
});

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}):`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json(
    { error: Object.assign({ message }, details ? { details } : {}) },
    { status },
  );
};

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const [dbUser] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        age: users.age,
        gender: users.gender,
        height: users.height,
        weight: users.weight,
        useMetric: users.useMetric,
        weightGoal: users.weightGoal,
        points: users.points,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!dbUser) {
      return errorResponse('Profile not found', 404, { needsSetup: true });
    }

    const [{ value: workoutsCompleted }] = await db
      .select({ value: count() })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)));

    return successResponse({
      ...dbUser,
      workoutsCompleted,
      joinDate: dbUser.createdAt,
    });
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = profileSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const data = validationResult.data;

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (existing) {
      return errorResponse('Profile already exists. Use PUT to update.', 409);
    }

    const email = session?.user?.email || '';

    const [createdUser] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        name: data.name,
        age: data.age ?? null,
        gender: data.gender ?? null,
        height: data.height ?? null,
        weight: data.weight ?? null,
        points: 0,
      })
      .returning();

    const [{ value: workoutsCompleted }] = await db
      .select({ value: count() })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)));

    return successResponse({ ...createdUser, workoutsCompleted, joinDate: createdUser.createdAt }, 201);
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = profileSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const data = validationResult.data;

    const [existing] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId));

    let updatedUser;
    if (existing) {
      [updatedUser] = await db
        .update(users)
        .set({
          name: data.name,
          age: data.age ?? null,
          gender: data.gender ?? null,
          height: data.height ?? null,
          weight: data.weight ?? null,
          weightGoal: data.weightGoal ?? null,
          ...(data.useMetric !== undefined && { useMetric: data.useMetric }),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id, email: users.email, name: users.name,
          age: users.age, gender: users.gender, height: users.height,
          weight: users.weight, useMetric: users.useMetric,
          weightGoal: users.weightGoal, points: users.points, createdAt: users.createdAt,
        });
    } else {
      const session = await auth();
      const email = session?.user?.email || '';

      [updatedUser] = await db
        .insert(users)
        .values({
          id: userId,
          email,
          name: data.name,
          age: data.age ?? null,
          gender: data.gender ?? null,
          height: data.height ?? null,
          weight: data.weight ?? null,
          weightGoal: data.weightGoal ?? null,
          useMetric: data.useMetric ?? true,
          points: 0,
        })
        .returning({
          id: users.id, email: users.email, name: users.name,
          age: users.age, gender: users.gender, height: users.height,
          weight: users.weight, useMetric: users.useMetric,
          weightGoal: users.weightGoal, points: users.points, createdAt: users.createdAt,
        });
    }

    const [{ value: workoutsCompleted }] = await db
      .select({ value: count() })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)));

    return successResponse({ ...updatedUser, workoutsCompleted, joinDate: updatedUser.createdAt });
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

export async function DELETE(request: Request) {
  let userIdToDelete: string | null = null;

  try {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');

    if (userIdParam) {
      userIdToDelete = userIdParam;
    } else {
      const authenticatedUserId = await getUserId();
      if (!authenticatedUserId) return errorResponse('Unauthorized', 401);
      userIdToDelete = authenticatedUserId;
    }

    if (!userIdToDelete) {
      return errorResponse('User ID for deletion could not be determined', 400);
    }

    const result = await deleteUserById(userIdToDelete);
    return successResponse(result, 200);
  } catch (error: any) {
    if (error?.message?.includes('not found')) {
      return errorResponse('User profile not found', 404, { userId: userIdToDelete });
    }
    return errorResponse('Error deleting user profile', 500, {
      userId: userIdToDelete,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

