import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check if this is a scheduled session we're completing
    const { scheduledSessionId, templateId, scheduledAt, performance, notes, duration } = await request.json();

    // If we have a scheduledSessionId, this is a scheduled session being completed
    if (scheduledSessionId) {
      try {
        // First verify the session belongs to the user
        const existingSession = await prisma.workoutSession.findUnique({
          where: {
            id: scheduledSessionId,
            userId: userId
          }
        });

        if (!existingSession) {
          return new NextResponse(
            JSON.stringify({ error: 'Scheduled session not found or not authorized' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Calculate total volume from performance data
        let sessionTotalVolume = 0;
        if (Array.isArray(performance)) {
          for (const exercise of performance) {
            if (Array.isArray(exercise.sets)) {
              for (const set of exercise.sets) {
                // Only count sets with both weight and reps
                if (set.weight && set.reps) {
                  sessionTotalVolume += set.weight * set.reps;
                }
              }
            }
          }
        }

        // Update the scheduled session to mark it as completed
        const updatedSession = await prisma.workoutSession.update({
          where: {
            id: scheduledSessionId
          },
          data: {
            completedAt: new Date(), // Mark as completed now
            duration: duration,
            notes: notes,
            totalVolume: sessionTotalVolume
            // Note: The Prisma schema doesn't have a performance field
            // We'll need to add that field to the schema if we want to store performance data
          }
        });

        return NextResponse.json(updatedSession);
      } catch (error) {
        console.error('Error completing scheduled session:', error);
        return new NextResponse(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // If we get here, it's a new session (not updating a scheduled one)
    // Original code for creating a new session...
    const isScheduling = scheduledAt !== undefined;

    // Calculate total volume from performance data
    let sessionTotalVolume = 0;
    if (performance && Array.isArray(performance)) {
      performance.forEach(exercise => {
        if (Array.isArray(exercise.sets)) {
          exercise.sets.forEach((set: { reps: number | null; weight: number | null }) => {
            // Only add volume if both reps and weight are positive numbers
            if (set.reps !== null && set.reps > 0 && set.weight !== null && set.weight >= 0) {
              sessionTotalVolume += set.reps * set.weight;
            }
          });
        }
      });
    }

    // Check if the template exists and belongs to this user
    const template = await prisma.workoutTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    });
    
    if (!template) {
      return new NextResponse(JSON.stringify({ error: 'Template not found or not owned by user' }), { status: 404 });
    }

    // For scheduled sessions, we create a session with scheduledAt date
    // For immediate sessions, we create a completed session
    const sessionData = {
      userId: userId,
      workoutTemplateId: templateId,
      // For scheduled sessions, don't include the completedAt field at all
      ...(isScheduling ? {} : { completedAt: new Date() }),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      duration: duration,
      notes: notes,
      totalVolume: isScheduling ? 0 : sessionTotalVolume, // 0 for scheduled sessions
    };

    // --- Use a transaction for creating session AND updating stats --- 
    // Only update stats for immediate sessions, not scheduled ones
    if (isScheduling) {
      // Simply create the session without updating stats
      const newSession = await prisma.workoutSession.create({
        data: sessionData
      });
      
      return NextResponse.json(newSession, { status: 201 });
    } else {
      // For immediate sessions, update stats as before
      const [newSession] = await prisma.$transaction([
          // 1. Create the WorkoutSession record
          prisma.workoutSession.create({
            data: sessionData
          }),

          // 2. Upsert UserStats
          prisma.userStats.upsert({
              where: { userId: userId },
              update: {
                  totalWorkouts: { increment: 1 },
                  totalVolume: { increment: sessionTotalVolume },
                  totalTrainingHours: { increment: duration ? duration / 60 : 0 }, // Convert minutes to hours
                  lastWorkoutAt: new Date(),
                  // Streak calculation is complex, better handled separately or on read
              },
              create: {
                  userId: userId,
                  totalWorkouts: 1,
                  totalVolume: sessionTotalVolume,
                  totalTrainingHours: duration ? duration / 60 : 0, // Convert minutes to hours
                  lastWorkoutAt: new Date(),
                  // Initialize other stats like streak if needed
                  currentStreak: 1, // Assume first workout starts a streak of 1
                  longestStreak: 1,
              }
          }),

          // 3. Upsert MonthlyStats
          prisma.monthlyStats.upsert({
              where: {
                   // Unique constraint: userId_year_month
                   userId_year_month: { 
                      userId: userId,
                      year: new Date().getFullYear(),
                      month: new Date().getMonth() + 1, 
                  }
              },
              update: {
                  workoutsCount: { increment: 1 },
                  volume: { increment: sessionTotalVolume },
                  trainingHours: { increment: duration ? duration / 60 : 0 }, // Convert minutes to hours
              },
              create: {
                  userId: userId,
                  year: new Date().getFullYear(),
                  month: new Date().getMonth() + 1,
                  workoutsCount: 1,
                  volume: sessionTotalVolume,
                  trainingHours: duration ? duration / 60 : 0, // Convert minutes to hours
              }
          })
      ]);

      return NextResponse.json(newSession, { status: 201 });
    }

  } catch (error) {
    console.error('Error in POST /api/session:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET function to fetch session history (for /activity page later)
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Add query params for pagination, filtering by date range etc. later
        // const { searchParams } = new URL(request.url);
        // const page = parseInt(searchParams.get('page') || '1');
        // const limit = parseInt(searchParams.get('limit') || '10');

        const sessions = await prisma.workoutSession.findMany({
            where: { 
                userId,
                // Only include sessions where completedAt is not null (already completed)
                completedAt: {
                    not: undefined,
                }
            },
            orderBy: { completedAt: 'desc' },
            // take: limit,
            // skip: (page - 1) * limit,
            include: {
                // Include template name for display in history
                workoutTemplate: {
                    select: { name: true }
                }
            }
        });

        // TODO: Add count for pagination headers if implementing pagination

        return NextResponse.json(sessions);

    } catch (error) {
        console.error('Error in GET /api/session:', error);
        return new NextResponse(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// DELETE function to delete a specific session by ID
export async function DELETE(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const sessionId = request.url.split('/').pop();
        if (!sessionId) {
            return new NextResponse(JSON.stringify({ error: 'Missing session ID' }), { status: 400 });
        }

        const session = await prisma.workoutSession.findFirst({
            where: {
                id: sessionId,
                userId
            }
        });

        if (!session) {
            return new NextResponse(JSON.stringify({ error: 'Session not found or not owned by user' }), { status: 404 });
        }

        await prisma.workoutSession.delete({
            where: {
                id: sessionId
            }
        });

        return NextResponse.json({ message: 'Session deleted successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error in DELETE /api/session:', error);
        return new NextResponse(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
} 