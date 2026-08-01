import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Custom hook to fetch and provide exercise data from the API
 */
export const useExercise = (exerciseId: string) => {
  const {
    data: exercise,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...queryKeys.exercise, exerciseId],
    queryFn: () =>
      fetch(`/api/exercise/${exerciseId}`).then((res) => res.json()),
  });

  return { exercise, isLoading, error };
};
