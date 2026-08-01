import { WorkoutSession } from './workout';

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
// Progress data
export interface ProgressData {
  workoutsCompleted: number;
  personalRecords: number;
  weightProgress: {
    current: number;
    goal: number;
    unit: string;
    /** Baseline the goal is measured from; null until a goal has been set. */
    startingWeight: number | null;
    /** Null when there is no baseline, so the UI can say so rather than show 0%. */
    percentage: number | null;
    /** Absolute amount left to go, in `unit`. */
    remaining: number;
    direction: 'lose' | 'gain' | 'maintain';
    reached: boolean;
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
  upcomingWorkouts: WorkoutSession[];
  stats: StatsData;
  totalPoints: number;
  level: number;
}
