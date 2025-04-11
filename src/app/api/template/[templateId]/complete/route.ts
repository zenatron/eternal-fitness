import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 201) => {
  // 201 for creating session
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [template/{id}/complete]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

// --- Zod Schema for POST Request ---
const completeTemplateSchema = z.object({
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  // Add performance data schema here if needed
});

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { templateId } = params;
    let body = {}; // Default to empty object if no body is expected/sent
    try {
      // Try to parse body, but allow empty body
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Ignore JSON parse error if body is empty or malformed, Zod will catch it
    }

    // Validate request body (even if empty)
    const validationResult = completeTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const { duration, notes } = validationResult.data;

    // --- Transaction ---
    const newSession = await prisma.$transaction(async (tx) => {
      // 1. Fetch the template, verify ownership, and get totalVolume
      const template = await tx.workoutTemplate.findUnique({
        where: { id: templateId, userId },
        select: { id: true, totalVolume: true }, // Need totalVolume
      });

      if (!template) {
        throw new Error('TemplateNotFound');
      }

      const completionTime = new Date();
      const sessionTotalVolume = template.totalVolume;

      // 2. Create the WorkoutSession record
      const createdSession = await tx.workoutSession.create({
        data: {
          userId: userId,
          workoutTemplateId: templateId,
          completedAt: completionTime,
          duration: duration,
          notes: notes,
          totalVolume: sessionTotalVolume,
          scheduledAt: null, // Not scheduled
        },
        include: { workoutTemplate: { select: { name: true } } },
      });

      // 3. Update UserStats
      await tx.userStats.upsert({
        where: { userId: userId },
        update: {
          totalWorkouts: { increment: 1 },
          totalVolume: { increment: sessionTotalVolume },
          totalTrainingHours: { increment: duration ? duration / 60 : 0 },
          lastWorkoutAt: completionTime,
        },
        create: {
          userId: userId,
          totalWorkouts: 1,
          totalVolume: sessionTotalVolume,
          totalTrainingHours: duration ? duration / 60 : 0,
          lastWorkoutAt: completionTime,
          currentStreak: 1,
          longestStreak: 1,
        },
      });

      // 4. Update MonthlyStats
      const currentYear = completionTime.getFullYear();
      const currentMonth = completionTime.getMonth() + 1;
      await tx.monthlyStats.upsert({
        where: {
          userId_year_month: { userId, year: currentYear, month: currentMonth },
        },
        update: {
          workoutsCount: { increment: 1 },
          volume: { increment: sessionTotalVolume },
          trainingHours: { increment: duration ? duration / 60 : 0 },
        },
        create: {
          userId,
          year: currentYear,
          month: currentMonth,
          workoutsCount: 1,
          volume: sessionTotalVolume,
          trainingHours: duration ? duration / 60 : 0,
        },
      });

      return createdSession;
    }); // End Transaction

    return successResponse(newSession);
  } catch (error: any) {
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, {
        templateId: params.templateId,
      });
    }

    console.error(`Error completing template ${params.templateId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code);
    }
    return errorResponse('Internal Server Error completing template', 500, {
      templateId: params.templateId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
