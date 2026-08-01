/// <reference lib="webworker" />
/// <reference types="@serwist/next/typings" />

/**
 * Eternal Fitness service worker.
 *
 * Compiled by @serwist/next (see next.config.mjs) from this file into
 * public/sw.js at build time, with the precache manifest injected.
 *
 * Caching policy, in short:
 *  - App shell / navigations: network-first, falling back to cache and then to
 *    the /offline page. A gym basement is the target environment.
 *  - Build assets: cache-first — they are content-hashed and immutable.
 *  - Read APIs: stale-while-revalidate so the dashboard paints instantly, with
 *    a cache fallback that carries an explicit staleness header.
 *  - Write APIs: never cached. Failed writes are handed to the outbox in
 *    IndexedDB and replayed via Background Sync (see lib/offline/outbox.ts).
 */
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_URL = '/offline';

/**
 * Bumped when cache shapes change, to force old caches out.
 *
 * v2: v1 could mediate the OAuth handshake and cache redirect responses from
 * it. Bumping evicts anything poisoned by that.
 */
const VERSION = 'v2';

/**
 * Requests the service worker must not touch at all.
 *
 * The OAuth handshake is single-use and stateful: the authorization redirect
 * and the callback each carry one-shot parameters, and the callback is an
 * opaque cross-origin redirect. A worker sitting in the middle of that can
 * duplicate, re-serve or mangle it, and the failure looks like an unrelated
 * "state missing" error from the provider. There is nothing to gain by caching
 * any of it, so it bypasses the worker entirely.
 */
function isAuthRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/auth');
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // We control activation explicitly via the SKIP_WAITING message below, so the
  // user is never swapped onto a new build mid-set.
  skipWaiting: false,
  clientsClaim: true,
  // Navigation preload is deliberately OFF. It only pays off if the fetch
  // handler consumes `event.preloadResponse`, and these strategies do not — so
  // enabling it issued a second, parallel network request for every navigation.
  // For a single-use OAuth callback that duplicate is not merely wasteful: the
  // first request consumes the state and the second fails.
  navigationPreload: false,
  disableDevLogs: true,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
  runtimeCaching: [
    // ── Writes: never cached, never served stale ──
    // A stale POST response would be catastrophic (double-logged workouts), so
    // these are strictly network-only. Offline durability is the outbox's job,
    // not the cache's.
    {
      matcher: ({ request, url }) => request.method !== 'GET' && !isAuthRequest(url),
      handler: new NetworkOnly(),
    },

    // ── Active workout state: always fresh, brief cache as a safety net ──
    // This is the highest-stakes read in the app; a stale copy could resurrect a
    // finished workout, so the network wins whenever it can answer in time.
    {
      matcher: ({ url }) => url.pathname.startsWith('/api/session/active'),
      handler: new NetworkFirst({
        cacheName: `active-session-${VERSION}`,
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 60 * 60 }),
        ],
      }),
    },

    // ── Read APIs: stale-while-revalidate ──
    // Dashboard, templates, progress, PRs. Painting instantly from cache and
    // refreshing behind the scenes is exactly right for this data — a
    // few-seconds-old volume total is harmless.
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith('/api/') &&
        request.method === 'GET' &&
        !isAuthRequest(url),
      handler: new StaleWhileRevalidate({
        cacheName: `api-${VERSION}`,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 7,
            purgeOnQuotaError: true,
          }),
          {
            // Mark responses served without a live network hit, so the UI can
            // show an "offline — showing saved data" affordance instead of
            // pretending the numbers are current.
            cachedResponseWillBeUsed: async ({ cachedResponse }) => {
              if (!cachedResponse) return cachedResponse;
              const headers = new Headers(cachedResponse.headers);
              headers.set('X-Served-From-Cache', '1');
              return new Response(await cachedResponse.clone().blob(), {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers,
              });
            },
          },
        ],
      }),
    },

    // ── Immutable build output ──
    {
      matcher: ({ url }) =>
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.startsWith('/icons/') ||
        url.pathname.startsWith('/splash/'),
      handler: new CacheFirst({
        cacheName: `static-${VERSION}`,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 256,
            maxAgeSeconds: 60 * 60 * 24 * 365,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },

    // ── Google Fonts ──
    {
      matcher: ({ url }) =>
        url.origin === 'https://fonts.googleapis.com' ||
        url.origin === 'https://fonts.gstatic.com',
      handler: new CacheFirst({
        cacheName: `fonts-${VERSION}`,
        plugins: [
          new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
      }),
    },

    // ── Navigations ──
    // Network-first keeps deploys visible immediately; the cache and then the
    // offline page catch the gym-basement case.
    {
      // Auth navigations are excluded: the OAuth callback is a navigation, and
      // caching or replaying it breaks the handshake.
      matcher: ({ request, url }) => request.mode === 'navigate' && !isAuthRequest(url),
      handler: new NetworkFirst({
        cacheName: `pages-${VERSION}`,
        networkTimeoutSeconds: 4,
        plugins: [
          new ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
      }),
    },

    ...defaultCache,
  ],
});

/*
 * Registered BEFORE serwist.addEventListeners() so it runs first.
 *
 * Calling neither respondWith() nor any strategy leaves the request to the
 * browser's own networking, and stopImmediatePropagation() prevents Serwist's
 * handler — and anything in `defaultCache` — from claiming it afterwards. This
 * is a stronger guarantee than a NetworkOnly route, which still routes the
 * request through the worker and can interfere with opaque redirects.
 */
self.addEventListener('fetch', (event) => {
  if (isAuthRequest(new URL(event.request.url))) {
    event.stopImmediatePropagation();
  }
});

serwist.addEventListeners();

/* ────────────────────────────────────────────────────────────────────────────
 * Background Sync — replay the outbox
 *
 * The page writes failed mutations to IndexedDB and registers a 'sync' tag.
 * When connectivity returns the browser wakes this worker even if no tab is
 * open, so a workout logged in airplane mode reaches the server on its own.
 * ──────────────────────────────────────────────────────────────────────────── */

const OUTBOX_DB = 'eternal-fitness-offline';
const OUTBOX_DB_VERSION = 1;
const OUTBOX_STORE = 'outbox';
export const OUTBOX_SYNC_TAG = 'eternal-outbox-sync';

interface OutboxEntry {
  id: string;
  url: string;
  method: string;
  body: string | null;
  headers: Record<string, string>;
  createdAt: number;
  attempts: number;
  /** Dedupe key — the server treats repeats of the same key as one write. */
  idempotencyKey: string;
}

function openOutbox(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OUTBOX_DB, OUTBOX_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readOutbox(db: IDBDatabase): Promise<OutboxEntry[]> {
  const tx = db.transaction(OUTBOX_STORE, 'readonly');
  const store = tx.objectStore(OUTBOX_STORE);
  const entries = await idbRequest(store.index('createdAt').getAll());
  return entries as OutboxEntry[];
}

async function deleteEntry(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction(OUTBOX_STORE, 'readwrite');
  await idbRequest(tx.objectStore(OUTBOX_STORE).delete(id));
}

async function bumpAttempts(db: IDBDatabase, entry: OutboxEntry): Promise<void> {
  const tx = db.transaction(OUTBOX_STORE, 'readwrite');
  await idbRequest(
    tx.objectStore(OUTBOX_STORE).put({ ...entry, attempts: entry.attempts + 1 })
  );
}

/** Give up on an entry rather than retrying forever and burning battery. */
const MAX_ATTEMPTS = 8;

async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  const db = await openOutbox();
  const entries = await readOutbox(db);
  let sent = 0;
  let failed = 0;

  // Sequential, in creation order: these mutations are causally ordered (you
  // cannot complete a workout before the sets that make it up have landed).
  for (const entry of entries) {
    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: {
          ...entry.headers,
          'Idempotency-Key': entry.idempotencyKey,
          'X-Replayed-From-Outbox': '1',
        },
        body: entry.body,
        credentials: 'same-origin',
      });

      // 4xx means the server rejected the payload itself — replaying will never
      // succeed, so drop it rather than blocking everything behind it.
      // 5xx and network errors are worth another attempt.
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        await deleteEntry(db, entry.id);
        if (response.ok) sent += 1;
        else failed += 1;
      } else {
        await bumpAttempts(db, entry);
        failed += 1;
        break;
      }
    } catch {
      if (entry.attempts + 1 >= MAX_ATTEMPTS) {
        await deleteEntry(db, entry.id);
        failed += 1;
      } else {
        await bumpAttempts(db, entry);
      }
      // Still offline — stop and let the next sync event pick up where we left off.
      break;
    }
  }

  db.close();

  if (sent > 0) {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'OUTBOX_FLUSHED', sent, failed });
    }
  }

  return { sent, failed };
}

self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === OUTBOX_SYNC_TAG) {
    syncEvent.waitUntil(flushOutbox());
  }
});

/* ────────────────────────────────────────────────────────────────────────────
 * Periodic Background Sync — streak guard
 * Chrome-only and permission-gated; a no-op elsewhere.
 * ──────────────────────────────────────────────────────────────────────────── */
self.addEventListener('periodicsync', (event) => {
  const periodicEvent = event as SyncEvent;
  if (periodicEvent.tag === 'eternal-streak-check') {
    periodicEvent.waitUntil(flushOutbox());
  }
});

/* ────────────────────────────────────────────────────────────────────────────
 * Push notifications
 * ──────────────────────────────────────────────────────────────────────────── */

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  /** Renotify with vibration — used for rest-timer alerts. */
  urgent?: boolean;
  actions?: { action: string; title: string }[];
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: 'Eternal Fitness', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: payload.tag ?? 'eternal-fitness',
      renotify: Boolean(payload.tag),
      requireInteraction: payload.urgent ?? false,
      vibrate: payload.urgent ? [200, 100, 200, 100, 300] : [100],
      data: { url: payload.url ?? '/' },
      actions: payload.actions,
    } as NotificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data?.url as string | undefined) ?? '/';

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Prefer focusing an existing tab over opening a duplicate.
      for (const client of clients) {
        const url = new URL(client.url);
        if (url.pathname === target && 'focus' in client) {
          return client.focus();
        }
      }
      for (const client of clients) {
        if ('navigate' in client && 'focus' in client) {
          await client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});

/* ────────────────────────────────────────────────────────────────────────────
 * Messages from the page
 * ──────────────────────────────────────────────────────────────────────────── */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  switch (data.type) {
    case 'SKIP_WAITING':
      // Sent only after the user accepts the update prompt.
      void self.skipWaiting();
      break;

    case 'FLUSH_OUTBOX':
      // Manual kick for browsers without Background Sync (notably Safari).
      event.waitUntil?.(flushOutbox());
      break;

    case 'SHOW_NOTIFICATION':
      // Local notification (rest timer finished) while the app is backgrounded.
      event.waitUntil?.(
        self.registration.showNotification(data.title, {
          body: data.body,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-96.png',
          tag: data.tag ?? 'eternal-local',
          renotify: true,
          vibrate: data.vibrate ?? [200, 100, 200],
          silent: false,
          data: { url: data.url ?? '/' },
        } as NotificationOptions)
      );
      break;
  }
});
