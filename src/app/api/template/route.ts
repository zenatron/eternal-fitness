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

// 🚀 GET function to fetch all JSON-based templates for the user
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // 🎯 FETCH JSON-BASED TEMPLATES
    const templates = await prisma.workoutTemplate.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        favorite: true,
        createdAt: true,
        updatedAt: true,
        workoutData: true, // JSON workout data
        totalVolume: true,
        estimatedDuration: true,
        exerciseCount: true,
        difficulty: true,
        workoutType: true,
        tags: true,
        userId: true,
      },
      orderBy: [{ favorite: 'desc' }, { name: 'asc' }],
    });

    console.log(`✅ Fetched ${templates.length} JSON-based templates for user ${userId}`);

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
