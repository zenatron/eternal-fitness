import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [session/{id}]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

const updateSessionSchema = z.object({
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { sessionId } = await params;

    const session = await db.query.workoutSessions.findFirst({
      where: and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)),
      with: {
        workoutTemplate: {
          columns: { id: true, name: true },
        },
      },
    });

    if (!session) {
      return errorResponse('Session not found or access denied', 404, { sessionId });
    }

    return successResponse(session);
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { sessionId } = await params;
    const body = await request.json();

    const validationResult = updateSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    const [existing] = await db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));

    if (!existing) {
      return errorResponse('Session not found or access denied', 404, { sessionId });
    }

    const updatePayload: Record<string, unknown> = {};
    if (validatedData.duration !== undefined) updatePayload.duration = validatedData.duration;
    if (validatedData.notes !== undefined) updatePayload.notes = validatedData.notes;
    if (validatedData.completedAt) {
      updatePayload.completedAt = new Date(validatedData.completedAt);
      updatePayload.scheduledAt = null;
    } else if (validatedData.scheduledAt !== undefined) {
      updatePayload.scheduledAt = validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null;
      if (updatePayload.scheduledAt) updatePayload.completedAt = null;
    }

    const [updatedSession] = await db
      .update(workoutSessions)
      .set(updatePayload)
      .where(eq(workoutSessions.id, sessionId))
      .returning();

    return successResponse(updatedSession);
  } catch (error) {
    const { sessionId } = await params;
    return errorResponse('Internal Server Error updating session', 500, { sessionId, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { sessionId } = await params;

    const deleted = await db
      .delete(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
      .returning({ id: workoutSessions.id });

    if (deleted.length === 0) {
      return errorResponse('Session not found or access denied', 404, { sessionId });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { sessionId } = await params;
    return errorResponse('Internal Server Error deleting session', 500, { sessionId, error: error instanceof Error ? error.message : String(error) });
  }
}
