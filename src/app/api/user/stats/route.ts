import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { userStats, workoutSessions, monthlyStats } from '@/lib/db/schema';
import { eq, and, isNotNull, desc, gte } from 'drizzle-orm';
import { UserPersonalRecords } from '@/types/personalRecords';

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
    type: 'weight' | 'volume';
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
  });

  return displayRecords
    .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())
    .slice(0, 20);
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

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

    const allSessions = await db
      .select({
        id: workoutSessions.id,
        completedAt: workoutSessions.completedAt,
        totalVolume: workoutSessions.totalVolume,
        performanceData: workoutSessions.performanceData,
      })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.completedAt),
        isNotNull(workoutSessions.performanceData),
      ))
      .orderBy(desc(workoutSessions.completedAt));

    const exerciseStats = new Map();
    allSessions.forEach(session => {
      if (session.performanceData && typeof session.performanceData === 'object') {
        const data = session.performanceData as any;
        if (data.performance) {
          Object.values(data.performance).forEach((exercisePerf: any) => {
            const key = exercisePerf.exerciseKey;
            const templateExercise = data.templateSnapshot?.exercises?.find((ex: any) => ex.exerciseKey === key);
            const name = templateExercise?.name || key;

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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessionsForTrend = allSessions.filter(s => new Date(s.completedAt!) >= thirtyDaysAgo);
    const volumeTrend = recentSessionsForTrend.map(s => ({
      date: s.completedAt!.toISOString().split('T')[0],
      volume: s.totalVolume || 0,
    }));

    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const workoutFrequency: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(twelveWeeksAgo);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekSessions = allSessions.filter(s => {
        const d = new Date(s.completedAt!);
        return d >= weekStart && d <= weekEnd;
      });
      workoutFrequency.push({ date: weekStart.toISOString().split('T')[0], count: weekSessions.length });
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
      activeWeeks: stats?.activeWeeks || Math.ceil(allSessions.length / 3),
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        completedAt: s.completedAt!.toISOString(),
        duration: s.duration || 0,
        totalVolume: s.totalVolume || 0,
        totalSets: s.totalSets || 0,
        templateName: s.workoutTemplate?.name || 'Unknown Template',
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
