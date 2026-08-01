'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalExerciseKey } from '@/lib/exerciseLookup';
import type { LastPerformance } from '@/app/api/exercise/last-performance/route';

/**
 * What the user did the last time they trained each of these exercises.
 *
 * Shown as reference values against each set so progressive overload is
 * possible without remembering last week's numbers or digging through history.
 */
export function useLastPerformance(exerciseKeys: string[]) {
  // Sorted and de-duplicated so the query key is stable regardless of the order
  // exercises happen to appear in the template.
  const keys = Array.from(new Set(exerciseKeys.map(canonicalExerciseKey))).sort();

  return useQuery({
    queryKey: [...queryKeys.lastPerformance, keys],
    enabled: keys.length > 0,
    // Past sessions are immutable, so this is worth holding onto for a while.
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<Record<string, LastPerformance>> => {
      const params = new URLSearchParams({ keys: keys.join(',') });
      const response = await fetch(`/api/exercise/last-performance?${params}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Failed to load previous performance');
      const result = await response.json();
      return result.data.performances ?? {};
    },
  });
}
