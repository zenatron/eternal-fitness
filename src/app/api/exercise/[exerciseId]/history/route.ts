import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions, userStats } from '@/lib/db/schema';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import type { WorkoutSessionData, PerformedSet } from '@/types/workout';
import type { UserPersonalRecords, ExercisePR } from '@/types/personalRecords';
import { canonicalExerciseKey, exerciseDisplayName, resolveExercise } from '@/lib/exerciseLookup';
import { bestOneRepMax } from '@/utils/oneRepMax';

const successResponse = (data: unknown, status = 200) => NextResponse.json({ data }, { status });
const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: { message } }, { status });

/**
 * Full history for one exercise.
 *
 * The sibling `last-performance` route answers "what did I do last time" for
 * many exercises at once. This answers "how has this lift moved over time" for
 * one — the question a training log exists to answer, and the one the app had
 * no way to ask.
 *
 * GET /api/exercise/:exerciseId/history?limit=200
 */

/**
 * Sessions scanned. Deliberately much larger than the 30 last-performance uses:
 * a trend is the point here, and a lifter training four times a week covers
 * about a year at this bound.
 */
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export interface ExerciseHistoryPoint {
  sessionId: string;
  performedAt: string;
  /** Best estimated 1RM in the session; null for cardio and high-rep work. */
  oneRepMax: number | null;
  /** The set the estimate came from, so the number is attributable. */
  bestSet: { weight: number; reps: number } | null;
  heaviest: number;
  volume: number;
  sets: number;
  totalReps: number;
  duration: number;
  distance: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { exerciseId } = await params;
    // Callers arrive with slugs, display names and raw keys; normalise so all
    // three resolve to the same history.
    const key = canonicalExerciseKey(decodeURIComponent(exerciseId));

    const requested = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(requested, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const [sessions, stats] = await Promise.all([
      db
        .select({
          id: workoutSessions.id,
          completedAt: workoutSessions.completedAt,
          performanceData: workoutSessions.performanceData,
        })
        .from(workoutSessions)
        .where(and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)))
        .orderBy(desc(workoutSessions.completedAt))
        .limit(limit),
      db
        .select({ personalRecords: userStats.personalRecords })
        .from(userStats)
        .where(eq(userStats.userId, userId)),
    ]);

    const history: ExerciseHistoryPoint[] = [];

    for (const session of sessions) {
      const data = session.performanceData as WorkoutSessionData | null;
      if (!data?.performance) continue;

      for (const entry of Object.values(data.performance)) {
        if (canonicalExerciseKey(entry.exerciseKey ?? '') !== key) continue;

        const done = (entry.sets ?? []).filter(
          (set: PerformedSet) => set.completed && !set.skipped
        );
        if (done.length === 0) continue;

        const best = bestOneRepMax(done);

        history.push({
          sessionId: session.id,
          performedAt: (session.completedAt ?? new Date()).toISOString(),
          oneRepMax: best?.oneRepMax ?? null,
          bestSet: best ? { weight: best.weight, reps: best.reps } : null,
          heaviest: done.reduce((m, s) => Math.max(m, s.actualWeight ?? 0), 0),
          volume: entry.totalVolume ?? 0,
          sets: done.length,
          totalReps: done.reduce((t, s) => t + (s.actualReps ?? 0), 0),
          duration: done.reduce((t, s) => t + (s.actualDuration ?? 0), 0),
          distance: done.reduce((t, s) => t + (s.actualDistance ?? 0), 0),
        });
      }
    }

    // Oldest first: every consumer is a chart, and charts read left to right.
    history.reverse();

    const records: UserPersonalRecords = (stats[0]?.personalRecords as UserPersonalRecords) ?? {};
    const displayName = exerciseDisplayName(key);
    // PRs are keyed by display name, which is what the write path stores.
    const exercisePR: ExercisePR = records[displayName] ?? records[key] ?? {};
    const meta = resolveExercise(key);

    return successResponse({
      exerciseKey: key,
      name: displayName,
      muscles: meta?.muscles ?? [],
      equipment: meta?.equipment ?? [],
      exerciseType: meta?.exerciseType ?? 'strength',
      personalRecords: exercisePR,
      history,
      // The scan is bounded, so say so rather than implying this is everything.
      truncated: sessions.length === limit,
    });
  } catch (error) {
    console.error('Failed to load exercise history:', error);
    return errorResponse('Failed to load exercise history', 500);
  }
}
