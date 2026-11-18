import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { StrengthInsights } from '@/utils/strengthInsights';

export type InsightsPeriod = '90d' | '180d' | '1y' | 'all';

export interface InsightsResponse extends StrengthInsights {
  period: InsightsPeriod;
  truncated: boolean;
}

/**
 * Strength trends for a window. Derived from completed sessions only, so it
 * moves with workout completions and edits (see invalidateWorkoutData).
 */
export function useInsights(period: InsightsPeriod, enabled = true) {
  return useQuery<InsightsResponse>({
    queryKey: [...queryKeys.insights, period],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/insights?period=${period}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to load insights');
      return (await res.json()).data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
}
