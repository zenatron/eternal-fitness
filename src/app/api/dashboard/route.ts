import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to calculate streak based on workout dates
function calculateStreak(workoutDates: Date[]): number {
  if (!workoutDates.length) return 0;
  
  // Sort dates in descending order (newest first)
  const sortedDates = [...workoutDates].sort((a, b) => b.getTime() - a.getTime());
  
  let streak = 1;
  let currentDate = new Date(sortedDates[0]);
  currentDate.setHours(0, 0, 0, 0);
  
  // Check if the most recent workout is today or yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (currentDate.getTime() !== today.getTime() && 
      currentDate.getTime() !== yesterday.getTime()) {
    return 0; // Streak is broken if no workout today or yesterday
  }
  
  // Count consecutive days with workouts
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    const workoutDate = new Date(sortedDates[i]);
    workoutDate.setHours(0, 0, 0, 0);
    
    if (workoutDate.getTime() === prevDate.getTime()) {
      streak++;
      currentDate = workoutDate;
    } else {
      break; // Streak is broken
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
        id: userId
      }
    });
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Get user stats
    const userStats = await prisma.userStats.findUnique({
      where: {
        userId
      }
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
        month: {
          in: [currentMonth]
        },
        year: {
          in: [currentYear]
        }
      }
    });

    const currentMonthStats = Array.isArray(monthlyStats) 
      ? monthlyStats.find((stats: any) => stats.year === currentYear && stats.month === currentMonth)
      : null;
      
    const prevMonthStats = Array.isArray(monthlyStats)
      ? monthlyStats.find((stats: any) => stats.year === prevYear && stats.month === prevMonth)
      : null;

    // Calculate percentage changes
    const volumeChange = prevMonthStats && prevMonthStats.volume > 0 
      ? Math.round(((currentMonthStats?.volume || 0) - prevMonthStats.volume) / prevMonthStats.volume * 100) 
      : 0;

    // Get recent completed workouts
    const recentWorkouts = await prisma.workout.findMany({
      where: {
        userId,
        completed: true
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 3,
      include: {
        sets: {
          include: {
            exercises: true
          }
        }
      }
    });

    // Get upcoming workouts
    const upcomingWorkouts = await prisma.workout.findMany({
      where: {
        userId,
        completed: false,
        scheduledDate: {
          gte: new Date()
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      },
      take: 2
    });

    // Get the last 30 days of activity data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const workoutsLast30Days = await prisma.workout.findMany({
      where: {
        userId,
        completed: true,
        completedAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        completedAt: true
      },
      orderBy: {
        completedAt: 'asc'
      }
    });

    // Format activity data for the heatmap
    const activityData = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const formattedDate = date.toISOString().split('T')[0];
      
      // Check if there was a workout on this date
      const hasWorkout = workoutsLast30Days.some((workout: any) => {
        const workoutDate = workout.completedAt?.toISOString().split('T')[0];
        return workoutDate === formattedDate;
      });
      
      activityData.push({
        date: formattedDate,
        completed: hasWorkout
      });
    }

    // If userStats doesn't exist yet, calculate current streak manually
    let currentStreak = userStats?.currentStreak || 0;
    if (!userStats) {
      currentStreak = calculateStreak(workoutsLast30Days.map((w: any) => w.completedAt as Date));
    }

    // Format the response
    const dashboardData = {
      activityData,
      streak: currentStreak,
      progress: {
        workoutsCompleted: userStats?.totalWorkouts || 0,
        personalRecords: 0, // We're not tracking PRs yet
        weightProgress: {
          current: user.weight || 0,
          goal: user.weightGoal || 0,
          unit: user.useMetric ? 'kg' : 'lbs',
          percentage: user.weightGoal && user.weight 
            ? Math.min(100, Math.round((user.weight / user.weightGoal) * 100))
            : 0
        }
      },
      recentActivity: recentWorkouts.map((workout: any) => ({
        id: workout.id,
        title: workout.name,
        details: `Completed ${workout.sets.length} exercises`,
        timeAgo: formatTimeAgo(workout.completedAt as Date)
      })),
      upcomingWorkouts: upcomingWorkouts.map((workout: any) => ({
        id: workout.id,
        title: workout.name,
        exercises: workout.duration || 0,
        duration: workout.duration || 0,
        status: getWorkoutStatus(workout.scheduledDate as Date)
      })),
      stats: {
        totalWorkouts: userStats?.totalWorkouts || 0,
        hoursTrained: userStats?.totalTrainingHours || 0,
        totalExercises: userStats?.totalExercises || 0,
        activeWeeks: userStats?.activeWeeks || 0,
        totalVolume: {
          amount: userStats?.totalVolume || 0,
          unit: user.useMetric ? 'kg' : 'lbs',
          percentIncrease: volumeChange,
          displayPercentage: 65 // This would be determined by your UI needs
        }
      }
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

// Helper function to determine workout status label
function getWorkoutStatus(date: Date): 'today' | 'tomorrow' | 'upcoming' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const workoutDate = new Date(date);
  workoutDate.setHours(0, 0, 0, 0);
  
  if (workoutDate.getTime() === today.getTime()) {
    return 'today';
  } else if (workoutDate.getTime() === tomorrow.getTime()) {
    return 'tomorrow';
  } else {
    return 'upcoming';
  }
} 