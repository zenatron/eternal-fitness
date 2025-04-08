import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SessionUpdateData {
  duration?: number;
  notes?: string;
  completedAt?: string;
  scheduledAt?: string | null;
}

// GET a specific session by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const sessionId = (await params).sessionId;

    const session = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId
      },
      include: {
        workoutTemplate: {
          select: { name: true }
        }
      }
    });

    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Session not found or not owned by user' }), { status: 404 });
    }

    return NextResponse.json(session);

  } catch (error) {
    console.error('Error in GET /api/session/[sessionId]:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT (update) a session
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const sessionId = (await params).sessionId;
    const body: SessionUpdateData = await request.json();
    const { duration, notes, completedAt, scheduledAt } = body;

    // Verify session exists and belongs to the user
    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId
      }
    });

    if (!existingSession) {
      return new NextResponse(JSON.stringify({ error: 'Session not found or not owned by user' }), { status: 404 });
    }

    // Update the session
    const updatedSession = await prisma.workoutSession.update({
      where: {
        id: sessionId
      },
      data: {
        ...(duration !== undefined && { duration }),
        ...(notes !== undefined && { notes }),
        ...(completedAt && scheduledAt === null ? { completedAt: new Date(completedAt) } : {}),
        ...(scheduledAt === null ? { scheduledAt: null } : scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
      }
    });

    return NextResponse.json(updatedSession);

  } catch (error) {
    console.error('Error in PUT /api/session/[sessionId]:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE a session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const sessionId = (await params).sessionId;

    // Verify session exists and belongs to the user
    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId
      }
    });

    if (!existingSession) {
      return new NextResponse(JSON.stringify({ error: 'Session not found or not owned by user' }), { status: 404 });
    }

    // Delete the session
    await prisma.workoutSession.delete({
      where: {
        id: sessionId
      }
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Error in DELETE /api/session/[sessionId]:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 