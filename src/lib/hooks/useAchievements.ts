import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { AchievementCategory } from '@/types/achievements';
import type { AchievementData } from '@/components/ui/profile/Achievements';

/** Shape returned by GET /api/user/achievements (envelope unwrapped). */
export interface AchievementsData {
  /** Achievement details grouped by category. */
  achievements: Record<AchievementCategory, AchievementData[]>;
  unlockedCount: number;
  totalCount: number;
  currentProgress: Record<string, number>;
}

/**
 * Materialized achievement state (progress is persisted server-side on every
 * workout write), so this is a cheap read — cached and deduped like every other
 * query. It used to be a bare `useEffect` + `fetch` on the profile page,
 * refetching on every mount and bypassing the cache entirely.
 */
export function useAchievements() {
  const { data, isLoading, error } = useQuery<AchievementsData>({
    queryKey: queryKeys.achievements,
    queryFn: async () => {
      const response = await fetch('/api/user/achievements');

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to fetch achievements');
      }

      const result = await response.json();
      return result.data as AchievementsData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    achievements: data ?? null,
    loading: isLoading,
    error,
  };
}
