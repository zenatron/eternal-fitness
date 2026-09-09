'use client';

import { useEffect, useState } from 'react';

/**
 * A wall-clock reading that re-renders only the component that calls it, once
 * per interval, plus immediately when the tab becomes visible again (browsers
 * throttle or suspend timers in background tabs, so the value would otherwise
 * sit stale on return).
 *
 * This deliberately lives in the components that *display* a running clock, not
 * in ActiveWorkoutProvider: a provider-level tick used to re-render the entire
 * 800-line workout screen every second for the sake of one duration string.
 */
export function useTickingNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
}
