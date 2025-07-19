import { NextResponse } from 'next/server';
import { exercises } from '@/lib/exercises';
import { createApiHandler } from '@/lib/api-utils';

// Note: This route doesn't require authentication since it's just static exercise data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const { exerciseId } = await params;

    const exercise = exercises[exerciseId];

    if (!exercise) {
      return NextResponse.json(
        { error: { message: 'Exercise not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: exercise });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message: 'Internal Server Error',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}
