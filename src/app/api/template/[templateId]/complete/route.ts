import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getTotalSetsCount } from '@/utils/workoutDisplayUtils';
import { WorkoutTemplate, WorkoutTemplateData } from '@/types/workout';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { createApiHandler, createValidatedApiHandler } from '@/lib/api-utils';

// --- Zod Schema for POST Request ---
const completeTemplateSchema = z.object({
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  performance: z.record(z.object({
    exerciseKey: z.string(),
    sets: z.array(z.object({
      setId: z.string(),
      actualReps: z.number().optional(),
      actualWeight: z.number().optional(),
      actualDuration: z.number().optional(),
      actualRpe: z.number().optional(),
      completed: z.boolean(),
      skipped: z.boolean().optional(),
      notes: z.string().optional(),
      restTime: z.number().optional(),
    })),
    exerciseNotes: z.string().optional(),
    totalVolume: z.number(),
    averageRpe: z.number().optional(),
  })).optional(),
});

export const POST = createValidatedApiHandler(
  completeTemplateSchema,
  async (userId, { duration, notes, performance }, request, params) => {
    const { templateId } = params;

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
      const totalSets = getTotalSetsCount(template as any);

      // Create performance data structure for the completed session
      let actualTotalVolume = sessionTotalVolume;
      let completedSets = totalSets;
      let skippedSets = 0;

      if (performance) {
        // Calculate actual metrics from performance data
        actualTotalVolume = Object.values(performance).reduce((total, exercisePerf) => total + exercisePerf.totalVolume, 0);
        completedSets = Object.values(performance).reduce((total, exercisePerf) =>
          total + exercisePerf.sets.filter(set => set.completed).length, 0);
        skippedSets = Object.values(performance).reduce((total, exercisePerf) =>
          total + exercisePerf.sets.filter(set => set.skipped).length, 0);
      }

      const adherenceScore = totalSets > 0 ? Math.round(((completedSets + skippedSets) / totalSets) * 100) : 100;

      const performanceData = {
        templateSnapshot: templateData,
        performance: performance || {}, // Use provided performance data or empty object
        metrics: {
          totalVolume: actualTotalVolume,
          totalSets: totalSets,
          totalExercises: template.exerciseCount || 0,
          completedSets: completedSets,
          skippedSets: skippedSets,
          personalRecords: [], // TODO: Calculate PRs from performance data
          volumeRecords: [], // TODO: Calculate volume records
          adherenceScore: adherenceScore,
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
          totalVolume: actualTotalVolume,
          totalSets: completedSets,
          totalExercises: template.exerciseCount || 0,
          personalRecords: [], // Empty array for PRs
          scheduledAt: null, // Not scheduled
          performanceData: performanceData as any, // Prisma Json type
        },
        include: { workoutTemplate: { select: { name: true } } },
      });

      // 3. Process Personal Records if performance data is available
      if (performance && Object.keys(performance).length > 0) {
        try {
          await processWorkoutSessionPRs(userId, createdSession.id, performance, templateData as unknown as WorkoutTemplateData);
        } catch (prError) {
          console.error('Error processing PRs:', prError);
          // Don't fail the entire transaction for PR processing errors
        }
      }

      // 4. Update UserStats
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

      // 5. Update MonthlyStats
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

    // Update achievements after successful workout completion
    try {
      // Extract exercise keys from performance data
      const exerciseKeys = performance ? Object.values(performance).map(p => p.exerciseKey) : [];

      // Update unique exercises count
      await updateUniqueExercisesCount(userId, exerciseKeys);

      // Update achievements
      const achievementResult = await updateUserAchievements(userId);

      if (achievementResult.newAchievements.length > 0) {
        console.log(`🏆 User ${userId} unlocked ${achievementResult.newAchievements.length} new achievements:`, achievementResult.newAchievements);
      }
    } catch (achievementError) {
      console.error('Error updating achievements:', achievementError);
      // Don't fail the workout completion for achievement errors
    }

    return newSession;
  }
);
