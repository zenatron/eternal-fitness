'use client';

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { getDB, isIndexedDBAvailable } from './db';

/**
 * Persists the React Query cache to IndexedDB so a cold launch with no network
 * still paints real data instead of empty skeletons.
 *
 * IndexedDB rather than localStorage: the cache holds full session history and
 * template blobs, which blow past localStorage's ~5MB budget, and writing it
 * synchronously on the main thread would jank every navigation.
 */

const CACHE_KEY = 'react-query-cache';

/**
 * Resolved once React has hydrated. Cache restoration waits on this.
 *
 * Without the gate, restoration can finish before hydration, so the client's
 * first render has data the server never had — pages that show a skeleton while
 * loading then render real content instead, and React reports a hydration
 * mismatch and throws away the server tree. Deferring the restore turns that
 * into an ordinary post-hydration state update.
 */
let signalHydrated: () => void = () => {};
const hydrated = new Promise<void>((resolve) => {
  signalHydrated = resolve;
});

export function markHydrated() {
  signalHydrated();
}

export function createQueryPersister() {
  if (!isIndexedDBAvailable()) return undefined;

  const persister = createAsyncStoragePersister({
    key: CACHE_KEY,
    // Batches rapid invalidations into one write.
    throttleTime: 1000,
    storage: {
      getItem: async (key) => {
        try {
          const db = await getDB();
          const row = await db.get('meta', key);
          return (row?.value as string | undefined) ?? null;
        } catch {
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          const db = await getDB();
          await db.put('meta', { key, value });
        } catch (error) {
          // Quota exhaustion must not take the app down; the cache is an
          // optimisation, and the network still works.
          console.warn('[query-persist] Failed to write cache', error);
        }
      },
      removeItem: async (key) => {
        try {
          const db = await getDB();
          await db.delete('meta', key);
        } catch {
          /* nothing meaningful to do */
        }
      },
    },
  });

  return {
    ...persister,
    restoreClient: async () => {
      await hydrated;
      return persister.restoreClient();
    },
  };
}

/** Cached data older than this is discarded rather than shown. */
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

/**
 * Bumping this invalidates every persisted cache — do it when a query's shape
 * changes, or restored data will be deserialised into the wrong type.
 *
 * v2: the dashboard's `recentActivity` entries carry `completedAt` +
 * `volumeLabel` instead of the pre-rendered `timeAgo` / `details` strings. A
 * cache restored from v1 would render those fields as blank.
 */
export const PERSIST_BUSTER = 'v2';
