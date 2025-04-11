import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from 'zod';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(`API Error (${status}) [session/]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: { message, ...(details && { details }) } }, { status });
};

const createSessionSchema = z.object({
  templateId: z.string().cuid(), // Ensure it's a CUID if that's your ID format
  scheduledAt: z.string().datetime({ offset: true }).optional(), // For scheduling a session
  duration: z.number().int().positive().optional(), // Duration in minutes
  notes: z.string().optional(),
  // 'performance' is complex, might be better handled separately or validated loosely here
  // For now, let's assume it's optional and an array of objects if provided
  performance: z.array(z.any()).optional(), // Looser validation for performance structure
  // OR more strict:
  // performance: z.array(performanceExerciseSchema).optional(),
});

const completeScheduledSessionSchema = z.object({
  scheduledSessionId: z.string().cuid(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  performance: z.array(z.any()).optional(), // Looser validation for performance structure
});

// Combined schema to handle both creation and completion based on presence of scheduledSessionId
const postSessionSchema = z.union([
  createSessionSchema,
  completeScheduledSessionSchema,
]);

// --- Helper Function to Calculate Volume ---
function calculateTotalVolume(performance: any[] | undefined): number {
  let totalVolume = 0;
  if (!performance || !Array.isArray(performance)) {
    return 0;
  }
  performance.forEach((exercise) => {
    if (exercise && Array.isArray(exercise.sets)) {
      exercise.sets.forEach((set: any) => {
        // Validate set structure loosely here
        const reps = typeof set.reps === 'number' && set.reps > 0 ? set.reps : 0;
        const weight = typeof set.weight === 'number' && set.weight >= 0 ? set.weight : 0;
        if (reps > 0 && weight >= 0) { // Allow 0 weight
          totalVolume += reps * weight;
        }
      });
    }
  });
  return totalVolume;
}


// POST function: Create a new session OR complete a scheduled one
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body = await request.json();

    // Validate the request body against the combined schema
    const validationResult = postSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    // --- Determine if completing a scheduled session or creating a new one ---
    if ('scheduledSessionId' in validatedData) {
      // --- Complete Scheduled Session --- 
      const { scheduledSessionId, duration, notes, performance } = validatedData;
      const sessionTotalVolume = calculateTotalVolume(performance);

      try {
        const completedSession = await prisma.$transaction(async (tx) => {
          // 1. Verify the session exists, belongs to the user, and is actually scheduled
          const existingSession = await tx.workoutSession.findUnique({
            where: {
              id: scheduledSessionId,
              userId: userId,
            },
            select: { id: true, scheduledAt: true, completedAt: true }
          });

          if (!existingSession) {
            throw new Error('Scheduled session not found or not authorized');
          }
          if (!existingSession.scheduledAt) {
            throw new Error('Session was not scheduled');
          }
          if (existingSession.completedAt) {
            throw new Error('Session already completed');
          }

          const completionTime = new Date();

          // 2. Update the session to mark as completed
          const updatedSession = await tx.workoutSession.update({
            where: {
              id: scheduledSessionId,
            },
            data: {
              completedAt: completionTime,
              duration: duration,
              notes: notes,
              totalVolume: sessionTotalVolume,
              // Potentially store performance data here if schema is updated
            },
            include: { workoutTemplate: { select: { name: true } } } // Include needed data
          });

          // 3. Update UserStats
          await tx.userStats.upsert({
            where: { userId: userId },
            update: {
              totalWorkouts: { increment: 1 },
              totalVolume: { increment: sessionTotalVolume },
              totalTrainingHours: { increment: duration ? duration / 60 : 0 },
              lastWorkoutAt: completionTime,
              // Add streak update logic here if desired
            },
            create: {
              userId: userId,
              totalWorkouts: 1,
              totalVolume: sessionTotalVolume,
              totalTrainingHours: duration ? duration / 60 : 0,
              lastWorkoutAt: completionTime,
              currentStreak: 1, // Initial streak
              longestStreak: 1,
            },
          });

          // 4. Update MonthlyStats
          const currentYear = completionTime.getFullYear();
          const currentMonth = completionTime.getMonth() + 1;
          await tx.monthlyStats.upsert({
            where: { userId_year_month: { userId, year: currentYear, month: currentMonth } },
            update: {
              workoutsCount: { increment: 1 },
              volume: { increment: sessionTotalVolume },
              trainingHours: { increment: duration ? duration / 60 : 0 },
            },
            create: {
              userId, year: currentYear, month: currentMonth,
              workoutsCount: 1,
              volume: sessionTotalVolume,
              trainingHours: duration ? duration / 60 : 0,
            },
          });

          return updatedSession;
        }); // End Transaction

        return successResponse(completedSession); // Return the completed session data

      } catch (error: any) {
        // Handle specific errors thrown from transaction
        if (error.message?.includes('not found') || error.message?.includes('not authorized')) {
          return errorResponse(error.message, 404, { scheduledSessionId });
        } else if (error.message?.includes('not scheduled') || error.message?.includes('already completed')) {
          return errorResponse(error.message, 409); // Conflict
        }
        console.error("Error completing scheduled session:", error);
        return errorResponse('Error completing session', 500, error instanceof Error ? error.message : String(error));
      }

    } else {
      // --- Create New Session (Immediate or Scheduled) ---
      const { templateId, scheduledAt, duration, notes, performance } = validatedData;
      const isScheduling = !!scheduledAt;
      const sessionTotalVolume = isScheduling ? 0 : calculateTotalVolume(performance);

      try {
        // Verify the template exists and belongs to the user
        const template = await prisma.workoutTemplate.findFirst({
          where: { id: templateId, userId },
          select: { id: true }, // Only need ID
        });

        if (!template) {
          return errorResponse('Template not found or not owned by user', 404, { templateId });
        }

        if (isScheduling) {
          // Just create the scheduled session
          const newSession = await prisma.workoutSession.create({
            data: {
              user: { connect: { id: userId } },
              workoutTemplate: { connect: { id: templateId } },
              notes: notes,
              duration: duration,
              totalVolume: sessionTotalVolume,
              scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
              completedAt: null,
            },
            include: { workoutTemplate: { select: { name: true } } }
          });
          return successResponse(newSession, 201);
        } else {
          // Create immediate session AND update stats in a transaction
          const completionTime = new Date(); // Define completionTime here as a Date object
          const sessionData: Prisma.WorkoutSessionCreateInput = {
            user: { connect: { id: userId } },
            workoutTemplate: { connect: { id: templateId } },
            notes: notes,
            duration: duration,
            totalVolume: sessionTotalVolume,
            scheduledAt: null, // Explicitly null for immediate session
            completedAt: completionTime, // Assign the Date object
          };

          const [newSession] = await prisma.$transaction([
            prisma.workoutSession.create({
              data: sessionData, // Use the prepared data
              include: { workoutTemplate: { select: { name: true } } } 
            }),
            prisma.userStats.upsert({
              where: { userId: userId },
              update: {
                totalWorkouts: { increment: 1 },
                totalVolume: { increment: sessionTotalVolume },
                totalTrainingHours: { increment: duration ? duration / 60 : 0 },
                lastWorkoutAt: completionTime, // Now definitely a Date
              },
              create: {
                userId: userId,
                totalWorkouts: 1,
                totalVolume: sessionTotalVolume,
                totalTrainingHours: duration ? duration / 60 : 0,
                lastWorkoutAt: completionTime, // Now definitely a Date
                currentStreak: 1,
                longestStreak: 1,
              },
            }),
            prisma.monthlyStats.upsert({
              where: {
                userId_year_month: {
                  userId: userId,
                  year: completionTime.getFullYear(), // Safe: completionTime is Date
                  month: completionTime.getMonth() + 1,    // Safe: completionTime is Date
                },
              },
              update: {
                workoutsCount: { increment: 1 },
                volume: { increment: sessionTotalVolume },
                trainingHours: { increment: duration ? duration / 60 : 0 },
              },
              create: {
                userId: userId,
                year: completionTime.getFullYear(), // Safe: completionTime is Date
                month: completionTime.getMonth() + 1,    // Safe: completionTime is Date
                workoutsCount: 1,
                volume: sessionTotalVolume,
                trainingHours: duration ? duration / 60 : 0,
              },
            }),
          ]);
          return successResponse(newSession, 201);
        }
      } catch (error) {
        console.error("Error creating session:", error);
        return errorResponse('Error creating session', 500, error instanceof Error ? error.message : String(error));
      }
    }

  } catch (error) {
    console.error("General Error in POST /api/session:", error);
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

// GET function to fetch COMPLETED session history
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // TODO: Implement pagination and date filtering later if needed
    // const { searchParams } = new URL(request.url);
    // const page = parseInt(searchParams.get('page') || '1');
    // const limit = parseInt(searchParams.get('limit') || '10');
    // const startDate = searchParams.get('startDate');
    // const endDate = searchParams.get('endDate');

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        // Only fetch sessions that are actually completed
        completedAt: {
          not: null, // Use null check instead of undefined
        },
        // Add date range filtering here if startDate/endDate params exist
      },
      orderBy: { completedAt: "desc" },
      // take: limit,
      // skip: (page - 1) * limit,
      include: {
        workoutTemplate: {
          select: { id: true, name: true }, // Include ID and name
        },
        // Include other relations if necessary for history display
      },
    });

    // TODO: Add total count for pagination headers if implemented
    // const totalCount = await prisma.workoutSession.count({ where: { userId, completedAt: { not: null } } });

    return successResponse(sessions);

  } catch (error) {
    console.error("Error in GET /api/session (history):", error);
    return errorResponse('Internal Server Error fetching session history', 500, error instanceof Error ? error.message : String(error));
  }
}

// DELETE function (Deprecated in favor of DELETE /api/session/[sessionId])
/*
export async function DELETE(request: Request) {
  // ... previous DELETE logic ...
  // This logic is now handled by the DELETE /api/session/[sessionId] route
  // It's better practice to delete specific resources via their ID.
  // Consider removing this handler entirely.
  return errorResponse('Method Not Allowed', 405, { message: 'Use DELETE /api/session/[sessionId] instead' });
}
*/