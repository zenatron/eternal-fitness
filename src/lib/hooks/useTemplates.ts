import { useQuery } from '@tanstack/react-query';
import { WorkoutTemplate } from '@/types/workout';

/**
 * Custom hook to fetch and provide all user workout templates
 */
export const useTemplates = () => {
  const {
    data: templates = [],
    isLoading,
    error,
    refetch
  } = useQuery<WorkoutTemplate[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await fetch('/api/template');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch templates');
      }
      
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    templates,
    isLoading,
    error,
    refetch
  };
}; 