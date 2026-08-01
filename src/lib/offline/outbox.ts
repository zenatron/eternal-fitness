'use client';

import { getDB, isIndexedDBAvailable, type OutboxEntry } from './db';

/**
 * Durable queue for mutations that could not reach the server.
 *
 * Anything queued here survives a reload, a crash, or the tab being killed by
 * the OS, and is replayed either by the service worker's Background Sync
 * handler (see src/app/sw.ts) or by `flushOutbox` below on browsers without it.
 */

export const OUTBOX_SYNC_TAG = 'eternal-outbox-sync';

/** Fired on window whenever the queue length changes, so UI can react. */
export const OUTBOX_CHANGED_EVENT = 'eternal:outbox-changed';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OUTBOX_CHANGED_EVENT));
  }
}

export interface EnqueueOptions {
  url: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Shown in the "pending changes" UI. */
  description: string;
  /**
   * Stable key for de-duplication. Supplying the same key twice replaces the
   * earlier entry — right for "latest state wins" writes like syncing the
   * active workout, wrong for appends.
   */
  dedupeKey?: string;
}

export async function enqueue(options: EnqueueOptions): Promise<string | null> {
  if (!isIndexedDBAvailable()) return null;

  try {
    const db = await getDB();

    if (options.dedupeKey) {
      // Collapse superseded writes: only the newest snapshot of the active
      // workout is worth sending, and replaying ten of them wastes the battery
      // we are trying to save.
      const existing = await db.getAll('outbox');
      const stale = existing.filter((entry) => entry.id.startsWith(`${options.dedupeKey}::`));
      await Promise.all(stale.map((entry) => db.delete('outbox', entry.id)));
    }

    const id = options.dedupeKey ? `${options.dedupeKey}::${newId()}` : newId();

    const entry: OutboxEntry = {
      id,
      url: options.url,
      method: options.method,
      body: options.body === undefined ? null : JSON.stringify(options.body),
      headers: { 'Content-Type': 'application/json', ...options.headers },
      createdAt: Date.now(),
      attempts: 0,
      idempotencyKey: newId(),
      description: options.description,
    };

    await db.put('outbox', entry);
    notifyChanged();
    await requestSync();
    return id;
  } catch (error) {
    console.error('[outbox] Failed to enqueue', error);
    return null;
  }
}

export async function getPending(): Promise<OutboxEntry[]> {
  if (!isIndexedDBAvailable()) return [];
  try {
    const db = await getDB();
    return await db.getAllFromIndex('outbox', 'createdAt');
  } catch {
    return [];
  }
}

export async function getPendingCount(): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;
  try {
    const db = await getDB();
    return await db.count('outbox');
  } catch {
    return 0;
  }
}

export async function remove(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const db = await getDB();
    await db.delete('outbox', id);
    notifyChanged();
  } catch (error) {
    console.error('[outbox] Failed to remove entry', error);
  }
}

export async function clear(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const db = await getDB();
    await db.clear('outbox');
    notifyChanged();
  } catch (error) {
    console.error('[outbox] Failed to clear', error);
  }
}

/**
 * Ask the browser to replay the queue when connectivity returns. Background
 * Sync wakes the service worker even with no tab open; where it is unsupported
 * (Safari, Firefox) we fall back to flushing in the page.
 */
export async function requestSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (
        registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> };
        }
      ).sync.register(OUTBOX_SYNC_TAG);
      return;
    }
  } catch {
    // Registration can throw if permission is denied or we're in a private
    // window; fall through to the in-page flush.
  }

  if (navigator.onLine) {
    void flushOutbox();
  }
}

const MAX_ATTEMPTS = 8;

/**
 * In-page replay, used where Background Sync is unavailable and on regaining
 * connectivity while a tab is open.
 *
 * Entries are sent strictly in creation order and the loop stops at the first
 * network failure, because these mutations are causally ordered — a workout
 * completion must not land before the set data it summarises.
 */
export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (!isIndexedDBAvailable()) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  try {
    const db = await getDB();
    const entries = await db.getAllFromIndex('outbox', 'createdAt');

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

        if (response.ok) {
          await db.delete('outbox', entry.id);
          sent += 1;
        } else if (response.status >= 400 && response.status < 500) {
          // The server refused the payload itself. Retrying cannot help, and
          // leaving it queued would block every later write behind it.
          console.warn(
            `[outbox] Dropping rejected entry (${response.status}): ${entry.description}`
          );
          await db.delete('outbox', entry.id);
          failed += 1;
        } else {
          await db.put('outbox', { ...entry, attempts: entry.attempts + 1 });
          failed += 1;
          break;
        }
      } catch {
        if (entry.attempts + 1 >= MAX_ATTEMPTS) {
          await db.delete('outbox', entry.id);
          failed += 1;
        } else {
          await db.put('outbox', { ...entry, attempts: entry.attempts + 1 });
        }
        break;
      }
    }
  } catch (error) {
    console.error('[outbox] Flush failed', error);
  }

  if (sent > 0 || failed > 0) notifyChanged();
  return { sent, failed };
}

/**
 * Wraps fetch so a failed mutation is queued instead of lost.
 *
 * Returns the response when the request succeeds. When the network is
 * unavailable it enqueues and returns null, which callers treat as "accepted
 * locally, will sync later" — the optimistic local state has already been
 * written by that point.
 */
export async function fetchOrQueue(
  url: string,
  init: RequestInit & { description: string; dedupeKey?: string }
): Promise<Response | null> {
  const { description, dedupeKey, ...requestInit } = init;

  // Skip the doomed round-trip when the browser already knows we're offline.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await enqueue({
      url,
      method: requestInit.method ?? 'POST',
      body: requestInit.body ? JSON.parse(requestInit.body as string) : undefined,
      description,
      dedupeKey,
    });
    return null;
  }

  try {
    const response = await fetch(url, { ...requestInit, credentials: 'same-origin' });

    // 5xx is transient — queue it. 4xx is a real rejection the caller must see.
    if (response.status >= 500) {
      await enqueue({
        url,
        method: requestInit.method ?? 'POST',
        body: requestInit.body ? JSON.parse(requestInit.body as string) : undefined,
        description,
        dedupeKey,
      });
      return null;
    }

    return response;
  } catch {
    await enqueue({
      url,
      method: requestInit.method ?? 'POST',
      body: requestInit.body ? JSON.parse(requestInit.body as string) : undefined,
      description,
      dedupeKey,
    });
    return null;
  }
}
