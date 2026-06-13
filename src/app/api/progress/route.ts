import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { workoutSessions, workoutTemplates } from '@/lib/db/schema';
import { eq, and, isNotNull, gte, lte, desc } from 'drizzle-orm';
import { WorkoutSessionData } from '@/types/workout';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

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

    const sessions = await db
      .select({
        id: workoutSessions.id,
        completedAt: workoutSessions.completedAt,
        duration: workoutSessions.duration,
        totalVolume: workoutSessions.totalVolume,
        totalSets: workoutSessions.totalSets,
        totalExercises: workoutSessions.totalExercises,
        performanceData: workoutSessions.performanceData,
        templateName: workoutTemplates.name,
      })
      .from(workoutSessions)
      .leftJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
      .where(and(...conditions))
      .orderBy(desc(workoutSessions.completedAt));

    // Fetch previous period for comparison
    let prevSessions: any[] = [];
    if (period !== 'all') {
      prevSessions = await db
        .select({
          id: workoutSessions.id,
          completedAt: workoutSessions.completedAt,
          duration: workoutSessions.duration,
          totalVolume: workoutSessions.totalVolume,
          totalSets: workoutSessions.totalSets,
          totalExercises: workoutSessions.totalExercises,
          performanceData: workoutSessions.performanceData,
          templateName: workoutTemplates.name,
        })
        .from(workoutSessions)
        .leftJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
        .where(and(
          eq(workoutSessions.userId, userId),
          isNotNull(workoutSessions.completedAt),
          gte(workoutSessions.completedAt, prevStartDate),
          lte(workoutSessions.completedAt, prevEndDate),
        ))
        .orderBy(desc(workoutSessions.completedAt));
    }

    // Helper: extract total distance from a session's performance data
    const extractDistance = (perfData: any): number => {
      if (!perfData?.performance) return 0;
      return Object.values(perfData.performance).reduce((t: number, ep: any) => {
        return t + (ep.sets || []).reduce((st: number, s: any) => st + (s.actualDistance || 0), 0);
      }, 0);
    };

    // Helper: aggregate array of sessions
    const aggregateStats = (s: typeof sessions) => {
      let volume = 0, hours = 0, distance = 0, totalSets = 0, totalExercises = 0;
      for (const sess of s) {
        volume += sess.totalVolume || 0;
        hours += (sess.duration || 0) / 3600;
        distance += extractDistance(sess.performanceData);
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
    const getKey = (date: Date) => {
      if (groupBy === 'day') return date.toISOString().slice(0, 10);
      if (groupBy === 'week') {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return d.toISOString().slice(0, 10);
      }
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    for (const session of sessions) {
      if (!session.completedAt) continue;
      const key = getKey(new Date(session.completedAt));
      const entry = frequencyMap.get(key) || { workouts: 0, volume: 0, hours: 0, distance: 0 };
      entry.workouts++;
      entry.volume += session.totalVolume || 0;
      entry.hours += (session.duration || 0) / 3600;
      entry.distance += extractDistance(session.performanceData);
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
      const perfData = session.performanceData as WorkoutSessionData;
      if (!perfData?.performance) continue;
      for (const [exerciseId, ep] of Object.entries(perfData.performance)) {
        const exName = perfData.templateSnapshot?.exercises?.find(e => e.id === exerciseId)?.name || exerciseId;
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
      distance: Math.round(extractDistance(s.performanceData) * 100) / 100,
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
