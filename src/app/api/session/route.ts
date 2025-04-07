import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Type expected from the frontend for session performance
type SessionSetPerformanceInput = {
    setId: string; // Original set ID from template (optional, for reference)
    reps: number | null;
    weight: number | null;
};
type SessionExercisePerformanceInput = {
    exerciseName: string;
    sets: SessionSetPerformanceInput[];
};
interface SessionInputData {
    templateId?: string; // Can be undefined if starting blank (not implemented yet)
    duration?: number;
    notes?: string;
    performance?: SessionExercisePerformanceInput[];
    scheduledAt?: string; // Add scheduledAt parameter for scheduled sessions
}


export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body: SessionInputData = await request.json()
    const { templateId, duration, notes, performance, scheduledAt } = body

    // Validation
    if (!templateId) {
       return new NextResponse(JSON.stringify({ error: 'Missing templateId' }), { status: 400 });
    }
    
    // For immediate sessions, require performance data
    // For scheduled sessions, performance data is not required
    const isScheduling = !!scheduledAt;
    if (!isScheduling && (!performance || !Array.isArray(performance) || performance.length === 0)) {
        return new NextResponse(JSON.stringify({ error: 'Missing or empty performance data' }), { status: 400 });
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

    // Calculate total volume for this session (only for completed sessions)
    let sessionTotalVolume = 0;
    if (performance && Array.isArray(performance)) {
      performance.forEach(exercise => {
          exercise.sets.forEach(set => {
              // Only add volume if both reps and weight are positive numbers
              if (set.reps !== null && set.reps > 0 && set.weight !== null && set.weight >= 0) {
                  sessionTotalVolume += set.reps * set.weight;
              }
          });
      });
    }

    // For scheduled sessions, we create a session with scheduledAt date
    // For immediate sessions, we create a completed session
    const sessionData = {
      userId: userId,
      workoutTemplateId: templateId,
      // For scheduled sessions, don't set completedAt (it will be set when the session is completed)
      // For immediate sessions, set completedAt to now
      completedAt: isScheduling ? undefined : new Date(),
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
export async function GET(request: Request) {
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
            where: { userId },
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