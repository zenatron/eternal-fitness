'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks connectivity.
 *
 * `navigator.onLine` only tells you whether a network interface exists — it
 * reports true on captive-portal wifi and on a connection that drops every
 * packet, which is exactly the gym-wifi case this app has to survive. So the
 * flag is treated as a fast negative signal only, and confirmed with a real
 * request before we claim to be back online.
 */

/** Starts pessimistic on the server so SSR and first client paint agree. */
const PROBE_URL = '/api/auth/check';
const PROBE_TIMEOUT_MS = 4000;

async function probeConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const response = await fetch(PROBE_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
      credentials: 'same-origin',
    });
    clearTimeout(timeout);
    // Any answer at all — including 401 — proves the network is carrying traffic.
    return response.status > 0;
  } catch {
    return false;
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  /** True between losing the connection and confirming it is genuinely back. */
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    let cancelled = false;

    const handleOnline = async () => {
      setIsReconnecting(true);
      const reachable = await probeConnection();
      if (cancelled) return;
      setIsOnline(reachable);
      setIsReconnecting(false);
    };

    const handleOffline = () => {
      // Trust this one immediately: the OS is certain there is no interface.
      setIsOnline(false);
      setIsReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Coming back from the lock screen is the most common moment for the
    // connection to have silently changed underneath us.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !navigator.onLine) {
        setIsOnline(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { isOnline, isReconnecting };
}
