import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, workoutSessions, userStats, monthlyStats, workoutTemplates } from '@/lib/db/schema';
import { eq, and, isNotNull, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { deleteUserById } from '@/utils/userDeletion';
import { ACCENT_THEME_IDS } from '@/types/theme';

const profileSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  age: z.number().int().positive().nullable().optional(),
  gender: z.string().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  weight: z.number().positive().nullable().optional(),
  useMetric: z.boolean().optional(),
  weightGoal: z.number().positive().nullable().optional(),
});

/**
 * PATCH takes only preferences, and every field is optional. Kept separate from
 * profileSchema because that one requires `name` — changing a theme should not
 * mean round-tripping the user's whole profile, and a client that did would
 * race any concurrent edit of it.
 */
const preferencesSchema = z.object({
  accentTheme: z.enum(ACCENT_THEME_IDS).optional(),
  useMetric: z.boolean().optional(),
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
        accentTheme: users.accentTheme,
        weightGoal: users.weightGoal,
        startingWeight: users.startingWeight,
        points: users.points,
        createdAt: users.createdAt,
        image: users.image,
        avatarUpdatedAt: users.avatarUpdatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!dbUser) {
      return errorResponse('Profile not found', 404, { needsSetup: true });
    }

    /*
     * Keep the OIDC picture in step with the identity provider. PocketID is the
     * source of truth for it, so a changed avatar there propagates on the next
     * profile load rather than being frozen at first sign-in. Only written when
     * it actually differs, to avoid a write on every request.
     */
    const session = await auth();
    const claimPicture = session?.user?.image ?? null;
    if (claimPicture !== dbUser.image) {
      await db.update(users).set({ image: claimPicture }).where(eq(users.id, userId));
      dbUser.image = claimPicture;
    }

    const [{ value: workoutsCompleted }] = await db
      .select({ value: count() })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)));

    return successResponse({
      ...dbUser,
      workoutsCompleted,
      joinDate: dbUser.createdAt,
      // Cache-busted by the upload timestamp so a new upload shows immediately
      // rather than being served from the browser's cache of the old one.
      avatarUrl: dbUser.avatarUpdatedAt
        ? `/api/profile/avatar?v=${dbUser.avatarUpdatedAt.getTime()}`
        : null,
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

    const [existing] = await db
      .select({
        id: users.id,
        email: users.email,
        weightGoal: users.weightGoal,
        weight: users.weight,
        startingWeight: users.startingWeight,
      })
      .from(users)
      .where(eq(users.id, userId));

    let updatedUser;
    if (existing) {
      /*
       * Progress toward a weight goal is only meaningful relative to where the
       * user started, so the baseline is captured here rather than asked for.
       * It is (re)set when a goal is newly added or changed — a changed goal
       * starts a new attempt — and left alone otherwise so ordinary profile
       * edits don't silently reset progress to 0%.
       */
      const nextGoal = data.weightGoal ?? null;
      const goalChanged = nextGoal !== existing.weightGoal;
      const nextWeight = data.weight ?? null;

      const startingWeight =
        nextGoal === null
          ? null // goal cleared: the baseline no longer refers to anything
          : goalChanged || existing.startingWeight == null
            ? (nextWeight ?? existing.weight ?? null)
            : existing.startingWeight;

      [updatedUser] = await db
        .update(users)
        .set({
          name: data.name,
          age: data.age ?? null,
          gender: data.gender ?? null,
          height: data.height ?? null,
          weight: nextWeight,
          weightGoal: nextGoal,
          startingWeight,
          ...(data.useMetric !== undefined && { useMetric: data.useMetric }),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id, email: users.email, name: users.name,
          age: users.age, gender: users.gender, height: users.height,
          weight: users.weight, useMetric: users.useMetric,
          weightGoal: users.weightGoal, startingWeight: users.startingWeight,
          points: users.points, createdAt: users.createdAt,
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

/**
 * Partial preference update. Used by the accent theme picker, which fires on
 * every selection and must not disturb anything else on the row.
 */
export async function PATCH(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const parsed = preferencesSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('Invalid preferences', 400, parsed.error.flatten());
    }

    const updates = {
      ...(parsed.data.accentTheme !== undefined && { accentTheme: parsed.data.accentTheme }),
      ...(parsed.data.useMetric !== undefined && { useMetric: parsed.data.useMetric }),
    };

    if (Object.keys(updates).length === 0) {
      return successResponse({ updated: false });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({ accentTheme: users.accentTheme, useMetric: users.useMetric });

    // No row yet: the user is mid-setup. Not an error — the local value still
    // applies, and setup will write the row shortly.
    if (!updated) return successResponse({ updated: false });

    return successResponse(updated);
  } catch (error) {
    return errorResponse('Failed to update preferences', 500, error);
  }
}

export async function DELETE(request: Request) {
  let userIdToDelete: string | null = null;

  try {
    const authenticatedUserId = await getUserId();
    if (!authenticatedUserId) return errorResponse('Unauthorized', 401);
    userIdToDelete = authenticatedUserId;

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

