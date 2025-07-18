import { NextResponse } from 'next/server';
import { exercises } from '@/lib/exercises';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [exercise/{id}]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const { exerciseId } = await params;

    const exercise = exercises[exerciseId];

    if (!exercise) {
      return errorResponse('Exercise not found', 404);
    }

    return successResponse(exercise);
  } catch (error) {
    return errorResponse(
      'Internal Server Error',
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}
