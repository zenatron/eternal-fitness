import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions } from '@/lib/db/schema';
import { eq, and, isNull, isNotNull, asc } from 'drizzle-orm';
import { errorResponse, successResponse } from '@/lib/api/response';

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
