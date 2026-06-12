import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions, userStats, monthlyStats } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getTotalSetsCount } from '@/utils/workoutDisplayUtils';
import { WorkoutTemplate, WorkoutTemplateData, ExercisePerformance } from '@/types/workout';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';

const successResponse = (data: unknown, status = 201) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [template/{id}/complete]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { templateId } = await params;
    let body = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {}

    const validationResult = completeTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const { duration, notes, performance } = validationResult.data;

    const newSession = await db.transaction(async (tx) => {
      const [template] = await tx
        .select({
          id: workoutTemplates.id,
          totalVolume: workoutTemplates.totalVolume,
          workoutData: workoutTemplates.workoutData,
          exerciseCount: workoutTemplates.exerciseCount,
        })
        .from(workoutTemplates)
        .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

      if (!template) throw new Error('TemplateNotFound');
      if (!template.workoutData) throw new Error('TemplateDataMissing');

      const completionTime = new Date();
      const plannedVolume = template.totalVolume;
      const totalSets = getTotalSetsCount(template as WorkoutTemplate);

      let actualTotalVolume = plannedVolume;
      let completedSets = totalSets;
      let skippedSets = 0;

      if (performance) {
        actualTotalVolume = Object.values(performance).reduce((total, ep) => total + ep.totalVolume, 0);
        completedSets = Object.values(performance).reduce((total, ep) => total + ep.sets.filter(s => s.completed).length, 0);
        skippedSets = Object.values(performance).reduce((total, ep) => total + ep.sets.filter(s => s.skipped).length, 0);
      }

      const adherenceScore = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 100;

      const performanceData = {
        templateSnapshot: template.workoutData,
        performance: performance || {},
        metrics: {
          totalVolume: actualTotalVolume,
          totalSets,
          totalExercises: template.exerciseCount || 0,
          completedSets,
          skippedSets,
          personalRecords: [],
          volumeRecords: [],
          adherenceScore,
        },
        environment: {},
      };

      const [createdSession] = await tx
        .insert(workoutSessions)
        .values({
          userId,
          workoutTemplateId: templateId,
          completedAt: completionTime,
          duration,
          notes,
          totalVolume: actualTotalVolume,
          totalSets: completedSets,
          totalExercises: template.exerciseCount || 0,
          personalRecords: [],
          performanceData,
        })
        .returning();

      if (performance && Object.keys(performance).length > 0) {
        try {
          await processWorkoutSessionPRs(userId, createdSession.id, performance, template.workoutData);
        } catch (prError) {
          console.error('Error processing PRs:', prError);
        }
      }

      // Upsert user stats with streak calculation
      const [existingStats] = await tx
        .select({
          currentStreak: userStats.currentStreak,
          longestStreak: userStats.longestStreak,
          lastWorkoutAt: userStats.lastWorkoutAt,
        })
        .from(userStats)
        .where(eq(userStats.userId, userId));

      let newStreak = 1;
      let newLongestStreak = 1;

      if (existingStats) {
        const lastWorkout = existingStats.lastWorkoutAt;
        if (lastWorkout) {
          const lastDate = new Date(lastWorkout);
          const today = new Date(completionTime);
          // Compare calendar dates (strip time)
          lastDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            newStreak = Math.max(1, existingStats.currentStreak);
          } else if (diffDays === 1) {
            // Consecutive day - increment streak
            newStreak = existingStats.currentStreak + 1;
          }
          // else diffDays > 1, streak resets to 1
        }
        newLongestStreak = Math.max(existingStats.longestStreak, newStreak);
      }

      await tx
        .insert(userStats)
        .values({
          userId,
          totalWorkouts: 1,
          totalVolume: actualTotalVolume,
          totalTrainingHours: duration ? duration / 3600 : 0,
          lastWorkoutAt: completionTime,
          currentStreak: 1,
          longestStreak: 1,
        })
        .onConflictDoUpdate({
          target: userStats.userId,
          set: {
            totalWorkouts: sql`${userStats.totalWorkouts} + 1`,
            totalVolume: sql`${userStats.totalVolume} + ${actualTotalVolume}`,
            totalTrainingHours: sql`${userStats.totalTrainingHours} + ${duration ? duration / 3600 : 0}`,
            lastWorkoutAt: completionTime,
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
          },
        });

      // Upsert monthly stats
      const currentYear = completionTime.getFullYear();
      const currentMonth = completionTime.getMonth() + 1;
      await tx
        .insert(monthlyStats)
        .values({
          userId,
          year: currentYear,
          month: currentMonth,
          workoutsCount: 1,
          volume: actualTotalVolume,
          trainingHours: duration ? duration / 3600 : 0,
        })
        .onConflictDoUpdate({
          target: [monthlyStats.userId, monthlyStats.year, monthlyStats.month],
          set: {
            workoutsCount: sql`${monthlyStats.workoutsCount} + 1`,
            volume: sql`${monthlyStats.volume} + ${actualTotalVolume}`,
            trainingHours: sql`${monthlyStats.trainingHours} + ${duration ? duration / 3600 : 0}`,
          },
        });

      return createdSession;
    });

    try {
      const exerciseKeys = performance ? Object.values(performance).map(p => p.exerciseKey) : [];
      await updateUniqueExercisesCount(userId, exerciseKeys);
      const achievementResult = await updateUserAchievements(userId);

    } catch (achievementError) {
      console.error('Error updating achievements:', achievementError);
    }

    return successResponse(newSession);
  } catch (error: any) {
    const { templateId } = await params;
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, { templateId });
    }
    return errorResponse('Internal Server Error completing template', 500, { templateId, error: error instanceof Error ? error.message : String(error) });
  }
}
