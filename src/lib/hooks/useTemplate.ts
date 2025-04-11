import { useQuery } from '@tanstack/react-query';
import { WorkoutTemplate, WorkoutTemplateWithSets } from '@/types/workout';

/**
 * Custom hook to fetch and provide a single workout template
 */
export const useTemplate = (templateId: string) => {
  const {
    data: template,
    isLoading,
    error,
    refetch
  } = useQuery<WorkoutTemplateWithSets>({
    queryKey: ['template', templateId],
    queryFn: async () => {
      const response = await fetch(`/api/template/${templateId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch template');
      }
      
      const result = await response.json();
      return result.data;
    },
    staleTime: 60 * 1000,
    enabled: !!templateId,
  });

  return {
    template,
    isLoading,
    error,
    refetch
  };
};