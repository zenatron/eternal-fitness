import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

export async function GET({ params }: { params: { exerciseId: string } }) {
  try {
    const { exerciseId } = params;

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    return successResponse(exercise);
  } catch (error) {
    return errorResponse(
      'Internal Server Error',
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}
