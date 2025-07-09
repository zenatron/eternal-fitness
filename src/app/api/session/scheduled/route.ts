import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [session/scheduled]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

// GET function to fetch ONLY scheduled sessions
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const scheduledSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        // Only sessions that are scheduled AND not yet completed
        scheduledAt: {
          not: null,
        },
        completedAt: null, // Explicitly check for null instead of undefined
      },
      orderBy: { scheduledAt: 'asc' }, // Sort by upcoming date
      select: {
        id: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
        performanceData: true, // Include JSON performance data
        workoutTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return successResponse(scheduledSessions);
  } catch (error) {
    console.error('Error in GET /api/session/scheduled:', error); // Keep specific logging
    return errorResponse(
      'Internal Server Error',
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}
