import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getTotalSetsCount } from '@/utils/workoutDisplayUtils';
import { WorkoutTemplate } from '@/types/workout';

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
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { templateId } = await params;
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
      // 1. Fetch the template, verify ownership, and get required data
      const template = await tx.workoutTemplate.findUnique({
        where: { id: templateId, userId },
        select: {
          id: true,
          totalVolume: true,
          workoutData: true,
          exerciseCount: true
        },
      });

      if (!template) {
        throw new Error('TemplateNotFound');
      }

      const completionTime = new Date();
      const sessionTotalVolume = template.totalVolume;

      // 2. Create the WorkoutSession record with required performanceData
      const templateData = template.workoutData;
      const totalSets = getTotalSetsCount(template as WorkoutTemplate);

      // Create basic performance data structure for the completed session
      const performanceData = {
        templateSnapshot: templateData,
        performance: {}, // Empty performance data since we don't track detailed performance in this simple completion
        metrics: {
          totalVolume: sessionTotalVolume,
          totalSets: totalSets,
          totalExercises: template.exerciseCount || 0,
          completedSets: totalSets, // Assume all sets completed for simple completion
          skippedSets: 0,
          personalRecords: [],
          volumeRecords: [],
          adherenceScore: 100, // Assume 100% adherence for simple completion
        },
        environment: {},
      };

      const createdSession = await tx.workoutSession.create({
        data: {
          userId: userId,
          workoutTemplateId: templateId,
          completedAt: completionTime,
          duration: duration,
          notes: notes,
          totalVolume: sessionTotalVolume,
          totalSets: totalSets,
          totalExercises: template.exerciseCount || 0,
          averageRpe: null,
          personalRecords: 0,
          scheduledAt: null, // Not scheduled
          performanceData: performanceData as any, // Prisma Json type
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
    const { templateId } = await params;
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, {
        templateId,
      });
    }

    console.error(`Error completing template ${templateId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code);
    }
    return errorResponse('Internal Server Error completing template', 500, {
      templateId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
