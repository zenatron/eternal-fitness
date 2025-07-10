import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// Helper for standard responses
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 400, details?: any) => {
  return NextResponse.json({ error: { message, details } }, { status });
};

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Get user stats
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    // Get recent sessions (last 10)
    const recentSessions = await prisma.workoutSession.findMany({
      where: { 
        userId,
        completedAt: { not: null }
      },
      include: {
        workoutTemplate: {
          select: { name: true }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    // Get monthly stats for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyStats = await prisma.monthlyStats.findMany({
      where: {
        userId,
        createdAt: { gte: twelveMonthsAgo }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Get all sessions for analysis
    const allSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        completedAt: { not: null },
        performanceData: { not: null }
      },
      select: {
        id: true,
        completedAt: true,
        totalVolume: true,
        performanceData: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    // Calculate exercise insights from session data
    const exerciseStats = new Map();
    const personalRecords = new Map();
    
    allSessions.forEach(session => {
      if (session.performanceData && typeof session.performanceData === 'object') {
        const data = session.performanceData as any;

        // Extract exercise data from actual performance data
        if (data.performance) {
          Object.values(data.performance).forEach((exercisePerf: any) => {
            const key = exercisePerf.exerciseKey;
            // Get exercise name from template snapshot
            const templateExercise = data.templateSnapshot?.exercises?.find((ex: any) => ex.exerciseKey === key);
            const name = templateExercise?.name || key;

            if (!exerciseStats.has(key)) {
              exerciseStats.set(key, {
                exerciseKey: key,
                name: name,
                totalVolume: 0,
                sessionCount: 0,
                maxWeight: 0,
              });
            }

            const stats = exerciseStats.get(key);
            stats.sessionCount += 1;

            // Add the total volume from this session
            stats.totalVolume += exercisePerf.totalVolume || 0;

            // Calculate max weight from actual performed sets
            if (exercisePerf.sets) {
              exercisePerf.sets.forEach((set: any) => {
                if (set.completed && set.actualWeight) {
                  stats.maxWeight = Math.max(stats.maxWeight, set.actualWeight);

                  // Track personal records
                  const recordKey = `${key}_weight`;
                  if (!personalRecords.has(recordKey) || personalRecords.get(recordKey).value < set.actualWeight) {
                    personalRecords.set(recordKey, {
                      exerciseKey: key,
                      exerciseName: name,
                      type: 'weight',
                      value: set.actualWeight,
                      achievedAt: session.completedAt,
                    });
                  }
                }
              });
            }
          });
        }
      }
    });

    // Convert maps to arrays and sort
    const topExercises = Array.from(exerciseStats.values())
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 10);

    const personalRecordsArray = Array.from(personalRecords.values())
      .filter(record => record.value > 0)
      .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())
      .slice(0, 20);

    // Calculate volume trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSessionsForTrend = allSessions.filter(session => 
      new Date(session.completedAt!) >= thirtyDaysAgo
    );

    const volumeTrend = recentSessionsForTrend.map(session => ({
      date: session.completedAt!.toISOString().split('T')[0],
      volume: session.totalVolume || 0,
    }));

    // Calculate workout frequency (last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    
    const workoutFrequency: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(twelveWeeksAgo);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekSessions = allSessions.filter(session => {
        const sessionDate = new Date(session.completedAt!);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      });
      
      workoutFrequency.push({
        date: weekStart.toISOString().split('T')[0],
        count: weekSessions.length,
      });
    }

    const statsData = {
      // Core stats from UserStats model (fallback to calculated values if no UserStats record)
      totalWorkouts: userStats?.totalWorkouts || allSessions.length,
      totalSets: userStats?.totalSets || allSessions.reduce((sum, s) => sum + (s.performanceData as any)?.metrics?.totalSets || 0, 0),
      totalExercises: userStats?.totalExercises || exerciseStats.size,
      totalVolume: userStats?.totalVolume || allSessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0),
      totalTrainingHours: userStats?.totalTrainingHours || allSessions.reduce((sum, s) => sum + ((s.performanceData as any)?.duration || 0), 0) / 60,
      currentStreak: userStats?.currentStreak || 0,
      longestStreak: userStats?.longestStreak || 0,
      lastWorkoutAt: userStats?.lastWorkoutAt?.toISOString() || (allSessions[0]?.completedAt?.toISOString() || null),
      activeWeeks: userStats?.activeWeeks || Math.ceil(allSessions.length / 3), // Rough estimate

      // Recent sessions
      recentSessions: recentSessions.map(session => ({
        id: session.id,
        completedAt: session.completedAt!.toISOString(),
        duration: session.duration || 0,
        totalVolume: session.totalVolume || 0,
        totalSets: session.totalSets || 0,
        templateName: session.workoutTemplate?.name || 'Unknown Template',
      })),

      // Monthly stats
      monthlyStats: monthlyStats.map(stat => ({
        month: new Date(stat.year, stat.month - 1).toLocaleDateString('en-US', { month: 'long' }),
        year: stat.year,
        workoutsCount: stat.workoutsCount,
        volume: stat.volume,
        trainingHours: stat.trainingHours,
      })),

      // Exercise insights
      topExercises,
      personalRecords: personalRecordsArray,
      volumeTrend,
      workoutFrequency,
    };

    return successResponse(statsData);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return errorResponse(
      'Internal Server Error',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
