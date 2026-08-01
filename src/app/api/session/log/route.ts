import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  computeStreakFromHistory,
  getStreakBaseline,
  recordWorkoutCompletion,
} from '@/lib/workout/completion';
import { z } from 'zod';
import { performedSetsVolume } from '@/lib/volume';
import { exercises as staticExercisesData } from '@/lib/exercises';
import { createWorkoutTemplate, calculateTemplateVolume } from '@/utils/workoutJsonUtils';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { awardWorkoutXP } from '@/lib/xp';
import { WorkoutType, Difficulty, ExercisePerformance, SetType } from '@/types/workout';

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [session/log]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

const performanceSetSchema = z.object({
  setId: z.string(),
  actualReps: z.number().optional(),
  actualWeight: z.number().optional(),
  actualDuration: z.number().optional(),
  actualDistance: z.number().optional(),
  actualRpe: z.number().optional(),
  completed: z.boolean(),
  skipped: z.boolean().optional(),
  notes: z.string().optional(),
  restTime: z.number().optional(),
});

const performanceSchema = z.record(z.object({
  exerciseKey: z.string(),
  sets: z.array(performanceSetSchema),
  exerciseNotes: z.string().optional(),
  totalVolume: z.number(),
  averageRpe: z.number().optional(),
}));

const adHocExerciseSchema = z.object({
  exerciseKey: z.string().min(1),
  sets: z.array(z.object({
    reps: z.number().int().nonnegative(),
    weight: z.number().nonnegative().optional(),
    duration: z.number().positive().optional(),
    distance: z.number().positive().optional(),
    type: z.string().optional().default('standard'),
    restTime: z.number().positive().optional(),
  })).min(1),
});

const logSessionSchema = z.object({
  templateId: z.string().optional(),
  completedAt: z.string().datetime({ offset: true }),
  duration: z.number().int().positive(),
  notes: z.string().optional(),
  performance: performanceSchema.optional(),
  // For ad-hoc workouts (no templateId)
  adHocName: z.string().optional(),
  adHocWorkoutType: z.string().optional().default('strength'),
  adHocExercises: z.array(adHocExerciseSchema).optional(),
}).refine(
  (data) => data.templateId || (data.adHocExercises && data.adHocExercises.length > 0),
  { message: 'Either templateId or adHocExercises must be provided' }
);

function getExerciseData(exerciseKey: string) {
  const staticData = staticExercisesData[exerciseKey as keyof typeof staticExercisesData];
  if (staticData) {
    return { name: staticData.name, muscles: staticData.muscles, equipment: staticData.equipment };
  }
  return { name: exerciseKey, muscles: [], equipment: [] };
}

function buildPerformanceFromTemplate(templateData: any): { [exerciseId: string]: ExercisePerformance } {
  if (!templateData?.exercises) return {};
  const perf: { [exerciseId: string]: ExercisePerformance } = {};
  for (const ex of templateData.exercises) {
    const sets = (ex.sets || []).map((s: any) => ({
      setId: s.id,
      actualReps: typeof s.targetReps === 'number' ? s.targetReps : (s.targetReps?.min || 0),
      actualWeight: s.targetWeight || 0,
      actualDuration: s.targetDuration,
      actualDistance: s.targetDistance,
      actualRpe: s.targetRpe,
      completed: true,
    }));
    // Per-side comes from the template exercise; absent means ×1, so templates
    // built before this existed keep their previous volume.
    const totalVolume = performedSetsVolume(sets, ex.perSide);
    perf[ex.id] = {
      exerciseKey: ex.exerciseKey,
      perSide: ex.perSide,
      sets,
      totalVolume,
    };
  }
  return perf;
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const validationResult = logSessionSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('Invalid input', 400, validationResult.error.errors);
    }

    const { templateId, completedAt, duration, notes, performance, adHocName, adHocWorkoutType, adHocExercises } = validationResult.data;
    const completionTime = new Date(completedAt);
    let templateData: any = null;

    const newSession = await db.transaction(async (tx) => {
      let resolvedTemplateId: string | null = templateId || null;

      if (templateId) {
        const [template] = await tx
          .select()
          .from(workoutTemplates)
          .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));

        if (!template) throw new Error('TemplateNotFound');
        templateData = template.workoutData;
      } else if (adHocExercises) {
        const exercisesWithData = adHocExercises.map((ex) => {
          const data = getExerciseData(ex.exerciseKey);
          return {
            exerciseKey: ex.exerciseKey,
            name: data.name,
            muscles: data.muscles,
            equipment: data.equipment,
            sets: ex.sets.map(s => ({
              ...s,
              type: (s.type || 'standard') as SetType,
            })),
          };
        });

        templateData = createWorkoutTemplate(
          adHocName || 'Quick Workout',
          exercisesWithData,
          { workoutType: (adHocWorkoutType as WorkoutType) || WorkoutType.STRENGTH, difficulty: Difficulty.INTERMEDIATE }
        );
        resolvedTemplateId = null;
      }

      // When no explicit performance is provided (ad-hoc), synthesize it from template data
      // so that achievement tracking and PR detection have actual values to work with
      let effectivePerformance: { [exerciseId: string]: ExercisePerformance } = performance || {};
      if (Object.keys(effectivePerformance).length === 0 && templateData?.exercises) {
        effectivePerformance = buildPerformanceFromTemplate(templateData);
      }

      let totalVolume = 0;
      let completedSets = 0;
      let totalSets = 0;
      let totalExercises = 0;
      let skippedSets = 0;

      if (Object.keys(effectivePerformance).length > 0) {
        totalVolume = Object.values(effectivePerformance).reduce((t, ep) => t + ep.totalVolume, 0);
        completedSets = Object.values(effectivePerformance).reduce(
          (t, ep) => t + ep.sets.filter(s => s.completed).length, 0
        );
        totalSets = Object.values(effectivePerformance).reduce((t, ep) => t + ep.sets.length, 0);
        totalExercises = Object.keys(effectivePerformance).length;
        skippedSets = Object.values(effectivePerformance).reduce(
          (t, ep) => t + ep.sets.filter(s => s.skipped).length, 0
        );
      } else if (templateData) {
        totalVolume = calculateTemplateVolume(templateData.exercises || []);
        totalSets = (templateData.exercises || []).reduce(
          (t: number, ex: any) => t + (ex.sets?.length || 0), 0
        );
        completedSets = totalSets;
        totalExercises = (templateData.exercises || []).length;
      }

      const adherenceScore = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 100;

      const performanceData = {
        templateSnapshot: templateData,
        performance: effectivePerformance,
        metrics: {
          totalVolume,
          totalSets,
          totalExercises,
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
          workoutTemplateId: resolvedTemplateId,
          completedAt: completionTime,
          duration,
          notes,
          totalVolume,
          totalSets: completedSets,
          totalExercises,
          personalRecords: 0,
          performanceData,
        })
        .returning();

      // Recomputed from full history rather than incrementally: a workout
      // inserted into the past can bridge a gap between two existing days.
      const streak = await computeStreakFromHistory(
        tx,
        userId,
        await getStreakBaseline(tx, userId)
      );

      await recordWorkoutCompletion(tx, {
        userId,
        totals: { totalVolume, totalSets: completedSets, totalExercises },
        durationSeconds: duration,
        completionTime,
        streak,
      });

      return createdSession;
    });

    // Process PRs outside transaction
    let newPRs: any[] = [];
    const sessionPerf = (newSession.performanceData as any)?.performance;
    if (sessionPerf && Object.keys(sessionPerf).length > 0 && templateData) {
      try {
        const prResult = await processWorkoutSessionPRs(
          userId,
          newSession.id,
          sessionPerf as { [k: string]: ExercisePerformance },
          templateData,
        );
        newPRs = prResult.newPRs;
        if (newPRs.length > 0) {
          await db
            .update(workoutSessions)
            .set({ personalRecords: newPRs.length })
            .where(eq(workoutSessions.id, newSession.id));
        }
      } catch (prError) {
        console.error('Error processing PRs for logged session:', prError);
      }
    }

    // Update achievements outside transaction
    let achievementResult = { newAchievements: [] as string[], totalAchievements: 0, pointsAwarded: 0, progress: {} as Record<string, number> };
    try {
      const exerciseKeys = sessionPerf ? Object.values(sessionPerf).map((p: any) => p.exerciseKey) : [];
      await updateUniqueExercisesCount(userId, exerciseKeys);
      achievementResult = await updateUserAchievements(userId);
    } catch (achievementError) {
      console.error('Error updating achievements for logged session:', achievementError);
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
        session: newSession,
        achievements: achievementResult,
        newPRs,
        workoutXP,
        totalAwarded,
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404);
    }
    return errorResponse('Internal Server Error logging session', 500, error instanceof Error ? error.message : String(error));
  }
}
