// Activity data for workout calendar
export interface ActivityDay {
  date: string;
  completed: boolean;
}

// Recent activity entry
export interface ActivityEntry {
  id: number;
  title: string;
  details: string;
  timeAgo: string;
}

// Upcoming workout
export interface UpcomingWorkout {
  id: number;
  title: string;
  exercises: number;
  duration: number;
  status: 'today' | 'tomorrow' | 'upcoming';
}

// Progress data
export interface ProgressData {
  workoutsCompleted: number;
  personalRecords: number;
  weightProgress: {
    current: number;
    goal: number;
    unit: string;
    percentage: number;
  };
}

// Stats data
export interface StatsData {
  totalWorkouts: number;
  hoursTrained: number;
  totalExercises: number;
  activeWeeks: number;
  totalVolume: {
    amount: number;
    unit: string;
    percentIncrease: number;
    displayPercentage: number;
  };
}

// Dashboard data
export interface DashboardData {
  activityData: ActivityDay[];
  streak: number;
  progress: ProgressData;
  recentActivity: ActivityEntry[];
  upcomingWorkouts: UpcomingWorkout[];
  stats: StatsData;
} 