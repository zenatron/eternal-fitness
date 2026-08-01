import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions, userStats, monthlyStats } from '@/lib/db/schema';
import { eq, and, isNotNull, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  createWorkoutSession,
  validateWorkoutSession,
  calculateExerciseVolume,
} from '@/utils/workoutJsonUtils';
import { WorkoutTemplateData, ExercisePerformance } from '@/types/workout';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { awardWorkoutXP } from '@/lib/xp';

/**
 * Normalizes client-supplied performance data into full ExercisePerformance
 * objects, computing per-exercise totalVolume server-side from the sets so we
 * never trust a client-provided volume.
 */
function normalizePerformance(
  performance: Record<string, z.infer<typeof exercisePerformanceSchema>>,
): { [exerciseId: string]: ExercisePerformance } {
  const normalized: { [exerciseId: string]: ExercisePerformance } = {};
  for (const [exerciseId, ep] of Object.entries(performance)) {
    normalized[exerciseId] = { ...ep, totalVolume: calculateExerciseVolume(ep.sets) };
  }
  return normalized;
}

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [session-json/]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Updates userStats (with streak) and monthlyStats after a session is completed.
 * `duration` is in SECONDS, matching the canonical workoutSessions.duration unit.
 * This mirrors the logic in session/active/complete and session/log so every
 * completion path contributes to lifetime + monthly rollups identically.
 */
async function recordCompletionStats(
  tx: Tx,
  userId: string,
  completionTime: Date,
  duration: number | undefined,
  metrics: { totalVolume: number; totalSets: number; totalExercises: number },
) {
  const trainingHours = duration ? duration / 3600 : 0;

  // Streak — fetch current values then compute against the completion date.
  let newStreak = 1;
  let newLongestStreak = 1;
  const [streakData] = await tx
    .select({
      currentStreak: userStats.currentStreak,
      longestStreak: userStats.longestStreak,
      lastWorkoutAt: userStats.lastWorkoutAt,
    })
    .from(userStats)
    .where(eq(userStats.userId, userId));

  if (streakData) {
    if (streakData.lastWorkoutAt) {
      const lastDate = new Date(streakData.lastWorkoutAt);
      const today = new Date(completionTime);
      lastDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        newStreak = Math.max(1, streakData.currentStreak);
      } else if (diffDays === 1) {
        newStreak = streakData.currentStreak + 1;
      }
    }
    newLongestStreak = Math.max(streakData.longestStreak, newStreak);
  }

  await tx
    .insert(userStats)
    .values({
      userId,
      totalWorkouts: 1,
      totalVolume: metrics.totalVolume,
      totalSets: metrics.totalSets,
      totalExercises: metrics.totalExercises,
      totalTrainingHours: trainingHours,
      lastWorkoutAt: completionTime,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        totalWorkouts: sql`${userStats.totalWorkouts} + 1`,
        totalVolume: sql`${userStats.totalVolume} + ${metrics.totalVolume}`,
        totalSets: sql`${userStats.totalSets} + ${metrics.totalSets}`,
        totalExercises: sql`${userStats.totalExercises} + ${metrics.totalExercises}`,
        totalTrainingHours: sql`${userStats.totalTrainingHours} + ${trainingHours}`,
        lastWorkoutAt: completionTime,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
      },
    });

  // Upsert monthly stats for the completion month.
  const completionYear = completionTime.getFullYear();
  const completionMonth = completionTime.getMonth() + 1;
  await tx
    .insert(monthlyStats)
    .values({
      userId,
      year: completionYear,
      month: completionMonth,
      workoutsCount: 1,
      volume: metrics.totalVolume,
      trainingHours,
    })
    .onConflictDoUpdate({
      target: [monthlyStats.userId, monthlyStats.year, monthlyStats.month],
      set: {
        workoutsCount: sql`${monthlyStats.workoutsCount} + 1`,
        volume: sql`${monthlyStats.volume} + ${metrics.totalVolume}`,
        trainingHours: sql`${monthlyStats.trainingHours} + ${trainingHours}`,
      },
    });
}

const performedSetSchema = z.object({
  setId: z.string(),
  actualReps: z.number().int().nonnegative().optional(),
  actualWeight: z.number().nonnegative().optional(),
  actualDuration: z.number().positive().optional(),
  actualDistance: z.number().positive().optional(),
  actualRpe: z.number().min(1).max(10).optional(),
  restTime: z.number().nonnegative().optional(),
  completed: z.boolean(),
  skipped: z.boolean().optional(),
  notes: z.string().optional(),
  failurePoint: z.enum(['form', 'strength', 'endurance', 'time']).optional(),
  assistanceUsed: z.boolean().optional(),
  technique: z.enum(['good', 'fair', 'poor']).optional(),
});

const exercisePerformanceSchema = z.object({
  exerciseKey: z.string(),
  sets: z.array(performedSetSchema),
  exerciseNotes: z.string().optional(),
  performanceRating: z.number().min(1).max(5).optional(),
  difficultyRating: z.number().min(1).max(5).optional(),
});

const environmentDataSchema = z.object({
  location: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  weather: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  crowdLevel: z.enum(['empty', 'light', 'moderate', 'busy', 'packed']).optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  sleepQuality: z.number().min(1).max(10).optional(),
  stressLevel: z.number().min(1).max(10).optional(),
  nutrition: z.object({
    preWorkoutMeal: z.string().optional(),
    hydration: z.number().optional(),
    supplements: z.array(z.string()).optional(),
  }).optional(),
});

const createSessionSchema = z.object({
  templateId: z.string(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  performance: z.record(z.string(), exercisePerformanceSchema).optional(),
  environment: environmentDataSchema.optional(),
});

const completeScheduledSessionSchema = z.object({
  scheduledSessionId: z.string(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional(),
  performance: z.record(z.string(), exercisePerformanceSchema),
  environment: environmentDataSchema.optional(),
});

const postSessionSchema = z.union([createSessionSchema, completeScheduledSessionSchema]);

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = postSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid session data', 400, validationResult.error.errors);
    }

    const validatedData = validationResult.data;

    if ('scheduledSessionId' in validatedData) {
      return await completeScheduledSession(userId, validatedData);
    } else {
      return await createNewSession(userId, validatedData);
    }
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

async function createNewSession(userId: string, data: z.infer<typeof createSessionSchema>) {
  const { templateId, scheduledAt, duration, notes, performance, environment } = data;
  const isScheduling = !!scheduledAt;

  const [template] = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
      workoutData: workoutTemplates.workoutData,
      totalVolume: workoutTemplates.totalVolume,
      estimatedDuration: workoutTemplates.estimatedDuration,
    })
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

  if (!template) {
    return errorResponse('Template not found or not owned by user', 404, { templateId });
  }

  const templateData = template.workoutData as WorkoutTemplateData;

  if (isScheduling) {
    const [newSession] = await db
      .insert(workoutSessions)
      .values({
        userId,
        workoutTemplateId: templateId,
        notes,
        duration,
        totalVolume: 0,
        totalSets: 0,
        totalExercises: 0,
        personalRecords: 0,
        scheduledAt: new Date(scheduledAt!),
        performanceData: {
          templateSnapshot: templateData,
          performance: {},
          metrics: {
            totalVolume: 0, totalSets: 0, totalExercises: 0,
            completedSets: 0, skippedSets: 0,
            personalRecords: [], volumeRecords: [], adherenceScore: 0,
          },
          environment,
        },
      })
      .returning();

    return successResponse(newSession, 201);
  } else {
    if (!performance) {
      return errorResponse('Performance data required for completed session', 400);
    }

    const normalizedPerformance = normalizePerformance(performance);
    const sessionData = createWorkoutSession(templateData, normalizedPerformance);
    if (!validateWorkoutSession(sessionData)) {
      return errorResponse('Invalid workout session structure', 500);
    }

    const completionTime = new Date();

    const newSession = await db.transaction(async (tx) => {
      const [session] = await tx
        .insert(workoutSessions)
        .values({
          userId,
          workoutTemplateId: templateId,
          notes,
          duration,
          totalVolume: sessionData.metrics.totalVolume,
          totalSets: sessionData.metrics.totalSets,
          totalExercises: sessionData.metrics.totalExercises,
          personalRecords: sessionData.metrics.personalRecords.length,
          completedAt: completionTime,
          performanceData: sessionData,
        })
        .returning();

      try {
        await processWorkoutSessionPRs(userId, session.id, normalizedPerformance, templateData);
      } catch (error) {
        console.error('Error processing PRs:', error);
      }

      await recordCompletionStats(tx, userId, completionTime, duration, {
        totalVolume: sessionData.metrics.totalVolume,
        totalSets: sessionData.metrics.totalSets,
        totalExercises: sessionData.metrics.totalExercises,
      });

      return session;
    });

    return successResponse(newSession, 201);
  }
}

async function completeScheduledSession(userId: string, data: z.infer<typeof completeScheduledSessionSchema>) {
  const { scheduledSessionId, duration, notes, performance, environment } = data;

  const scheduledSession = await db.query.workoutSessions.findFirst({
    where: and(
      eq(workoutSessions.id, scheduledSessionId),
      eq(workoutSessions.userId, userId),
    ),
    with: {
      workoutTemplate: {
        columns: { workoutData: true, name: true },
      },
    },
  });

  if (!scheduledSession || scheduledSession.completedAt) {
    return errorResponse('Scheduled session not found or already completed', 404, { scheduledSessionId });
  }

  const templateData = scheduledSession.workoutTemplate!.workoutData as WorkoutTemplateData;
  const normalizedPerformance = normalizePerformance(performance);
  const sessionData = createWorkoutSession(templateData, normalizedPerformance);

  if (!validateWorkoutSession(sessionData)) {
    return errorResponse('Invalid workout session structure', 500);
  }

  if (environment) sessionData.environment = environment;

  const completionTime = new Date();

  const updatedSession = await db.transaction(async (tx) => {
    const [session] = await tx
      .update(workoutSessions)
      .set({
        completedAt: completionTime,
        duration,
        notes,
        totalVolume: sessionData.metrics.totalVolume,
        totalSets: sessionData.metrics.totalSets,
        totalExercises: sessionData.metrics.totalExercises,
        personalRecords: sessionData.metrics.personalRecords.length,
        performanceData: sessionData,
      })
      .where(eq(workoutSessions.id, scheduledSessionId))
      .returning();

    await recordCompletionStats(tx, userId, completionTime, duration, {
      totalVolume: sessionData.metrics.totalVolume,
      totalSets: sessionData.metrics.totalSets,
      totalExercises: sessionData.metrics.totalExercises,
    });

    return session;
  });

  // Process PRs outside transaction
  let newPRs: any[] = [];
  try {
    const prResult = await processWorkoutSessionPRs(
      userId,
      updatedSession.id,
      normalizedPerformance,
      templateData,
    );
    newPRs = prResult.newPRs;
    if (newPRs.length > 0) {
      await db
        .update(workoutSessions)
        .set({ personalRecords: newPRs.length })
        .where(eq(workoutSessions.id, updatedSession.id));
    }
  } catch (prError) {
    console.error('Error processing PRs for scheduled session:', prError);
  }

  // Update achievements
  let achievementResult = { newAchievements: [] as string[], totalAchievements: 0, pointsAwarded: 0, progress: {} as Record<string, number> };
  try {
    const exerciseKeys = Object.values(normalizedPerformance).map(p => p.exerciseKey);
    await updateUniqueExercisesCount(userId, exerciseKeys);
    achievementResult = await updateUserAchievements(userId);
  } catch (achievementError) {
    console.error('Error updating achievements for scheduled session:', achievementError);
  }

  // Award workout XP
  let workoutXP = 100;
  try {
    workoutXP = await awardWorkoutXP(userId, { newPRs: newPRs.length });
  } catch (xpError) {
    console.error('Error awarding workout XP:', xpError);
  }

  const totalAwarded = achievementResult.pointsAwarded + workoutXP;

  return NextResponse.json({
    data: {
      session: updatedSession,
      achievements: achievementResult,
      newPRs,
      workoutXP,
      totalAwarded,
    },
  }, { status: 200 });
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const sessions = await db.query.workoutSessions.findMany({
      where: and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)),
      orderBy: desc(workoutSessions.completedAt),
      with: {
        workoutTemplate: {
          columns: { id: true, name: true },
        },
      },
    });

    return successResponse(sessions);
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}
