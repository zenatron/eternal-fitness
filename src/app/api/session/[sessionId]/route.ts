import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [session/{id}]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

// --- Zod Schema for PUT ---
const updateSessionSchema = z.object({
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  // completedAt should be a valid date string if provided
  completedAt: z.string().datetime({ offset: true }).optional(), // Expect ISO 8601 string
  // scheduledAt can be a date string or explicitly null to unschedule
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
});

// GET a specific session by ID
export async function GET({ params }: { params: { sessionId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { sessionId } = params; // Directly access params

    const session = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId, // Ensure session belongs to the authenticated user
      },
      include: {
        workoutTemplate: {
          select: { name: true }, // Include template name
        },
        // Consider including exercises/sets if needed on the session page
      },
    });

    if (!session) {
      return errorResponse('Session not found or access denied', 404, {
        sessionId,
      });
    }

    return successResponse(session);
  } catch (error) {
    console.error('Error in GET /api/session/[sessionId]:', error); // Keep specific logging
    return errorResponse(
      'Internal Server Error',
      500,
      error instanceof Error ? error.message : String(error),
    );
  }
}

// PUT (update) a session
export async function PUT(
  request: Request,
  { params }: { params: { sessionId: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { sessionId } = params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    // Verify session exists and belongs to the user before update
    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: { id: true }, // Only need to check existence
    });

    if (!existingSession) {
      return errorResponse('Session not found or access denied', 404, {
        sessionId,
      });
    }

    // Construct the update data carefully
    const updatePayload: Prisma.WorkoutSessionUpdateInput = {};
    if (validatedData.duration !== undefined) {
      updatePayload.duration = validatedData.duration;
    }
    if (validatedData.notes !== undefined) {
      updatePayload.notes = validatedData.notes;
    }
    if (validatedData.completedAt) {
      // If completing, set completedAt and ensure scheduledAt is cleared
      updatePayload.completedAt = new Date(validatedData.completedAt);
      updatePayload.scheduledAt = null; // Ensure it's not also scheduled
    } else if (validatedData.scheduledAt !== undefined) {
      // If scheduling/rescheduling/unscheduling
      updatePayload.scheduledAt = validatedData.scheduledAt
        ? new Date(validatedData.scheduledAt)
        : null;
      if (updatePayload.scheduledAt) {
        updatePayload.completedAt = null; // Ensure it's not also completed
      }
    }

    // Update the session
    const updatedSession = await prisma.workoutSession.update({
      where: {
        id: sessionId,
        // We already verified ownership, no need for userId here
      },
      data: updatePayload,
      // Include data needed by the frontend after update
      include: {
        workoutTemplate: { select: { name: true } },
      },
    });

    return successResponse(updatedSession);
  } catch (error) {
    console.error('Error in PUT /api/session/[sessionId]:', error);
    // Handle potential Prisma errors (e.g., invalid date format if Zod fails)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Add specific error handling if needed
    }
    return errorResponse('Internal Server Error updating session', 500, {
      sessionId: params.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// DELETE a session
export async function DELETE({ params }: { params: { sessionId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { sessionId } = params;

    // Use deleteMany for potentially better performance and simpler check
    // It returns a count of deleted records.
    const deleteResult = await prisma.workoutSession.deleteMany({
      where: {
        id: sessionId,
        userId, // Ensures only the owner can delete
      },
    });

    // Check if any record was actually deleted
    if (deleteResult.count === 0) {
      // This means the session either didn't exist or didn't belong to the user
      return errorResponse('Session not found or access denied', 404, {
        sessionId,
      });
    }

    // Successfully deleted
    return new NextResponse(null, { status: 204 }); // Standard practice for successful DELETE
  } catch (error) {
    console.error('Error in DELETE /api/session/[sessionId]:', error);
    // Handle potential Prisma errors
    return errorResponse('Internal Server Error deleting session', 500, {
      sessionId: params.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
