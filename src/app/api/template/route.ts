import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates } from '@/lib/db/schema';
import { eq, desc, asc } from 'drizzle-orm';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [template/]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const templates = await db
      .select({
        id: workoutTemplates.id,
        name: workoutTemplates.name,
        description: workoutTemplates.description,
        favorite: workoutTemplates.favorite,
        createdAt: workoutTemplates.createdAt,
        updatedAt: workoutTemplates.updatedAt,
        workoutData: workoutTemplates.workoutData,
        totalVolume: workoutTemplates.totalVolume,
        estimatedDuration: workoutTemplates.estimatedDuration,
        exerciseCount: workoutTemplates.exerciseCount,
        difficulty: workoutTemplates.difficulty,
        workoutType: workoutTemplates.workoutType,
        tags: workoutTemplates.tags,
        userId: workoutTemplates.userId,
      })
      .from(workoutTemplates)
      .where(eq(workoutTemplates.userId, userId))
      .orderBy(desc(workoutTemplates.favorite), asc(workoutTemplates.name));

    return successResponse(templates);
  } catch (error) {
    return errorResponse('Internal Server Error fetching templates', 500, error instanceof Error ? error.message : String(error));
  }
}
