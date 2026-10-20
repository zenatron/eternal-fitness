'use client';

import { DB_NAME } from './db';
import { ACCENT_STORAGE_KEY } from '@/types/theme';

/**
 * Per-user client state that must not survive a sign-out.
 *
 * Everything here is keyed to "whoever is signed in on this device" without
 * actually being scoped to a user:
 *
 *  - the **outbox** holds queued mutations that would replay under the NEXT
 *    user's session cookie, crediting their workout (or worse) to them;
 *  - the **active workout** store is the same story for an in-progress one;
 *  - the **meta** store holds the persisted React Query cache, which user B
 *    would otherwise browse offline;
 *  - the service worker's **runtime caches** hold API responses and pages by
 *    URL, which the next user would be served offline;
 *  - **localStorage** carries the accent theme (a choice tied to whoever set
 *    it — carrying it into the next account pushed it to their profile) and
 *    the install-prompt counters.
 *
 * The wipe runs on the authenticated → unauthenticated transition (and on a
 * cold unauthenticated load that finds the marker below, for a browser that
 * died before it could wipe). Per-user namespacing would be the more surgical
 * design; a clean wipe is the correct one for a single-user-at-a-time device
 * and leaves nothing behind to get wrong.
 */

/** Set while any user is signed in; a cold unauthenticated load with this present wipes. */
export const HAD_SESSION_MARKER = 'eternal-had-session';

export async function wipeClientOfflineState(): Promise<void> {
  if (typeof window === 'undefined') return;

  // IndexedDB first and atomically: deleting the database clears the outbox,
  // the active workout and the persisted cache in one step, and a fresh DB is
  // recreated on demand by getDB() on the next sign-in.
  try {
    if ('indexedDB' in window) {
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = done;
        request.onerror = done;
        // Another tab or the service worker holding a connection must not hang
        // sign-out; the delete completes when they close.
        request.onblocked = done;
        // Failsafe so a stuck deletion can never block navigation.
        setTimeout(done, 2000);
      });
    }
  } catch (error) {
    console.error('[signout] Failed to delete offline database', error);
  }

  // The service worker's runtime caches are keyed by URL, not by user, so
  // /api/dashboard cached for one account was served to the next as the
  // offline fallback. Static and font caches are shared and harmless.
  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(
        names
          // Ours are versioned; Serwist's defaultCache uses fixed names.
          .filter((name) =>
            /^(api|pages|active-session)-v\d+$/.test(name) ||
            /^(apis|pages|pages-rsc|pages-rsc-prefetch|others|cross-origin)$/.test(name)
          )
          .map((name) => caches.delete(name))
      );
    }
  } catch (error) {
    console.error('[signout] Failed to clear runtime caches', error);
  }

  try {
    window.localStorage.removeItem(ACCENT_STORAGE_KEY);
    window.localStorage.removeItem(HAD_SESSION_MARKER);
    window.sessionStorage.clear();
  } catch (error) {
    console.error('[signout] Failed to clear web storage', error);
  }
}
