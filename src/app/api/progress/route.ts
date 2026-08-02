import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions, workoutTemplates } from '@/lib/db/schema';
import { eq, and, isNotNull, gte, lte, desc, sql } from 'drizzle-orm';
import { WorkoutSessionData } from '@/types/workout';
import { exerciseDisplayName } from '@/lib/exerciseLookup';
import { dayKeyOf, monthOf, startOfWeek } from '@/utils/datetime';
import { getUserTimeZone } from '@/lib/userTimeZone';

const VALID_PERIODS = ['7d', '30d', '90d', '1y', 'all'] as const;
type Period = (typeof VALID_PERIODS)[number];
function parsePeriod(value: string | null): Period {
  return VALID_PERIODS.includes(value as Period) ? (value as Period) : '30d';
}

/**
 * Upper bounds on how many sessions feed a single progress response. Both sit
 * far above a realistic training history — six years of daily lifting is ~2000
 * sessions — but stop a pathological account from pulling unbounded JSONB.
 */
const ALL_TIME_SESSION_LIMIT = 2000;
const PERIOD_SESSION_LIMIT = 500;

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeZone = await getUserTimeZone(userId);

    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get('period'));

    const now = new Date();
    let startDate = new Date();
    let groupBy: 'day' | 'week' | 'month' = 'day';
    let prevStartDate = new Date();
    let prevEndDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        groupBy = 'day';
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        groupBy = 'day';
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        groupBy = 'week';
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        groupBy = 'month';
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(startDate);
        prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
        groupBy = 'month';
        prevEndDate = new Date(0);
        prevStartDate = new Date(0);
        break;
    }

    // Fetch current period sessions
    const conditions: any[] = [
      eq(workoutSessions.userId, userId),
      isNotNull(workoutSessions.completedAt),
    ];
    if (period !== 'all') {
      conditions.push(gte(workoutSessions.completedAt, startDate));
      conditions.push(lte(workoutSessions.completedAt, now));
    }

    /*
     * Only the `performance` sub-object is projected, not the whole
     * `performanceData` column. The bulk of that blob is `templateSnapshot` —
     * a complete copy of the template stored per session — which this endpoint
     * used solely to map an exercise id back to a name. `exerciseKey` on each
     * performance entry gives the same answer without transferring it.
     */
    const performanceColumn =
      sql<WorkoutSessionData['performance'] | null>`${workoutSessions.performanceData} -> 'performance'`;

    const sessionColumns = {
      id: workoutSessions.id,
      completedAt: workoutSessions.completedAt,
      duration: workoutSessions.duration,
      totalVolume: workoutSessions.totalVolume,
      totalSets: workoutSessions.totalSets,
      totalExercises: workoutSessions.totalExercises,
      performance: performanceColumn,
      templateName: workoutTemplates.name,
    };

    const sessions = await db
      .select(sessionColumns)
      .from(workoutSessions)
      .leftJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
      .where(and(...conditions))
      .orderBy(desc(workoutSessions.completedAt))
      // 'all' previously had no bound of any kind and scanned a user's entire
      // history. This caps it well above any realistic training log.
      .limit(period === 'all' ? ALL_TIME_SESSION_LIMIT : PERIOD_SESSION_LIMIT);

    // Fetch previous period for comparison
    let prevSessions: typeof sessions = [];
    if (period !== 'all') {
      prevSessions = await db
        .select(sessionColumns)
        .from(workoutSessions)
        .leftJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
        .where(and(
          eq(workoutSessions.userId, userId),
          isNotNull(workoutSessions.completedAt),
          gte(workoutSessions.completedAt, prevStartDate),
          lte(workoutSessions.completedAt, prevEndDate),
        ))
        .orderBy(desc(workoutSessions.completedAt))
        .limit(PERIOD_SESSION_LIMIT);
    }

    // Helper: total distance recorded across a session's sets
    const extractDistance = (
      performance: WorkoutSessionData['performance'] | null
    ): number => {
      if (!performance) return 0;
      return Object.values(performance).reduce(
        (total, ep) =>
          total + (ep.sets ?? []).reduce((sum, s) => sum + (s.actualDistance || 0), 0),
        0
      );
    };

    // Helper: aggregate array of sessions
    const aggregateStats = (s: typeof sessions) => {
      let volume = 0, hours = 0, distance = 0, totalSets = 0, totalExercises = 0;
      for (const sess of s) {
        volume += sess.totalVolume || 0;
        hours += (sess.duration || 0) / 3600;
        distance += extractDistance(sess.performance);
        totalSets += sess.totalSets || 0;
        totalExercises += sess.totalExercises || 0;
      }
      return {
        workouts: s.length,
        volume,
        hours: Math.round(hours * 10) / 10,
        distance: Math.round(distance * 100) / 100,
        sets: totalSets,
        exercises: totalExercises,
      };
    };

    // Build frequency data grouped by period
    const frequencyMap = new Map<string, { workouts: number; volume: number; hours: number; distance: number }>();
    /*
     * This managed to use three different calendars in one function: UTC for
     * days (`toISOString`), server-local for weeks (`setDate`/`getDay`) and
     * server-local again for months (`getFullYear`/`getMonth`). Switching the
     * grouping could therefore move a session between buckets. All three now
     * resolve the civil day in the user's zone first, then group.
     */
    const getKey = (date: Date) => {
      const day = dayKeyOf(date, timeZone);
      if (groupBy === 'day') return day;
      if (groupBy === 'week') return startOfWeek(day);
      const { year, month } = monthOf(day);
      return `${year}-${String(month).padStart(2, '0')}`;
    };

    for (const session of sessions) {
      if (!session.completedAt) continue;
      const key = getKey(new Date(session.completedAt));
      const entry = frequencyMap.get(key) || { workouts: 0, volume: 0, hours: 0, distance: 0 };
      entry.workouts++;
      entry.volume += session.totalVolume || 0;
      entry.hours += (session.duration || 0) / 3600;
      entry.distance += extractDistance(session.performance);
      frequencyMap.set(key, entry);
    }

    const frequency = Array.from(frequencyMap.entries())
      .map(([date, data]) => ({
        date,
        workouts: data.workouts,
        volume: Math.round(data.volume),
        hours: Math.round(data.hours * 10) / 10,
        distance: Math.round(data.distance * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top exercises for the period
    const exerciseMap = new Map<string, { name: string; volume: number; sets: number; sessions: number }>();
    for (const session of sessions) {
      if (!session.performance) continue;
      for (const [exerciseId, ep] of Object.entries(session.performance)) {
        // Resolved from the exercise key rather than the template snapshot, so
        // the snapshot no longer has to be fetched. Falls back to the raw id
        // for legacy rows that predate exerciseKey being recorded.
        const exName = ep.exerciseKey ? exerciseDisplayName(ep.exerciseKey) : exerciseId;
        const entry = exerciseMap.get(exName) || { name: exName, volume: 0, sets: 0, sessions: 0 };
        entry.volume += ep.totalVolume || 0;
        entry.sets += ep.sets?.length || 0;
        entry.sessions++;
        exerciseMap.set(exName, entry);
      }
    }
    const topExercises = Array.from(exerciseMap.values())
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10)
      .map(e => ({ ...e, volume: Math.round(e.volume) }));

    // Recent sessions list
    const recentSessions = sessions.slice(0, 20).map(s => ({
      date: s.completedAt?.toISOString() || '',
      name: s.templateName || 'Workout',
      volume: s.totalVolume || 0,
      sets: s.totalSets || 0,
      duration: s.duration || 0,
      distance: Math.round(extractDistance(s.performance) * 100) / 100,
    }));

    const current = aggregateStats(sessions);
    const previous = aggregateStats(prevSessions);

    const calcChange = (curr: number, prev: number) => ({
      value: curr,
      change: prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0),
      isNew: curr > 0 && prev === 0,
    });

    return NextResponse.json({
      period: { label: period, start: startDate.toISOString(), end: now.toISOString(), groupBy },
      summary: {
        workouts: calcChange(current.workouts, previous.workouts),
        volume: calcChange(current.volume, previous.volume),
        hours: calcChange(current.hours, previous.hours),
        distance: calcChange(current.distance, previous.distance),
        sets: calcChange(current.sets, previous.sets),
      },
      frequency,
      topExercises,
      recentSessions,
    });
  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
