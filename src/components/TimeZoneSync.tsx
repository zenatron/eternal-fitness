'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { deviceTimeZone } from '@/utils/datetime';

const STORAGE_KEY = 'ef.reportedTimeZone';

/**
 * Keeps `users.timeZone` in step with the device.
 *
 * The server decides which calendar day a workout counts toward — streaks,
 * monthly totals, the activity grid — and it runs in a UTC container, so it can
 * only get that right if it is told the user's zone. Nothing asks the user for
 * it; the browser already knows.
 *
 * Writes only when the zone differs from what this device last reported, so the
 * normal case costs one localStorage read rather than a request per page load.
 * Travel and the DST-driven zone changes some platforms report are picked up on
 * the next mount. The reported value is cleared on sign-out by nothing in
 * particular — it is keyed to the device, not the account, and a wrong cached
 * value can only cost one redundant PATCH.
 */
export function TimeZoneSync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;

    const zone = deviceTimeZone();

    let lastReported: string | null = null;
    try {
      lastReported = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Private browsing with storage disabled: fall through and just report.
    }
    if (lastReported === zone) return;

    void fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeZone: zone }),
    })
      .then((res) => {
        if (!res.ok) return;
        try {
          window.localStorage.setItem(STORAGE_KEY, zone);
        } catch {
          // Not fatal — we retry on the next mount.
        }
      })
      // Offline, or mid-setup with no user row yet. Neither is worth surfacing:
      // the zone is a background detail and the next load will try again.
      .catch(() => {});
  }, [status]);

  return null;
}
