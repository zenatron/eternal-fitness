import { useQuery } from '@tanstack/react-query';

export interface UserStatsData {
  // Core stats
  totalWorkouts: number;
  totalSets: number;
  totalExercises: number;
  totalVolume: number;
  totalTrainingHours: number;
  currentStreak: number;
  longestStreak: number;
  lastWorkoutAt: string | null;
  activeWeeks: number;

  // Recent performance
  recentSessions: Array<{
    id: string;
    completedAt: string;
    duration: number;
    totalVolume: number;
    totalSets: number;
    templateName: string;
  }>;

  // Monthly breakdown
  monthlyStats: Array<{
    month: string;
    year: number;
    workoutsCount: number;
    volume: number;
    trainingHours: number;
  }>;

  // Exercise insights
  topExercises: Array<{
    exerciseKey: string;
    name: string;
    totalVolume: number;
    sessionCount: number;
    maxWeight: number;
  }>;

  // Personal records
  personalRecords: Array<{
    exerciseKey: string;
    exerciseName: string;
    type: 'weight' | 'reps' | 'volume';
    value: number;
    achievedAt: string;
  }>;

  // Progress trends
  volumeTrend: Array<{
    date: string;
    volume: number;
  }>;

  workoutFrequency: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Custom hook to fetch comprehensive user statistics
 */
export const useUserStats = () => {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery<UserStatsData>({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await fetch('/api/user/stats');

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || errorData?.error || 'Failed to fetch user stats');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};
