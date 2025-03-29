import { useQuery } from '@tanstack/react-query';
import { Workout } from '@/types/workout';

/**
 * Custom hook to fetch and provide a single workout
 */
export const useWorkout = (workoutId: string) => {
  const {
    data: workout,
    isLoading,
    error,
    refetch
  } = useQuery<Workout>({
    queryKey: ['workout', workoutId],
    queryFn: async () => {
      const response = await fetch(`/api/workout/${workoutId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch workout');
      }
      
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    enabled: !!workoutId, // Only run if workoutId exists
  });

  return {
    workout,
    isLoading,
    error,
    refetch
  };
}; 