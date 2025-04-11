import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [template/]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

// GET function to fetch all templates for the user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Fetch templates, including sets and their related exercises
    const templates = await prisma.workoutTemplate.findMany({
      where: {
        userId,
      },
      include: {
        sets: {
          orderBy: { createdAt: 'asc' },
          include: {
            exercise: true,
          },
        },
      },
      orderBy: [{ favorite: 'desc' }, { name: 'asc' }],
    });

    return successResponse(templates);
  } catch (error) {
    console.error('Error in GET /api/template:', error);
    return errorResponse(
      'Internal Server Error fetching templates',
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}
