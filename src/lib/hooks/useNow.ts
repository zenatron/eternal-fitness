'use client';

import { useEffect, useState } from 'react';

/**
 * A clock that re-renders the component on an interval.
 *
 * Relative labels ("12m ago") are derived at render time, but React has no
 * reason to re-render when the only thing that changed is the wall clock. On a
 * PWA left open on the dashboard that meant a timestamp froze at whatever it
 * said when the data arrived. This drives those labels forward.
 *
 * Starts from `null` and fills in after mount so server and client markup agree;
 * callers should fall back to `Date.now()` for the first paint, which is what
 * the formatters already do when passed `undefined`.
 */
export function useNow(intervalMs = 60_000): number | undefined {
  const [now, setNow] = useState<number | undefined>(undefined);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);

    // Coming back from a backgrounded tab, intervals may have been throttled to
    // nothing — refresh immediately rather than waiting out another tick.
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
}
