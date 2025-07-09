import { useQuery } from '@tanstack/react-query';
import { WorkoutTemplate } from '@/types/workout';

// 🚀 FETCH JSON-BASED TEMPLATES
const fetchTemplates = async (): Promise<WorkoutTemplate[]> => {
  const response = await fetch('/api/template');

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: { message: 'Failed to parse error response' } }));
    throw new Error(errorBody?.error?.message || `HTTP error ${response.status}`);
  }

  const { data } = await response.json();

  if (!data) {
    console.error("Invalid API response structure received from /api/template:", data);
    throw new Error('Invalid API response structure for templates');
  }

  console.log(`✅ Fetched ${data.length} JSON-based templates from API`);
  return data;
};

/**
 * 🚀 Custom hook to fetch and provide all user JSON-based workout templates
 */
export function useTemplates() {
  return useQuery<WorkoutTemplate[], Error>({
    queryKey: ['json-templates'],
    queryFn: fetchTemplates,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}