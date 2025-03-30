import { useQuery } from '@tanstack/react-query';
import { Workout } from '@/types/workout';

/**
 * Custom hook to fetch and provide all user workouts
 */
export const useWorkouts = () => {
  const {
    data: workouts = [],
    isLoading,
    error,
    refetch
  } = useQuery<Workout[]>({
    queryKey: ['workouts'],
    queryFn: async () => {
      const response = await fetch('/api/workout');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch workouts');
      }
      
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    workouts,
    isLoading,
    error,
    refetch
  };
}; 