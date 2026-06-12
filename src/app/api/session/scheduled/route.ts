import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions } from '@/lib/db/schema';
import { eq, and, isNull, isNotNull, asc } from 'drizzle-orm';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [session/scheduled]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const scheduledSessions = await db.query.workoutSessions.findMany({
      where: and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.scheduledAt),
        isNull(workoutSessions.completedAt),
      ),
      orderBy: asc(workoutSessions.scheduledAt),
      with: {
        workoutTemplate: {
          columns: { id: true, name: true },
        },
      },
    });

    return successResponse(scheduledSessions);
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}
