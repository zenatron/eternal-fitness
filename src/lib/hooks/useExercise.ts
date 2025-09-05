import { useQuery } from '@tanstack/react-query';

/**
 * Custom hook to fetch and provide exercise data from the API
 */
export const useExercise = (exerciseId: string) => {
  const {
    data: exercise,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
      const response = await fetch(`/api/exercise/${exerciseId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to fetch exercise data');
      }
      const result = await response.json();
      return result.data; // Extract data from the new API response format
    },
  });

  return { exercise, isLoading, error };
};
