import { useQuery } from '@tanstack/react-query';
import { WorkoutTemplateWithSets } from '@/types/workout';

const fetchTemplates = async (): Promise<WorkoutTemplateWithSets[]> => {
  const response = await fetch('/api/template');

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: { message: 'Failed to parse error response' } }));
    throw new Error(errorBody?.error?.message || `HTTP error ${response.status}`);
  }

  const { data } = await response.json();
  
  if (!response || !data) {
    console.error("Invalid API response structure received from /api/template:", data);
    throw new Error('Invalid API response structure for templates');
  }
  return data;
};

/**
 * Custom hook to fetch and provide all user workout templates
 */
export function useTemplates() {
  return useQuery<WorkoutTemplateWithSets[], Error>({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}