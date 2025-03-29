import { 
  ActivityDay, 
  ActivityEntry, 
  UpcomingWorkout,
  ProgressData,
  StatsData,
  DashboardData
} from '@/types/dashboard';

// Generate activity data for the past 30 days
export const generateActivityData = (): ActivityDay[] => {
  return Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    completed: Math.random() > 0.4
  }));
};

// Sample recent activity data
export const recentActivityData: ActivityEntry[] = [
  {
    id: 1,
    title: 'Upper Body Workout',
    details: 'Completed 8 exercises',
    timeAgo: '2h ago'
  },
  {
    id: 2,
    title: 'Cardio Session',
    details: 'Completed 5 exercises',
    timeAgo: '1d ago'
  },
  {
    id: 3,
    title: 'Leg Day',
    details: 'Completed 7 exercises',
    timeAgo: '3d ago'
  }
];

// Sample upcoming workouts
export const upcomingWorkoutsData: UpcomingWorkout[] = [
  {
    id: 1,
    title: 'Leg Day',
    exercises: 8,
    duration: 60,
    status: 'today'
  },
  {
    id: 2,
    title: 'Upper Body',
    exercises: 10,
    duration: 75,
    status: 'tomorrow'
  }
];

// Sample progress data
export const progressData: ProgressData = {
  workoutsCompleted: 12,
  personalRecords: 3,
  weightProgress: {
    current: 78,
    goal: 75,
    unit: 'kg',
    percentage: 70
  }
};

// Sample stats data
export const statsData: StatsData = {
  totalWorkouts: 24,
  hoursTrained: 16.5,
  totalExercises: 156,
  activeWeeks: 6,
  totalVolume: {
    amount: 14250,
    unit: 'kg',
    percentIncrease: 12,
    displayPercentage: 65
  }
};

// Get dashboard data
export const getDashboardData = (): DashboardData => {
  return {
    activityData: generateActivityData(),
    streak: 7,
    progress: progressData,
    recentActivity: recentActivityData,
    upcomingWorkouts: upcomingWorkoutsData,
    stats: statsData
  };
}; 