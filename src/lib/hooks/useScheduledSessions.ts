import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { WorkoutSession } from '@/types/workout';

/**
 * Upcoming scheduled sessions.
 *
 * Fetched through React Query rather than a bare `useEffect` so it takes part in
 * cache invalidation like everything else. As a `useEffect` it could only be
 * refreshed by remounting, which is why scheduling a workout used to call
 * `window.location.reload()` — a full page reload, discarding scroll position
 * and every other cache, to update one list.
 */
export function useScheduledSessions() {
  const { data, isLoading, error, refetch } = useQuery<WorkoutSession[]>({
    queryKey: queryKeys.scheduledSessions,
    queryFn: async () => {
      const response = await fetch('/api/session/scheduled');
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const result = await response.json();
      return result.data || [];
    },
  });

  return { sessions: data ?? [], isLoading, error: error ?? null, refetch };
}
