import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutTemplates, workoutSessions } from '@/lib/db/schema';
import { getUserTimeZone } from '@/lib/userTimeZone';
import {
  computeStreakFromHistory,
  getStreakBaseline,
  recordWorkoutCompletion,
} from '@/lib/workout/completion';
import { eq, and, isNotNull, isNull, desc } from 'drizzle-orm';
import { z } from 'zod';
import { errorResponse, parseLimitParam, successResponse } from '@/lib/api/response';
import { buildBeforeCursorFilter, encodeBeforeCursor } from '@/lib/api/pagination';
import {
  createWorkoutSession,
  validateWorkoutSession,
} from '@/utils/workoutJsonUtils';
import { recomputePerformanceVolume } from '@/lib/volume';
import { snapshotNameSql } from '@/lib/sessionName';
import { WorkoutTemplateData, ExercisePerformance } from '@/types/workout';
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

const ENDPOINT = 'session-json';

/**
 * Normalizes client-supplied performance data into full ExercisePerformance
 * objects, computing per-exercise totalVolume server-side from the sets so we
 * never trust a client-provided volume — and resolving the per-side multiplier
 * from the flag, the template snapshot, or (last resort, fresh writes only) the
 * exercise library, so dumbbell volume matches the live path.
 */
function normalizePerformance(
  performance: Record<string, z.infer<typeof exercisePerformanceSchema>>,
  templateData?: WorkoutTemplateData | null
): { [exerciseId: string]: ExercisePerformance } {
  return recomputePerformanceVolume(performance, templateData, {
    fallbackToLibrary: true,
  }).performance;
}

const performedSetSchema = z.object({
  setId: z.string(),
  actualReps: z.number().int().nonnegative().optional(),
  actualWeight: z.number().nonnegative().optional(),
  actualDuration: z.number().nonnegative().optional(),
  actualDistance: z.number().nonnegative().optional(),
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
  perSide: z.boolean().optional(),
  sets: z.array(performedSetSchema),
  exerciseNotes: z.string().max(2000).optional(),
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

    // Offline clients stamp every replayed mutation with an Idempotency-Key.
    // This route both schedules sessions and logs completed workouts — a replay
    // of either creates a duplicate row, so both branches are covered.
    const idempotencyKey = getIdempotencyKey(request);
    if (idempotencyKey) {
      const existing = await findIdempotentResponse(userId, idempotencyKey, ENDPOINT);
      if (existing) {
        return successResponse(
          { ...(existing.response as Record<string, unknown>), deduplicated: true }
        );
      }
    }

    const response =
      'scheduledSessionId' in validatedData
        ? await completeScheduledSession(userId, validatedData, idempotencyKey)
        : await createNewSession(userId, validatedData, idempotencyKey);

    if (idempotencyKey && response.status < 400) {
      // Stored only after the work succeeded, so a crash mid-request leaves the
      // key unrecorded and the retry genuinely re-runs.
      await recordIdempotentResponse(
        userId,
        idempotencyKey,
        ENDPOINT,
        await response.clone().json()
      );
      void pruneIdempotencyKeys();
    }

    return response;
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

async function createNewSession(userId: string, data: z.infer<typeof createSessionSchema>, idempotencyKey: string | null) {
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
    // Scheduling has no natural transaction, so the key claim gets its own:
    // the claim row commits immediately, and a replay hits `replay` below.
    if (idempotencyKey) {
      const claim = await db.transaction((tx) => claimIdempotencyKey(tx, userId, idempotencyKey, ENDPOINT));
      if (claim.status === 'replay') {
        return successResponse({ ...(claim.response as Record<string, unknown>), deduplicated: true }, 201);
      }
      if (claim.status === 'in-flight') {
        return errorResponse('A request with this Idempotency-Key is already in progress or has already completed', 409);
      }
    }
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

    const normalizedPerformance = normalizePerformance(performance, templateData);
    const sessionData = createWorkoutSession(templateData, normalizedPerformance);
    if (!validateWorkoutSession(sessionData)) {
      return errorResponse('Invalid workout session structure', 500);
    }

    const completionTime = new Date();

    const newSession = await db.transaction(async (tx) => {
      if (idempotencyKey) {
        const claim = await claimIdempotencyKey(tx, userId, idempotencyKey, ENDPOINT);
        if (claim.status === 'replay') {
          return { kind: 'replay' as const, response: claim.response };
        }
        if (claim.status === 'in-flight') {
          return { kind: 'conflict' as const };
        }
      }
      const [session] = await tx
        .insert(workoutSessions)
        .values({
          userId,
          workoutTemplateId: templateId,
          notes,
          duration,
          totalVolume: sessionData.metrics.totalVolume,
          // Completed, not attempted — the convention shared with the live and
          // retro-log paths (see WorkoutTotals in lib/workout/completion.ts).
          totalSets: sessionData.metrics.completedSets,
          totalExercises: sessionData.metrics.totalExercises,
          personalRecords: sessionData.metrics.personalRecords.length,
          completedAt: completionTime,
          performanceData: sessionData,
        })
        .returning();

      try {
        await processWorkoutSessionPRs(userId, session.id, normalizedPerformance, templateData, tx, completionTime);
      } catch (error) {
        console.error('Error processing PRs:', error);
      }

      const timeZone = await getUserTimeZone(userId, tx);

      await recordWorkoutCompletion(tx, {
        userId,
        timeZone,
        totals: {
          totalVolume: sessionData.metrics.totalVolume,
          totalSets: sessionData.metrics.completedSets,
          totalExercises: sessionData.metrics.totalExercises,
        },
        durationSeconds: duration ?? 0,
        completionTime,
        streak: await computeStreakFromHistory(
          tx,
          userId,
          timeZone,
          await getStreakBaseline(tx, userId)
        ),
      });

      return { kind: 'ok' as const, session };
    });

    if (newSession.kind === 'replay') {
      return successResponse({ ...(newSession.response as Record<string, unknown>), deduplicated: true }, 201);
    }
    if (newSession.kind === 'conflict') {
      return errorResponse('A request with this Idempotency-Key is already in progress or has already completed', 409);
    }

    return successResponse(newSession.session, 201);
  }
}

async function completeScheduledSession(userId: string, data: z.infer<typeof completeScheduledSessionSchema>, idempotencyKey: string | null) {
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

  // The snapshot taken at scheduling time is the fallback if the template has
  // since lost its data; the non-null assertion here used to 500.
  const templateData = (scheduledSession.workoutTemplate?.workoutData ??
    (scheduledSession.performanceData as { templateSnapshot?: WorkoutTemplateData } | null)?.templateSnapshot) as
    WorkoutTemplateData | undefined;
  if (!templateData) {
    return errorResponse('This scheduled session has no workout attached', 409, { scheduledSessionId });
  }
  const normalizedPerformance = normalizePerformance(performance, templateData);
  const sessionData = createWorkoutSession(templateData, normalizedPerformance);

  if (!validateWorkoutSession(sessionData)) {
    return errorResponse('Invalid workout session structure', 500);
  }

  if (environment) sessionData.environment = environment;

  const completionTime = new Date();

  const updatedSession = await db.transaction(async (tx) => {
    // Claim the key inside the transaction (see claimIdempotencyKey): a replay
    // racing the first attempt previously passed the pre-flight read on both
    // sides and double-counted the workout.
    if (idempotencyKey) {
      const claim = await claimIdempotencyKey(tx, userId, idempotencyKey, ENDPOINT);
      if (claim.status === 'replay') return { kind: 'replay' as const, response: claim.response };
      if (claim.status === 'in-flight') return { kind: 'conflict' as const };
    }

    // The completed check must be part of the write, not just the earlier
    // read: two concurrent completions (double-tap, two devices, a replay
    // racing the first attempt) both passed the pre-check and double-counted
    // the workout. An empty update result means we lost the race — report it
    // as 409 so the client's outbox drops the entry instead of retrying.
    const claimed = await tx
      .update(workoutSessions)
      .set({ completedAt: completionTime })
      .where(and(eq(workoutSessions.id, scheduledSessionId), isNull(workoutSessions.completedAt)))
      .returning({ id: workoutSessions.id });
    if (claimed.length === 0) {
      return { kind: 'lost-race' as const };
    }

    const [session] = await tx
      .update(workoutSessions)
      .set({
        duration,
        notes,
        totalVolume: sessionData.metrics.totalVolume,
        totalSets: sessionData.metrics.completedSets,
        totalExercises: sessionData.metrics.totalExercises,
        personalRecords: sessionData.metrics.personalRecords.length,
        performanceData: sessionData,
      })
      .where(eq(workoutSessions.id, scheduledSessionId))
      .returning();

    const timeZone = await getUserTimeZone(userId, tx);

    await recordWorkoutCompletion(tx, {
      userId,
      timeZone,
      totals: {
        totalVolume: sessionData.metrics.totalVolume,
        totalSets: sessionData.metrics.completedSets,
        totalExercises: sessionData.metrics.totalExercises,
      },
      durationSeconds: duration ?? 0,
      completionTime,
      streak: await computeStreakFromHistory(
        tx,
        userId,
        timeZone,
        await getStreakBaseline(tx, userId)
      ),
    });

    return { kind: 'ok' as const, session };
  });

  if (updatedSession.kind === 'replay') {
    return NextResponse.json(
      { data: { ...(updatedSession.response as Record<string, unknown>), deduplicated: true } },
      { status: 200 }
    );
  }
  if (updatedSession.kind === 'conflict') {
    return errorResponse('A request with this Idempotency-Key is already in progress or has already completed', 409);
  }
  if (updatedSession.kind === 'lost-race') {
    return errorResponse('Scheduled session already completed', 409, { scheduledSessionId });
  }

  const session = updatedSession.session;

  // Process PRs outside transaction
  let newPRs: any[] = [];
  try {
    const prResult = await processWorkoutSessionPRs(
      userId,
      session.id,
      normalizedPerformance,
      templateData,
      undefined,
      session.completedAt ?? undefined,
    );
    newPRs = prResult.newPRs;
    if (newPRs.length > 0) {
      await db
        .update(workoutSessions)
        .set({ personalRecords: newPRs.length })
        .where(eq(workoutSessions.id, session.id));
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
      session,
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

    // Keyset-paginated, projected list of completed sessions. performanceData
    // is deliberately excluded: it embeds the full template snapshot per row
    // and dominates the payload — set-level detail belongs to the
    // single-session endpoint (GET /api/session/[sessionId]).
    const { searchParams } = new URL(request.url);
    const limit = parseLimitParam(searchParams.get('limit'));
    const before = searchParams.get('before');

    const sessions = await db.query.workoutSessions.findMany({
      columns: {
        id: true,
        completedAt: true,
        scheduledAt: true,
        duration: true,
        notes: true,
        totalVolume: true,
        totalSets: true,
        totalExercises: true,
        personalRecords: true,
        workoutTemplateId: true,
      },
      extras: { snapshotName: snapshotNameSql.as('snapshot_name') },
      where: and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.completedAt),
        buildBeforeCursorFilter(before, workoutSessions.completedAt, workoutSessions.id)
      ),
      // Ties on completedAt are real (a completion and its retro-log land in
      // the same transaction), so the keyset is (completedAt, id) — a cursor
      // on the timestamp alone would skip a row whenever it tied.
      orderBy: [desc(workoutSessions.completedAt), desc(workoutSessions.id)],
      limit,
      with: {
        workoutTemplate: {
          columns: { id: true, name: true },
        },
      },
    });

    // A full page implies there may be more; hand back the cursor the client
    // passes as `before` to fetch the next page. The client treats this as an
    // opaque string, so the format can evolve.
    const last = sessions.length === limit ? sessions[sessions.length - 1] : null;
    const nextCursor =
      last && last.completedAt ? encodeBeforeCursor(last.completedAt, last.id) : null;

    return successResponse({ sessions, nextCursor });
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}
