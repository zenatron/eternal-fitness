import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserTimeZone } from '@/lib/userTimeZone';
import {
  computeStreakFromHistory,
  getStreakBaseline,
  recordWorkoutCompletion,
} from '@/lib/workout/completion';
import { z } from 'zod';
import { performedSetsVolume, recomputePerformanceVolume } from '@/lib/volume';
import { exercises as staticExercisesData } from '@/lib/exercises';
import { createWorkoutTemplate, calculateTemplateVolume } from '@/utils/workoutJsonUtils';
import { processWorkoutSessionPRs } from '@/utils/personalRecords';
import { updateUserAchievements, updateUniqueExercisesCount } from '@/lib/achievements';
import { awardWorkoutXP } from '@/lib/xp';
import {
  findIdempotentResponse,
  claimIdempotencyKey,
  getIdempotencyKey,
  pruneIdempotencyKeys,
  recordIdempotentResponse,
} from '@/lib/idempotency';
import { WorkoutType, Difficulty, ExercisePerformance, SetType } from '@/types/workout';
import type { ExercisePerformanceInput } from '@/types/workout';
import { errorResponse } from '@/lib/api/response';

const ENDPOINT = 'session/log';

const performanceSetSchema = z.object({
  setId: z.string(),
  actualReps: z.number().int().nonnegative().max(10000).optional(),
  actualWeight: z.number().nonnegative().max(100000).optional(),
  actualDuration: z.number().nonnegative().max(86400).optional(),
  actualDistance: z.number().nonnegative().max(1000000).optional(),
  actualRpe: z.number().min(1).max(10).optional(),
  completed: z.boolean(),
  skipped: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  restTime: z.number().nonnegative().optional(),
});

const performanceSchema = z.record(z.object({
  exerciseKey: z.string(),
  perSide: z.boolean().optional(),
  sets: z.array(performanceSetSchema),
  exerciseNotes: z.string().max(2000).optional(),
  // Accepted for backwards compatibility and then ignored: the server
  // recomputes volume from the sets (see recomputePerformanceVolume), because
  // client totals have historically been computed with inconsistent per-side
  // multipliers.
  totalVolume: z.number().optional(),
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
  duration: z.number().int().positive().max(86400),
  notes: z.string().max(10000).optional(),
  performance: performanceSchema.optional(),
  // For ad-hoc workouts (no templateId)
  adHocName: z.string().max(120).optional(),
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
    // A future timestamp would anchor the streak on a day that hasn't happened
    // and park volume in a future monthly bucket. Small skew (±5 min) is
    // tolerated for client clocks.
    if (completionTime.getTime() > Date.now() + 5 * 60 * 1000) {
      return errorResponse('completedAt cannot be in the future', 400);
    }
    let templateData: any = null;

    // Offline replays carry an Idempotency-Key; a replayed retro-log would
    // double-count volume, streaks and XP exactly like a live completion.
    const idempotencyKey = getIdempotencyKey(request);
    if (idempotencyKey) {
      const existing = await findIdempotentResponse(userId, idempotencyKey, ENDPOINT);
      if (existing) {
        return NextResponse.json({
          data: { ...(existing.response as Record<string, unknown>), deduplicated: true },
        }, { status: 201 });
      }
    }

    const txResult = await db.transaction(async (tx) => {
      // Claim the key inside the transaction so a replay racing the first
      // attempt cannot both run the write (see claimIdempotencyKey).
      if (idempotencyKey) {
        const claim = await claimIdempotencyKey(tx, userId, idempotencyKey, ENDPOINT);
        if (claim.status === 'replay') return { kind: 'replay' as const, response: claim.response };
        if (claim.status === 'in-flight') return { kind: 'conflict' as const };
      }

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
      let effectivePerformance: { [exerciseId: string]: ExercisePerformance } = {};
      const clientPerformance: { [exerciseId: string]: ExercisePerformanceInput } = performance || {};
      if (Object.keys(clientPerformance).length > 0) {
        effectivePerformance = clientPerformance as { [exerciseId: string]: ExercisePerformance };
      } else if (templateData?.exercises) {
        effectivePerformance = buildPerformanceFromTemplate(templateData);
      }

      // Volume is recomputed from the sets, never taken from the client: the
      // retro-log page used to send bare reps×weight, halving dumbbell volume
      // relative to the live path. The per-side flag resolves from the entry,
      // the template snapshot, or the library (fresh writes only).
      const recomputed = recomputePerformanceVolume(effectivePerformance, templateData, {
        fallbackToLibrary: true,
      });
      effectivePerformance = recomputed.performance;

      let totalVolume = recomputed.totalVolume;
      let completedSets = recomputed.completedSets;
      let totalSets = recomputed.totalSets;
      let totalExercises = recomputed.totalExercises;
      const skippedSets = recomputed.skippedSets;

      if (totalExercises === 0 && templateData) {
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
      const timeZone = await getUserTimeZone(userId, tx);
      const streak = await computeStreakFromHistory(
        tx,
        userId,
        timeZone,
        await getStreakBaseline(tx, userId)
      );

      await recordWorkoutCompletion(tx, {
        userId,
        timeZone,
        totals: { totalVolume, totalSets: completedSets, totalExercises },
        durationSeconds: duration,
        completionTime,
        streak,
      });

      return { kind: 'ok' as const, session: createdSession };
    });

    if (txResult.kind === 'replay') {
      return NextResponse.json(
        { data: { ...(txResult.response as Record<string, unknown>), deduplicated: true } },
        { status: 201 }
      );
    }
    if (txResult.kind === 'conflict') {
      return errorResponse('A request with this Idempotency-Key is already in progress or has already completed', 409);
    }
    const newSession = txResult.session;

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
          undefined,
          completionTime,
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

    const payload = {
      session: newSession,
      achievements: achievementResult,
      newPRs,
      workoutXP,
      totalAwarded,
    };

    if (idempotencyKey) {
      // Stored after the work is done, so a crash mid-request leaves the key
      // unrecorded and the retry genuinely re-runs.
      await recordIdempotentResponse(userId, idempotencyKey, ENDPOINT, payload);
      void pruneIdempotencyKeys();
    }

    return NextResponse.json({ data: payload }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404);
    }
    return errorResponse('Internal Server Error logging session', 500, error instanceof Error ? error.message : String(error));
  }
}
