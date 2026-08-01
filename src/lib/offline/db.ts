'use client';

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ActiveWorkoutSessionData } from '@/types/workout';

/**
 * Client-side durable storage.
 *
 * The schema here is mirrored by hand inside src/app/sw.ts (the service worker
 * cannot import from the app bundle) — keep DB_NAME, DB_VERSION and the
 * `outbox` store shape in sync across the two files.
 */

export const DB_NAME = 'eternal-fitness-offline';
export const DB_VERSION = 1;

export interface OutboxEntry {
  /** Client-generated id, also used as the primary key. */
  id: string;
  url: string;
  method: string;
  body: string | null;
  headers: Record<string, string>;
  createdAt: number;
  attempts: number;
  /**
   * Sent as the Idempotency-Key header. The server records it so a replayed
   * request after a timeout resolves to the original result instead of writing
   * a second workout.
   */
  idempotencyKey: string;
  /** Human-readable label for the pending-changes UI. */
  description: string;
}

/** The locally-owned copy of an in-progress workout. */
export interface StoredActiveWorkout {
  key: 'current';
  data: ActiveWorkoutSessionData;
  /** Local monotonic counter, incremented on every local edit. */
  localVersion: number;
  /** localVersion at the time of the last successful push to the server. */
  syncedVersion: number;
  updatedAt: number;
}

interface EternalDB extends DBSchema {
  outbox: {
    key: string;
    value: OutboxEntry;
    indexes: { createdAt: number };
  };
  activeWorkout: {
    key: string;
    value: StoredActiveWorkout;
  };
  /** Small key/value bag: last-sync timestamps, dismissed prompts, etc. */
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<EternalDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<EternalDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable on the server'));
  }
  if (!dbPromise) {
    dbPromise = openDB<EternalDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('outbox')) {
          const outbox = db.createObjectStore('outbox', { keyPath: 'id' });
          outbox.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('activeWorkout')) {
          db.createObjectStore('activeWorkout', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
      blocked() {
        console.warn('[offline] Upgrade blocked by another open tab');
      },
    });
  }
  return dbPromise;
}

/** Feature detection — private browsing modes can disable IndexedDB entirely. */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

/* ── Active workout ─────────────────────────────────────────────────────── */

export async function readActiveWorkout(): Promise<StoredActiveWorkout | undefined> {
  if (!isIndexedDBAvailable()) return undefined;
  try {
    const db = await getDB();
    return await db.get('activeWorkout', 'current');
  } catch (error) {
    console.error('[offline] Failed to read active workout', error);
    return undefined;
  }
}

export async function writeActiveWorkout(
  data: ActiveWorkoutSessionData,
  options: { synced?: boolean } = {}
): Promise<StoredActiveWorkout | undefined> {
  if (!isIndexedDBAvailable()) return undefined;
  try {
    const db = await getDB();
    const existing = await db.get('activeWorkout', 'current');
    const localVersion = (existing?.localVersion ?? 0) + 1;
    const record: StoredActiveWorkout = {
      key: 'current',
      data,
      localVersion,
      // A write that came from the server is already in sync; a local edit is not.
      syncedVersion: options.synced ? localVersion : existing?.syncedVersion ?? 0,
      updatedAt: Date.now(),
    };
    await db.put('activeWorkout', record);
    return record;
  } catch (error) {
    console.error('[offline] Failed to persist active workout', error);
    return undefined;
  }
}

/** Records that everything up to `version` has reached the server. */
export async function markActiveWorkoutSynced(version: number): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const db = await getDB();
    const existing = await db.get('activeWorkout', 'current');
    if (!existing) return;
    await db.put('activeWorkout', {
      ...existing,
      syncedVersion: Math.max(existing.syncedVersion, version),
    });
  } catch (error) {
    console.error('[offline] Failed to mark synced', error);
  }
}

export async function clearActiveWorkout(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const db = await getDB();
    await db.delete('activeWorkout', 'current');
  } catch (error) {
    console.error('[offline] Failed to clear active workout', error);
  }
}

/* ── Meta ───────────────────────────────────────────────────────────────── */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  if (!isIndexedDBAvailable()) return undefined;
  try {
    const db = await getDB();
    const row = await db.get('meta', key);
    return row?.value as T | undefined;
  } catch {
    return undefined;
  }
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    const db = await getDB();
    await db.put('meta', { key, value });
  } catch (error) {
    console.error('[offline] Failed to write meta', error);
  }
}
