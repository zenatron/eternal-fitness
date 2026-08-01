'use client';

import { useEffect, useMemo, useState } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import { useQuery } from '@tanstack/react-query';
import type { RecoveryLoadEvent } from '@/app/api/recovery/route';
import { computeRecovery, type RecoveryMap } from '@/utils/recovery';

/**
 * Current recovery state, derived client-side from server-supplied load events.
 *
 * The split matters: the load per session is fixed once a workout is logged and
 * caches well, while freshness depends on the current time and would go stale
 * in any cache. Recomputing locally also means the map keeps moving on a page
 * left open, without polling.
 */

/**
 * How often to recompute. Freshness changes on the scale of hours, so this is
 * about not letting an open tab drift by a whole afternoon, not about smooth
 * animation.
 */
const RECOMPUTE_INTERVAL_MS = 5 * 60 * 1000;

export function useRecovery(days = 14) {
  const query = useQuery<{ events: RecoveryLoadEvent[]; days: number }>({
    queryKey: [...queryKeys.recovery, days],
    queryFn: async () => {
      const res = await fetch(`/api/recovery?days=${days}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? 'Failed to load recovery data');
      }
      return (await res.json()).data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Ticks purely to re-derive the map against a newer clock.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), RECOMPUTE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const recovery: RecoveryMap | undefined = useMemo(() => {
    if (!query.data) return undefined;
    return computeRecovery(query.data.events, new Date());
    // `tick` is intentionally a dependency: it is the only thing that changes
    // when time passes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, tick]);

  return {
    recovery,
    events: query.data?.events,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
