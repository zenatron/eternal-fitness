import { NextResponse } from 'next/server';
import { exercises as staticExercises } from '@/lib/exercises';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: { message } }, { status });
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const { exerciseId } = await params;
    const exercise = staticExercises[exerciseId as keyof typeof staticExercises];

    if (!exercise) {
      return errorResponse('Exercise not found', 404);
    }

    return successResponse({ exerciseKey: exerciseId, ...exercise });
  } catch (error) {
    return errorResponse('Internal Server Error', 500);
  }
}
