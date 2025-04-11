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
    queryFn: () =>
      fetch(`/api/exercise/${exerciseId}`).then((res) => res.json()),
  });

  return { exercise, isLoading, error };
};
