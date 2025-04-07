import { useQuery } from '@tanstack/react-query';
import { WorkoutTemplate } from '@/types/workout';

/**
 * Custom hook to fetch and provide a single workout template
 */
export const useTemplate = (templateId: string) => {
  const {
    data: template,
    isLoading,
    error,
    refetch
  } = useQuery<WorkoutTemplate>({
    queryKey: ['template', templateId],
    queryFn: async () => {
      const response = await fetch(`/api/template/${templateId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to fetch template');
      }
      
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: !!templateId, // Only run if templateId exists
  });

  return {
    template,
    isLoading,
    error,
    refetch
  };
}; 