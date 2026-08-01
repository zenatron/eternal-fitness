'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Holds the screen awake during a workout.
 *
 * Without this the phone locks between sets and you have to unlock it with
 * chalky hands every ninety seconds, which is the single most irritating thing
 * about tracking lifts on a phone.
 *
 * The lock is released automatically by the browser whenever the page is
 * hidden, so it has to be re-acquired on `visibilitychange` — that is not
 * optional, it is the normal lifecycle.
 */

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  }, []);

  const acquire = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    if (sentinelRef.current && !sentinelRef.current.released) return;
    // Requesting while hidden always throws; wait for the visibility handler.
    if (document.visibilityState !== 'visible') return;

    try {
      const wakeLock = (
        navigator as Navigator & {
          wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
        }
      ).wakeLock;

      const sentinel = await wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setIsActive(true);

      sentinel.addEventListener('release', () => {
        setIsActive(false);
      });
    } catch {
      // Denied, or the device is in low-power mode. Non-fatal: the workout
      // still works, the screen just sleeps as usual.
      setIsActive(false);
    }
  }, []);

  const release = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    setIsActive(false);
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        /* already gone */
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      void release();
      return;
    }

    void acquire();

    // Re-acquire after the page comes back: the browser drops the lock on hide.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      void release();
    };
  }, [enabled, acquire, release]);

  return { isActive, isSupported };
}
