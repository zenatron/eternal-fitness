import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import prisma from '@/lib/prisma'; // Add this line
import { formatUTCDateToLocalDateShort } from '@/utils/dateUtils'; // Import utility

// Helper function to calculate streak based on workout dates
function calculateStreak(sessionDates: Date[]): number {
  if (!sessionDates.length) return 0;

  // Dates are already UTC from DB (completedAt)
  const sortedDates = [...sessionDates].sort(
    (a, b) => b.getTime() - a.getTime(),
  );

  // Get unique UTC dates (YYYY-MM-DD)
  const uniqueUTCDateStringsSet = new Set(
    sortedDates.map((d) => formatUTCDateToLocalDateShort(d)),
  );
  // Convert Set to Array explicitly
  const uniqueUTCDateStrings = Array.from(uniqueUTCDateStringsSet);

  if (!uniqueUTCDateStrings.length) return 0;

  // Convert back to UTC Date objects for easier comparison
  const uniqueUTCDates = uniqueUTCDateStrings
    .map((dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    })
    .sort((a, b) => b.getTime() - a.getTime()); // Sort descending again

  let streak = 0;
  const todayUTC = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    ),
  );
  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1);

  // Check if the most recent session was today or yesterday
  if (
    uniqueUTCDates[0].getTime() === todayUTC.getTime() ||
    uniqueUTCDates[0].getTime() === yesterdayUTC.getTime()
  ) {
    streak = 1;
    let currentStreakDate = uniqueUTCDates[0];

    // Count consecutive previous days
    for (let i = 1; i < uniqueUTCDates.length; i++) {
      const expectedPrevDate = new Date(currentStreakDate);
      expectedPrevDate.setUTCDate(currentStreakDate.getUTCDate() - 1);

      if (uniqueUTCDates[i].getTime() === expectedPrevDate.getTime()) {
        streak++;
        currentStreakDate = uniqueUTCDates[i];
      } else {
        break; // Streak broken
      }
    }
  }

  return streak;
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Get user stats
    const userStats = await prisma.userStats.findUnique({
      where: {
        userId,
      },
    });

    // Get current date info for monthly stats query
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    // Get previous month for comparison
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Fetch monthly stats for current and previous month
    const monthlyStats = await prisma.monthlyStats.findMany({
      where: {
        userId,
        OR: [
          { year: currentYear, month: currentMonth },
          { year: prevYear, month: prevMonth },
        ],
      },
    });

    const currentMonthStats =
      monthlyStats.find(
        (stats) => stats.year === currentYear && stats.month === currentMonth,
      ) || null;
    const prevMonthStats =
      monthlyStats.find(
        (stats) => stats.year === prevYear && stats.month === prevMonth,
      ) || null;

    // Calculate percentage changes
    const volumeChange =
      prevMonthStats && prevMonthStats.volume > 0
        ? Math.round(
            (((currentMonthStats?.volume || 0) - prevMonthStats.volume) /
              prevMonthStats.volume) *
              100,
          )
        : (currentMonthStats?.volume || 0) > 0
        ? 100
        : 0; // Show 100% if current has volume and previous didn't

    // Get recent completed workouts
    const recentSessions = await prisma.workoutSession.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 3,
      include: {
        workoutTemplate: {
          // Include template name
          select: { name: true },
        },
      },
    });

    // Get the last 30 days of activity data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

    // Get all session completion dates in the last 30 days
    const sessionsLast30Days = await prisma.workoutSession.findMany({
      where: {
        userId,
        completedAt: {
          gte: thirtyDaysAgo,
          not: null,
        },
      },
      select: {
        completedAt: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Get unique UTC dates of completed sessions
    const completedUTCDateStringsArray = sessionsLast30Days.map((session) =>
      formatUTCDateToLocalDateShort(session.completedAt),
    );
    const completedUTCDates = new Set(completedUTCDateStringsArray); // Pass the array

    // Format activity data for the heatmap (representing local dates)
    const activityData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(); // Start with today local
      date.setDate(date.getDate() - (29 - i)); // Go back day by day
      const formattedDate = formatUTCDateToLocalDateShort(date); // Get YYYY-MM-DD of the local day

      activityData.push({
        date: formattedDate,
        // Check if this local date (represented as YYYY-MM-DD) exists in our set of completed UTC dates
        completed: completedUTCDates.has(formattedDate),
      });
    }

    // If userStats doesn't exist yet, calculate current streak manually
    let currentStreak = userStats?.currentStreak || 0;
    if (!userStats) {
      // Fetch all session dates if needed (can be expensive)
      // Optimization: Fetch only needed dates around the latest session if implementing fully
      const allSessionDates = sessionsLast30Days
        .map((s) => s.completedAt)
        .filter(Boolean) as Date[]; // Use recent for approximation if no stats
      currentStreak = calculateStreak(allSessionDates);
    }

    const upcomingWorkouts = await prisma.workoutSession.findMany({
      where: {
        userId,
        completedAt: null,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      include: {
        workoutTemplate: {
          select: { name: true },
        },
      },
    });
    // Format the response
    const dashboardData = {
      activityData,
      streak: currentStreak,
      progress: {
        workoutsCompleted: userStats?.totalWorkouts || 0,
        personalRecords: 0, // TODO: Implement PR tracking later
        weightProgress: {
          current: user.weight || 0,
          goal: user.weightGoal || 0,
          unit: user.useMetric ? 'kg' : 'lbs',
          percentage:
            user.weightGoal && user.weight && user.weightGoal > 0
              ? Math.min(100, Math.round((user.weight / user.weightGoal) * 100))
              : 0,
        },
      },
      recentActivity: recentSessions.map((session) => ({
        id: session.id,
        title: session.workoutTemplate.name,
        details: `Completed ${formatTimeAgo(
          session.completedAt,
        )} • ${session.totalVolume.toFixed(0)} ${
          user.useMetric ? 'kg' : 'lbs'
        } Vol.`, // Example detail
        timeAgo: formatTimeAgo(session.completedAt), // Use existing helper
      })),
      stats: {
        totalWorkouts: userStats?.totalWorkouts || 0, // Should reflect sessions
        hoursTrained: userStats?.totalTrainingHours || 0,
        totalExercises: userStats?.totalExercises || 0, // Revisit calculation
        activeWeeks: userStats?.activeWeeks || 0,
        totalVolume: {
          amount: userStats?.totalVolume || 0,
          unit: user.useMetric ? 'kg' : 'lbs',
          percentIncrease: volumeChange,
          // displayPercentage might need recalculation based on goals or UI
        },
      },
      upcomingWorkouts: upcomingWorkouts,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// Helper function to format time ago
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
  return date.toLocaleDateString(); // Keep it simple for older dates
}
