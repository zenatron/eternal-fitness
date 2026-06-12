import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userStats, monthlyStats, workoutSessions } from '@/lib/db/schema';
import { eq, and, isNotNull, isNull, gte, desc, asc, or } from 'drizzle-orm';
import { formatUTCDateToLocalDateShort } from '@/utils/dateUtils';

function calculateStreak(sessionDates: Date[]): number {
  if (!sessionDates.length) return 0;

  const sortedDates = [...sessionDates].sort((a, b) => b.getTime() - a.getTime());

  const uniqueUTCDateStringsSet = new Set(sortedDates.map((d) => formatUTCDateToLocalDateShort(d)));
  const uniqueUTCDateStrings = Array.from(uniqueUTCDateStringsSet);

  if (!uniqueUTCDateStrings.length) return 0;

  const uniqueUTCDates = uniqueUTCDateStrings
    .map((dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    })
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const todayUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1);

  if (uniqueUTCDates[0].getTime() === todayUTC.getTime() || uniqueUTCDates[0].getTime() === yesterdayUTC.getTime()) {
    streak = 1;
    let currentStreakDate = uniqueUTCDates[0];

    for (let i = 1; i < uniqueUTCDates.length; i++) {
      const expectedPrevDate = new Date(currentStreakDate);
      expectedPrevDate.setUTCDate(currentStreakDate.getUTCDate() - 1);

      if (uniqueUTCDates[i].getTime() === expectedPrevDate.getTime()) {
        streak++;
        currentStreakDate = uniqueUTCDates[i];
      } else {
        break;
      }
    }
  }

  return streak;
}

function formatTimeAgo(dateInput: Date | string | null): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return new NextResponse('User not found', { status: 404 });

    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const monthly = await db
      .select()
      .from(monthlyStats)
      .where(and(
        eq(monthlyStats.userId, userId),
        or(
          and(eq(monthlyStats.year, currentYear), eq(monthlyStats.month, currentMonth)),
          and(eq(monthlyStats.year, prevYear), eq(monthlyStats.month, prevMonth)),
        ),
      ));

    const currentMonthStats = monthly.find(s => s.year === currentYear && s.month === currentMonth) || null;
    const prevMonthStats = monthly.find(s => s.year === prevYear && s.month === prevMonth) || null;

    const volumeChange = prevMonthStats && prevMonthStats.volume > 0
      ? Math.round(((currentMonthStats?.volume || 0) - prevMonthStats.volume) / prevMonthStats.volume * 100)
      : (currentMonthStats?.volume || 0) > 0 ? 100 : 0;

    const recentSessions = await db.query.workoutSessions.findMany({
      where: and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)),
      orderBy: desc(workoutSessions.completedAt),
      limit: 3,
      with: { workoutTemplate: { columns: { id: true, name: true } } },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

    const sessionsLast30Days = await db
      .select({ completedAt: workoutSessions.completedAt })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.completedAt, thirtyDaysAgo),
        isNotNull(workoutSessions.completedAt),
      ))
      .orderBy(asc(workoutSessions.completedAt));

    const completedUTCDates = new Set(
      sessionsLast30Days.map(s => formatUTCDateToLocalDateShort(s.completedAt!)),
    );

    const activityData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const formattedDate = formatUTCDateToLocalDateShort(date);
      activityData.push({ date: formattedDate, completed: completedUTCDates.has(formattedDate) });
    }

    let currentStreak = stats?.currentStreak || 0;
    if (!stats) {
      const allSessionDates = sessionsLast30Days.map(s => s.completedAt).filter(Boolean) as Date[];
      currentStreak = calculateStreak(allSessionDates);
    }

    const upcomingWorkouts = await db.query.workoutSessions.findMany({
      where: and(eq(workoutSessions.userId, userId), isNull(workoutSessions.completedAt)),
      orderBy: asc(workoutSessions.scheduledAt),
      with: { workoutTemplate: { columns: { id: true, name: true } } },
    });

    let personalRecordsCount = 0;
    if (stats?.personalRecords) {
      const personalRecords = stats.personalRecords as any;
      personalRecordsCount = Object.keys(personalRecords).reduce((count, exerciseName) => {
        const exercisePR = personalRecords[exerciseName];
        let exerciseCount = 0;
        if (exercisePR.maxWeight) exerciseCount++;
        if (exercisePR.maxVolume) exerciseCount++;
        return count + exerciseCount;
      }, 0);
    }

    const dashboardData = {
      activityData,
      streak: currentStreak,
      progress: {
        workoutsCompleted: stats?.totalWorkouts || 0,
        personalRecords: personalRecordsCount,
        weightProgress: {
          current: user.weight || 0,
          goal: user.weightGoal || 0,
          unit: user.useMetric ? 'kg' : 'lbs',
          percentage: user.weightGoal && user.weight && user.weightGoal > 0
            ? Math.min(100, Math.round((user.weight / user.weightGoal) * 100))
            : 0,
        },
      },
      recentActivity: recentSessions.map(session => {
        const unit = user.useMetric ? 'kg' : 'lbs';
        const formattedVolume = session.totalVolume >= 1000000
          ? `${(session.totalVolume / 1000000).toFixed(1)}M ${unit}`
          : session.totalVolume >= 1000
          ? `${(session.totalVolume / 1000).toFixed(1)}K ${unit}`
          : `${session.totalVolume.toFixed(0)} ${unit}`;

        return {
          id: session.id,
          title: session.workoutTemplate.name,
          details: `Completed ${formatTimeAgo(session.completedAt)} • ${formattedVolume} Vol.`,
          timeAgo: formatTimeAgo(session.completedAt),
        };
      }),
      stats: {
        totalWorkouts: stats?.totalWorkouts || 0,
        hoursTrained: stats?.totalTrainingHours || 0,
        totalExercises: stats?.totalExercises || 0,
        activeWeeks: stats?.activeWeeks || 0,
        totalVolume: {
          amount: stats?.totalVolume || 0,
          unit: user.useMetric ? 'kg' : 'lbs',
          percentIncrease: volumeChange,
        },
      },
      upcomingWorkouts,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
