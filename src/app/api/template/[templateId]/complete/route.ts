import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { getTotalSetsCount, getTemplateExercises } from '@/utils/workoutDisplayUtils';
import {
  computeStreakFromHistory,
  getStreakBaseline,
  recordWorkoutCompletion,
} from '@/lib/workout/completion';
import { WorkoutTemplate, WorkoutTemplateData, ExercisePerformance } from '@/types/workout';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { awardWorkoutXP } from '@/lib/xp';

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

      // Shared with the other two completion routes so the lifetime totals
      // cannot diverge between them again — see lib/workout/completion.ts. This
      // path had the same defect as /api/session/log: it never incremented
      // totalSets or totalExercises.
      const streak = await computeStreakFromHistory(
        tx,
        userId,
        await getStreakBaseline(tx, userId)
      );

      await recordWorkoutCompletion(tx, {
        userId,
        totals: {
          totalVolume: actualTotalVolume,
          totalSets: completedSets,
          totalExercises: getTemplateExercises(template as WorkoutTemplate).length,
        },
        durationSeconds: duration ?? 0,
        completionTime,
        streak,
      });

      return createdSession;
    });

    let achievementPoints = 0;
    try {
      const exerciseKeys = performance ? Object.values(performance).map(p => p.exerciseKey) : [];
      await updateUniqueExercisesCount(userId, exerciseKeys);
      const achievementResult = await updateUserAchievements(userId);
      achievementPoints = achievementResult.pointsAwarded;
    } catch (achievementError) {
      console.error('Error updating achievements:', achievementError);
    }

    // The other three completion paths (session/active/complete, session/log and
    // session-json) all award base XP. This one did not, so finishing a workout
    // through a template silently earned zero points and left the user's level
    // out of step with their workout count.
    let workoutXP = 0;
    try {
      workoutXP = await awardWorkoutXP(userId, { newPRs: 0 });
    } catch (xpError) {
      console.error('Error awarding workout XP:', xpError);
    }

    return successResponse({
      ...newSession,
      workoutXP,
      totalAwarded: workoutXP + achievementPoints,
    });
  } catch (error: any) {
    const { templateId } = await params;
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, { templateId });
    }
    return errorResponse('Internal Server Error completing template', 500, { templateId, error: error instanceof Error ? error.message : String(error) });
  }
}
