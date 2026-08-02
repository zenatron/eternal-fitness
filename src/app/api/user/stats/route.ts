import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { userStats, workoutSessions, monthlyStats } from '@/lib/db/schema';
import { eq, and, isNotNull, desc, gte, sql } from 'drizzle-orm';
import { UserPersonalRecords } from '@/types/personalRecords';
import { exerciseDisplayName } from '@/lib/exerciseLookup';
import { addDays, dayKeyOf, todayKey } from '@/utils/datetime';
import { getUserTimeZone } from '@/lib/userTimeZone';

/**
 * How far back the top-exercise breakdown looks. Bounded because this runs on
 * every profile load; well beyond the window anyone reads meaning into.
 */
const TOP_EXERCISE_SESSION_LIMIT = 500;

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 400, details?: unknown) => {
  return NextResponse.json({ error: { message, details } }, { status });
};

function convertStoredPRsToDisplayFormat(personalRecords: UserPersonalRecords) {
  const displayRecords: Array<{
    exerciseKey: string;
    exerciseName: string;
    type: 'weight' | 'volume' | 'duration' | 'distance';
    value: number;
    achievedAt: string;
  }> = [];

  Object.entries(personalRecords).forEach(([exerciseName, exercisePR]) => {
    if (exercisePR.maxWeight) {
      displayRecords.push({
        exerciseKey: exerciseName.toLowerCase().replace(/\s+/g, '_'),
        exerciseName,
        type: 'weight',
        value: exercisePR.maxWeight.value,
        achievedAt: exercisePR.maxWeight.achievedAt,
      });
    }
    if (exercisePR.maxVolume) {
      displayRecords.push({
        exerciseKey: exerciseName.toLowerCase().replace(/\s+/g, '_'),
        exerciseName,
        type: 'volume',
        value: exercisePR.maxVolume.value,
        achievedAt: exercisePR.maxVolume.achievedAt,
      });
    }
    if (exercisePR.maxDuration) {
      displayRecords.push({
        exerciseKey: exerciseName.toLowerCase().replace(/\s+/g, '_'),
        exerciseName,
        type: 'duration',
        value: exercisePR.maxDuration.value,
        achievedAt: exercisePR.maxDuration.achievedAt,
      });
    }
    if (exercisePR.maxDistance) {
      displayRecords.push({
        exerciseKey: exerciseName.toLowerCase().replace(/\s+/g, '_'),
        exerciseName,
        type: 'distance',
        value: exercisePR.maxDistance.value,
        achievedAt: exercisePR.maxDistance.achievedAt,
      });
    }
  });

  return displayRecords
    .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())
    .slice(0, 20);
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const timeZone = await getUserTimeZone(userId);

    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));

    const recentSessions = await db.query.workoutSessions.findMany({
      where: and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)),
      orderBy: desc(workoutSessions.completedAt),
      limit: 10,
      with: { workoutTemplate: { columns: { name: true } } },
    });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthly = await db
      .select()
      .from(monthlyStats)
      .where(and(eq(monthlyStats.userId, userId), gte(monthlyStats.createdAt, twelveMonthsAgo)))
      .orderBy(desc(monthlyStats.year), desc(monthlyStats.month));

    /*
     * Top-exercise stats are derived from the recent history only, and project
     * just the `performance` sub-object.
     *
     * This previously fetched every completed session with its full
     * `performanceData` — including a whole `templateSnapshot` per row — on
     * every single profile page load, and grew without bound as the user
     * trained. The snapshot was only used to look up an exercise name, which
     * `exerciseKey` already answers.
     */
    const allSessions = await db
      .select({
        id: workoutSessions.id,
        completedAt: workoutSessions.completedAt,
        totalVolume: workoutSessions.totalVolume,
        performance: sql<
          Record<string, { exerciseKey: string; totalVolume?: number; sets?: unknown[] }> | null
        >`${workoutSessions.performanceData} -> 'performance'`,
      })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.completedAt),
        isNotNull(workoutSessions.performanceData),
      ))
      .orderBy(desc(workoutSessions.completedAt))
      .limit(TOP_EXERCISE_SESSION_LIMIT);

    const exerciseStats = new Map();
    allSessions.forEach(session => {
      {
        const data = { performance: session.performance } as any;
        if (data.performance) {
          Object.values(data.performance).forEach((exercisePerf: any) => {
            const key = exercisePerf.exerciseKey;
            const name = key ? exerciseDisplayName(key) : key;

            if (!exerciseStats.has(key)) {
              exerciseStats.set(key, { exerciseKey: key, name, totalVolume: 0, sessionCount: 0, maxWeight: 0 });
            }

            const s = exerciseStats.get(key);
            s.sessionCount += 1;
            s.totalVolume += exercisePerf.totalVolume || 0;

            if (exercisePerf.sets) {
              exercisePerf.sets.forEach((set: any) => {
                if (set.completed && set.actualWeight) {
                  s.maxWeight = Math.max(s.maxWeight, set.actualWeight);
                }
              });
            }
          });
        }
      }
    });

    const topExercises = Array.from(exerciseStats.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 10);

    const personalRecordsArray = stats?.personalRecords
      ? convertStoredPRsToDisplayFormat(stats.personalRecords as any)
      : [];

    /*
     * Both series used to label their points with `toISOString()` — the UTC day —
     * while selecting them with server-local `setDate` arithmetic. An evening
     * workout was therefore plotted on the following day, and the twelve week
     * windows were half-open in a way that dropped sessions falling in the last
     * few hours of `weekEnd`.
     */
    const today = todayKey(timeZone);

    const trendCutoff = addDays(today, -29);
    const volumeTrend = allSessions
      .map(s => ({ day: dayKeyOf(s.completedAt!, timeZone), volume: s.totalVolume || 0 }))
      .filter(s => s.day >= trendCutoff)
      .map(s => ({ date: s.day, volume: s.volume }));

    const sessionDays = allSessions.map(s => dayKeyOf(s.completedAt!, timeZone));
    const workoutFrequency: Array<{ date: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = addDays(today, -i * 7 - 6);
      const weekEnd = addDays(weekStart, 6);
      workoutFrequency.push({
        date: weekStart,
        count: sessionDays.filter(d => d >= weekStart && d <= weekEnd).length,
      });
    }

    const statsData = {
      totalWorkouts: stats?.totalWorkouts || allSessions.length,
      totalSets: stats?.totalSets || 0,
      totalExercises: stats?.totalExercises || exerciseStats.size,
      totalVolume: stats?.totalVolume || allSessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0),
      totalTrainingHours: stats?.totalTrainingHours || 0,
      currentStreak: stats?.currentStreak || 0,
      longestStreak: stats?.longestStreak || 0,
      lastWorkoutAt: stats?.lastWorkoutAt?.toISOString() || (allSessions[0]?.completedAt?.toISOString() || null),
      // Was `Math.ceil(allSessions.length / 3)` when stats were missing — an
      // invented number that had nothing to do with weeks. The real value is
      // now maintained (see updateUniqueExercisesCount), so report 0 rather
      // than a fabricated figure.
      activeWeeks: stats?.activeWeeks ?? 0,
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        completedAt: s.completedAt!.toISOString(),
        duration: s.duration || 0,
        totalVolume: s.totalVolume || 0,
        totalSets: s.totalSets || 0,
        templateName: s.workoutTemplate?.name || 'Quick Workout',
      })),
      monthlyStats: monthly.map(s => ({
        month: new Date(s.year, s.month - 1).toLocaleDateString('en-US', { month: 'long' }),
        year: s.year,
        workoutsCount: s.workoutsCount,
        volume: s.volume,
        trainingHours: s.trainingHours,
      })),
      topExercises,
      personalRecords: personalRecordsArray,
      volumeTrend,
      workoutFrequency,
    };

    return successResponse(statsData);
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}
