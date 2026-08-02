import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userStats, monthlyStats, workoutSessions } from '@/lib/db/schema';
import { eq, and, isNotNull, isNull, gte, desc, asc, or } from 'drizzle-orm';
import { addDays, dayKeyOf, monthOf, resolveTimeZone, startOfDayInZone, todayKey } from '@/utils/datetime';
import { computeStreakFromDates } from '@/lib/workout/completion';
import { getLevel } from '@/utils/levels';
import { calculateWeightGoalProgress } from '@/utils/weightGoal';

/** The dashboard card only ever renders a few of these. */
const UPCOMING_WORKOUTS_LIMIT = 10;

/**
 * Fallback streak, used only when no `userStats` row exists yet.
 *
 * Delegates to the shared rules in `lib/workout/completion.ts` rather than
 * carrying a fourth hand-rolled implementation. The version that used to live
 * here counted in UTC days and disagreed with the stored streak for anyone not
 * on UTC — the same figure computed two ways, differing by a day.
 */
function calculateStreak(sessionDates: Date[], timeZone: string): number {
  if (!sessionDates.length) return 0;
  return computeStreakFromDates(sessionDates, timeZone).currentStreak;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    // Explicit projections: `select()` with no columns pulled whole rows on
    // every dashboard load, including the dashboardConfig, achievements and
    // active-workout JSONB blobs that this endpoint never looks at.
    const [user] = await db
      .select({
        points: users.points,
        weight: users.weight,
        weightGoal: users.weightGoal,
        startingWeight: users.startingWeight,
        useMetric: users.useMetric,
        timeZone: users.timeZone,
      })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) return new NextResponse('User not found', { status: 404 });

    // Every "which day?" below is answered in this zone. Falls back to UTC,
    // which is what this route silently assumed for every user before.
    const timeZone = resolveTimeZone(user.timeZone);

    const [stats] = await db
      .select({
        totalWorkouts: userStats.totalWorkouts,
        totalExercises: userStats.totalExercises,
        totalVolume: userStats.totalVolume,
        totalTrainingHours: userStats.totalTrainingHours,
        currentStreak: userStats.currentStreak,
        activeWeeks: userStats.activeWeeks,
        personalRecords: userStats.personalRecords,
      })
      .from(userStats)
      .where(eq(userStats.userId, userId));

    /*
     * Must agree with how `recordWorkoutCompletion` files a workout, which is by
     * the user's calendar month. Reading "now" in the server's zone instead meant
     * that on the last day of a month the dashboard could query the *next*
     * month's row — empty — and report zero progress to a user who had trained
     * that morning.
     */
    const { year: currentYear, month: currentMonth } = monthOf(todayKey(timeZone));
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

    // The first instant of the earliest day the grid shows, in the user's zone —
    // not 30×24h before now, which clips part of the oldest day when the user is
    // ahead of UTC.
    const thirtyDaysAgo = startOfDayInZone(addDays(todayKey(timeZone), -29), timeZone);

    const sessionsLast30Days = await db
      .select({ completedAt: workoutSessions.completedAt })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.completedAt, thirtyDaysAgo),
        isNotNull(workoutSessions.completedAt),
      ))
      .orderBy(asc(workoutSessions.completedAt));

    /*
     * The grid used to build its 30 cells with `date.setDate(...)` — server-local
     * days — while labelling them with the *UTC* components of that date. The two
     * disagree for most of the day outside UTC, so a workout could light up the
     * neighbouring cell, or none at all.
     */
    const completedDays = new Set(
      sessionsLast30Days.map(s => dayKeyOf(s.completedAt!, timeZone)),
    );

    const today = todayKey(timeZone);
    const activityData = [];
    for (let i = 29; i >= 0; i--) {
      const day = addDays(today, -i);
      activityData.push({ date: day, completed: completedDays.has(day) });
    }

    let currentStreak = stats?.currentStreak || 0;
    if (!stats) {
      const allSessionDates = sessionsLast30Days.map(s => s.completedAt).filter(Boolean) as Date[];
      currentStreak = calculateStreak(allSessionDates, timeZone);
    }

    // The dashboard card shows a handful of upcoming sessions, but this fetched
    // every incomplete row a user had ever created — including long-abandoned
    // scheduled workouts from years back — and pulled the full session row with
    // its JSONB for each one.
    const upcomingWorkouts = await db.query.workoutSessions.findMany({
      where: and(eq(workoutSessions.userId, userId), isNull(workoutSessions.completedAt)),
      orderBy: asc(workoutSessions.scheduledAt),
      columns: {
        id: true,
        scheduledAt: true,
        notes: true,
        workoutTemplateId: true,
      },
      with: { workoutTemplate: { columns: { id: true, name: true } } },
      limit: UPCOMING_WORKOUTS_LIMIT,
    });

    let personalRecordsCount = 0;
    if (stats?.personalRecords) {
      const personalRecords = stats.personalRecords as any;
      personalRecordsCount = Object.keys(personalRecords).reduce((count, exerciseName) => {
        const exercisePR = personalRecords[exerciseName];
        let exerciseCount = 0;
        if (exercisePR.maxWeight) exerciseCount++;
        if (exercisePR.maxVolume) exerciseCount++;
        if (exercisePR.maxDuration) exerciseCount++;
        if (exercisePR.maxDistance) exerciseCount++;
        return count + exerciseCount;
      }, 0);
    }

    const dashboardData = {
      activityData,
      streak: currentStreak,
      progress: {
        workoutsCompleted: stats?.totalWorkouts || 0,
        personalRecords: personalRecordsCount,
        weightProgress: (() => {
          // Direction-aware, measured from the weight recorded when the goal was
          // set. See utils/weightGoal.ts for why the old current/goal ratio was
          // wrong for anyone trying to lose weight.
          const progress = calculateWeightGoalProgress(
            user.weight,
            user.weightGoal,
            user.startingWeight
          );

          return {
            current: user.weight || 0,
            goal: user.weightGoal || 0,
            startingWeight: progress?.startingWeight ?? null,
            unit: user.useMetric ? 'kg' : 'lbs',
            percentage: progress?.percentage ?? 0,
            remaining: progress?.remaining ?? 0,
            direction: progress?.direction ?? 'maintain',
            reached: progress?.reached ?? false,
          };
        })(),
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
          title: session.workoutTemplate?.name || 'Quick Workout',
          // The raw timestamp, not a rendered "2m ago". This response is cached
          // by React Query for five minutes and persisted to IndexedDB, so any
          // relative string baked in here is stale the moment it is stored — the
          // client formats it at render time instead. See utils/relativeTime.ts.
          completedAt: session.completedAt?.toISOString() ?? null,
          volumeLabel: `${formattedVolume} Vol.`,
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
      totalPoints: user.points || 0,
      level: getLevel(user.points || 0),
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
