import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions } from '@/lib/db/schema';
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import type { WorkoutSessionData, PerformedSet } from '@/types/workout';
import { canonicalExerciseKey } from '@/lib/exerciseLookup';

const successResponse = (data: unknown, status = 200) =>
  NextResponse.json({ data }, { status });

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: { message } }, { status });

/**
 * What the user did last time, per exercise.
 *
 * Progressive overload is the whole point of a training log, and it is
 * impossible to apply if you cannot remember what you lifted last week. This
 * feeds the "last time" reference shown against each set, and the prefill for
 * a fresh workout.
 *
 * GET /api/exercise/last-performance?keys=Bench%20Press,Squat
 */

/**
 * How many recent sessions to scan. The performance blob is large, so this is
 * bounded rather than scanning a full history — an exercise not trained within
 * this window has no useful "last time" to show anyway.
 */
const SESSION_SCAN_LIMIT = 30;

export interface LastPerformance {
  exerciseKey: string;
  performedAt: string;
  sets: {
    reps?: number;
    weight?: number;
    duration?: number;
    distance?: number;
    rpe?: number;
  }[];
  bestWeight?: number;
  totalVolume: number;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const keysParam = request.nextUrl.searchParams.get('keys');
    if (!keysParam) return successResponse({ performances: {} });

    // Normalise up front so slug-keyed and display-name-keyed callers agree.
    const requestedKeys = keysParam
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean)
      .map(canonicalExerciseKey);

    if (requestedKeys.length === 0) return successResponse({ performances: {} });

    const wanted = new Set(requestedKeys);

    const sessions = await db
      .select({
        completedAt: workoutSessions.completedAt,
        performanceData: workoutSessions.performanceData,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          isNotNull(workoutSessions.completedAt)
        )
      )
      .orderBy(desc(workoutSessions.completedAt))
      .limit(SESSION_SCAN_LIMIT);

    const performances: Record<string, LastPerformance> = {};

    // Newest first, so the first hit for an exercise is the most recent one.
    for (const session of sessions) {
      if (wanted.size === 0) break;

      const data = session.performanceData as WorkoutSessionData | null;
      if (!data?.performance) continue;

      for (const entry of Object.values(data.performance)) {
        const key = canonicalExerciseKey(entry.exerciseKey ?? '');
        if (!wanted.has(key)) continue;

        const completedSets = (entry.sets ?? []).filter(
          (set: PerformedSet) => set.completed && !set.skipped
        );
        if (completedSets.length === 0) continue;

        performances[key] = {
          exerciseKey: key,
          performedAt: (session.completedAt ?? new Date()).toISOString(),
          sets: completedSets.map((set: PerformedSet) => ({
            reps: set.actualReps,
            weight: set.actualWeight,
            duration: set.actualDuration,
            distance: set.actualDistance,
            rpe: set.actualRpe,
          })),
          bestWeight: completedSets.reduce(
            (max: number, set: PerformedSet) => Math.max(max, set.actualWeight ?? 0),
            0
          ),
          totalVolume: entry.totalVolume ?? 0,
        };

        // Found the latest for this exercise; stop looking for it.
        wanted.delete(key);
      }
    }

    return successResponse({ performances });
  } catch (error) {
    console.error('Failed to load last performance:', error);
    return errorResponse('Failed to load previous performance', 500);
  }
}
