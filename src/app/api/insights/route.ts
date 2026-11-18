import { NextRequest } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions } from '@/lib/db/schema';
import { and, asc, eq, gte, isNotNull, sql } from 'drizzle-orm';
import type { ExercisePerformance } from '@/types/workout';
import { errorResponse, successResponse } from '@/lib/api/response';
import { getUserTimeZone } from '@/lib/userTimeZone';
import { addDays, dayKeyOf, startOfDayInZone, todayKey } from '@/utils/datetime';
import { buildStrengthInsights, type InsightSession } from '@/utils/strengthInsights';

/**
 * Strength trends per exercise and per muscle, plus weekly sets per muscle.
 *
 * GET /api/insights?period=90d|180d|1y|all
 *
 * The maths lives in utils/strengthInsights.ts; this route only reads the
 * sessions and turns their timestamps into civil days in the user's zone, so a
 * Sunday-night session lands in the week the user thinks it did.
 */

const PERIOD_DAYS = { '90d': 90, '180d': 180, '1y': 365 } as const;
type Period = keyof typeof PERIOD_DAYS | 'all';

function parsePeriod(value: string | null): Period {
  return value === 'all' || (value && value in PERIOD_DAYS) ? (value as Period) : '90d';
}

/** Same bound as /api/progress: far past a real history, short of unbounded. */
const SESSION_LIMIT = 2000;

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const period = parsePeriod(request.nextUrl.searchParams.get('period'));
    const timeZone = await getUserTimeZone(userId);
    const today = todayKey(timeZone);
    const from = period === 'all' ? null : addDays(today, -(PERIOD_DAYS[period] - 1));

    const rows = await db
      .select({
        completedAt: workoutSessions.completedAt,
        // Only the performance map — the template snapshot in the same column
        // is most of its size and irrelevant here.
        performance:
          sql<Record<string, ExercisePerformance> | null>`${workoutSessions.performanceData} -> 'performance'`,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          isNotNull(workoutSessions.completedAt),
          ...(from ? [gte(workoutSessions.completedAt, startOfDayInZone(from, timeZone))] : [])
        )
      )
      .orderBy(asc(workoutSessions.completedAt))
      .limit(SESSION_LIMIT);

    const sessions: InsightSession[] = rows
      .filter((r) => r.completedAt && r.performance)
      .map((r) => ({
        day: dayKeyOf(r.completedAt!, timeZone),
        exercises: Object.values(r.performance!).map((entry) => ({
          exerciseKey: entry.exerciseKey ?? '',
          sets: entry.sets ?? [],
        })),
      }));

    const insights = buildStrengthInsights(sessions, { from, today });

    return successResponse({
      period,
      ...insights,
      truncated: rows.length === SESSION_LIMIT,
    });
  } catch (error) {
    console.error('Failed to load insights:', error);
    return errorResponse('Failed to load insights', 500);
  }
}
