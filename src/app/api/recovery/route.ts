import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions } from '@/lib/db/schema';
import { and, desc, eq, gte, isNotNull } from 'drizzle-orm';
import type { WorkoutSessionData } from '@/types/workout';
import { computeRegionLoad, type LoadedExercise, type RegionLoad } from '@/utils/muscleLoad';

const successResponse = (data: unknown, status = 200) => NextResponse.json({ data }, { status });
const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: { message } }, { status });

/**
 * Per-region training load for recent sessions.
 *
 * Returns the *events* rather than a finished recovery map, deliberately.
 * Freshness is a function of elapsed time, so a server-computed snapshot starts
 * going stale the moment it is sent — a user who leaves the page open would
 * watch a frozen number. The decay maths is trivial, so the client recomputes
 * it against the current clock and the payload stays cacheable.
 *
 * GET /api/recovery?days=14
 */

/**
 * How far back to look. Anything older has decayed to a rounding error even for
 * the slowest-recovering region — at a 30h half-life, 14 days leaves 0.03% of
 * the original load.
 */
const DEFAULT_DAYS = 14;
const MAX_DAYS = 30;

export interface RecoveryLoadEvent {
  sessionId: string;
  at: string;
  load: RegionLoad;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const requested = Number.parseInt(request.nextUrl.searchParams.get('days') ?? '', 10);
    const days = Number.isFinite(requested)
      ? Math.min(Math.max(requested, 1), MAX_DAYS)
      : DEFAULT_DAYS;

    const since = new Date(Date.now() - days * 24 * 3_600_000);

    const sessions = await db
      .select({
        id: workoutSessions.id,
        completedAt: workoutSessions.completedAt,
        // Only the performance blob is needed; the template snapshot in the same
        // column is far larger and irrelevant here.
        performance: workoutSessions.performanceData,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          isNotNull(workoutSessions.completedAt),
          gte(workoutSessions.completedAt, since)
        )
      )
      .orderBy(desc(workoutSessions.completedAt));

    const events: RecoveryLoadEvent[] = [];

    for (const session of sessions) {
      const data = session.performance as WorkoutSessionData | null;
      if (!data?.performance) continue;

      const exercises: LoadedExercise[] = Object.values(data.performance).map((entry) => ({
        exerciseKey: entry.exerciseKey ?? '',
        sets: entry.sets ?? [],
      }));

      const load = computeRegionLoad(exercises);
      // A session that trained nothing recognisable adds nothing to the map.
      if (Object.values(load).every((v) => v === 0)) continue;

      events.push({
        sessionId: session.id,
        at: (session.completedAt ?? new Date()).toISOString(),
        load,
      });
    }

    return successResponse({ events, days });
  } catch (error) {
    console.error('Failed to compute recovery load:', error);
    return errorResponse('Failed to load recovery data', 500);
  }
}
