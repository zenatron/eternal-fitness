import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { getTotalSetsCount, getTemplateExercises } from '@/utils/workoutDisplayUtils';
import { getUserTimeZone } from '@/lib/userTimeZone';
import {
  computeStreakFromHistory,
  getStreakBaseline,
  recordWorkoutCompletion,
} from '@/lib/workout/completion';
import { WorkoutTemplate, WorkoutTemplateData, ExercisePerformance } from '@/types/workout';
import { recomputePerformanceVolume } from '@/lib/volume';
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
import { errorResponse } from '@/lib/api/response';

const ENDPOINT = 'template/complete';

const successResponse = (data: unknown, status = 201) => {
  return NextResponse.json({ data }, { status });
};

const completeTemplateSchema = z.object({
  duration: z.number().int().positive().max(86400).optional(),
  notes: z.string().max(10000).optional(),
  performance: z.record(z.object({
    exerciseKey: z.string(),
    perSide: z.boolean().optional(),
    sets: z.array(z.object({
      setId: z.string(),
      actualReps: z.number().int().nonnegative().max(10000).optional(),
      actualWeight: z.number().nonnegative().max(100000).optional(),
      actualDuration: z.number().positive().max(86400).optional(),
      actualRpe: z.number().min(1).max(10).optional(),
      completed: z.boolean(),
      skipped: z.boolean().optional(),
      notes: z.string().max(2000).optional(),
      restTime: z.number().nonnegative().optional(),
    })),
    exerciseNotes: z.string().max(2000).optional(),
    // Ignored — recomputed server-side from the sets (see lib/volume.ts).
    totalVolume: z.number().optional(),
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

    // Same dedupe contract as the other three completion paths: a replayed
    // offline completion must replay its first response, not log twice.
    const idempotencyKey = getIdempotencyKey(request);
    if (idempotencyKey) {
      const existing = await findIdempotentResponse(userId, idempotencyKey, ENDPOINT);
      if (existing) {
        return successResponse(
          { ...(existing.response as Record<string, unknown>), deduplicated: true }
        );
      }
    }

    const templateResult = await db.transaction(async (tx) => {
      // Claim the key inside the transaction (see claimIdempotencyKey) so a
      // replay racing the first attempt cannot both log a session.
      if (idempotencyKey) {
        const claim = await claimIdempotencyKey(tx, userId, idempotencyKey, ENDPOINT);
        if (claim.status === 'replay') return { kind: 'replay' as const, response: claim.response };
        if (claim.status === 'in-flight') return { kind: 'conflict' as const };
      }

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
      let effectivePerformance: { [exerciseId: string]: ExercisePerformance } = {};

      if (performance) {
        // Volume is recomputed from the sets and the template's own per-side
        // flags — client totals have historically been computed with
        // inconsistent multipliers.
        const recomputed = recomputePerformanceVolume(performance, template.workoutData, {
          fallbackToLibrary: true,
        });
        effectivePerformance = recomputed.performance;
        actualTotalVolume = recomputed.totalVolume;
        completedSets = recomputed.completedSets;
        skippedSets = recomputed.skippedSets;
      }

      const adherenceScore = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 100;

      const performanceData = {
        templateSnapshot: template.workoutData,
        performance: effectivePerformance,
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

      let txNewPRs: any[] = [];
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
          personalRecords: 0,
          performanceData,
        })
        .returning();

      if (Object.keys(effectivePerformance).length > 0) {
        try {
          const prResult = await processWorkoutSessionPRs(userId, createdSession.id, effectivePerformance, template.workoutData, tx);
          txNewPRs = prResult.newPRs;
        } catch (prError) {
          console.error('Error processing PRs:', prError);
        }
      }

      if (txNewPRs.length > 0) {
        // Count, not array — every other writer stores the count in this
        // column and readers assume it.
        await tx
          .update(workoutSessions)
          .set({ personalRecords: txNewPRs.length })
          .where(eq(workoutSessions.id, createdSession.id));
      }

      // Shared with the other two completion routes so the lifetime totals
      // cannot diverge between them again — see lib/workout/completion.ts. This
      // path had the same defect as /api/session/log: it never incremented
      // totalSets or totalExercises.
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
        totals: {
          totalVolume: actualTotalVolume,
          totalSets: completedSets,
          totalExercises: getTemplateExercises(template as WorkoutTemplate).length,
        },
        durationSeconds: duration ?? 0,
        completionTime,
        streak,
      });

      return { kind: 'ok' as const, session: createdSession, txNewPRs };
    });

    if (templateResult.kind === 'replay') {
      return successResponse({ ...(templateResult.response as Record<string, unknown>), deduplicated: true });
    }
    if (templateResult.kind === 'conflict') {
      return errorResponse('A request with this Idempotency-Key is already in progress or has already completed', 409);
    }

    const { session: newSession, txNewPRs } = templateResult;

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
    // session-json) all award base XP plus a per-PR bonus. This one now matches:
    // PRs are processed in the transaction above, so their bonus is owed here.
    let workoutXP = 0;
    try {
      workoutXP = await awardWorkoutXP(userId, { newPRs: txNewPRs.length });
    } catch (xpError) {
      console.error('Error awarding workout XP:', xpError);
    }

    const payload = {
      ...newSession,
      newPRs: txNewPRs,
      workoutXP,
      totalAwarded: workoutXP + achievementPoints,
    };

    if (idempotencyKey) {
      // Stored after the work is done, so a crash mid-request leaves the key
      // unrecorded and the retry genuinely re-runs.
      await recordIdempotentResponse(userId, idempotencyKey, ENDPOINT, payload);
      void pruneIdempotencyKeys();
    }

    return successResponse(payload);
  } catch (error: any) {
    const { templateId } = await params;
    if (error.message === 'TemplateNotFound') {
      return errorResponse('Template not found or access denied', 404, { templateId });
    }
    return errorResponse('Internal Server Error completing template', 500, { templateId, error: error instanceof Error ? error.message : String(error) });
  }
}
