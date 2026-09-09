import { exercises as staticExercises } from '@/lib/exercises';
import { errorResponse, successResponse } from '@/lib/api/response';

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
