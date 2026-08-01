'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateWorkoutData } from '@/lib/queryKeys';
import { useSession } from 'next-auth/react';
import type {
  ActiveSessionUpdatePayload,
  ActiveWorkoutSessionData,
  ExercisePerformance,
  WorkoutTemplateData,
} from '@/types/workout';
import {
  clearActiveWorkout,
  markActiveWorkoutSynced,
  readActiveWorkout,
  writeActiveWorkout,
} from '@/lib/offline/db';
import { enqueue, flushOutbox, getPendingCount, OUTBOX_CHANGED_EVENT } from '@/lib/offline/outbox';

/**
 * Single source of truth for the in-progress workout.
 *
 * Two properties matter more than anything else here:
 *
 *  1. **It is offline-first.** Every edit lands in IndexedDB synchronously
 *     before any network call is attempted, so a set is never lost to a dead
 *     connection, a killed tab, or a crash. The server is a replica that we
 *     converge on, not the place the data lives.
 *
 *  2. **It is a singleton.** This used to be a plain hook, and both the global
 *     ActiveWorkoutIndicator and the session page called it — giving two
 *     independent fetches, two one-second intervals, and two unshared copies of
 *     state that visibly drifted apart. There is now exactly one of each.
 */

/** How the local copy relates to the server right now. */
export type SyncState =
  | 'idle' // everything is on the server
  | 'pending' // local edits waiting for the debounce to fire
  | 'syncing' // request in flight
  | 'offline' // queued in the outbox, will replay on reconnect
  | 'error'; // server rejected the write

interface ActiveWorkoutContextValue {
  activeWorkout: ActiveWorkoutSessionData | null;
  isLoading: boolean;
  isSyncing: boolean;
  syncState: SyncState;
  /** Number of mutations queued in the outbox. */
  pendingCount: number;
  hasActiveWorkout: boolean;
  isTimerActive: boolean;
  /** Live-updating "M:SS" / "H:MM:SS" string for the session clock. */
  formatWorkoutDuration: string;
  /** Elapsed active seconds, excluding paused time. */
  getWorkoutDuration: () => number;
  startWorkout: (
    templateId: string,
    templateName: string,
    template?: WorkoutTemplateData
  ) => Promise<void>;
  updateWorkout: (updates: ActiveSessionUpdatePayload) => void;
  updatePerformance: (performance: { [exerciseId: string]: ExercisePerformance }) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateExerciseProgress: (exerciseProgress: { [exerciseId: string]: any }) => void;
  updateSessionNotes: (sessionNotes: string) => void;
  updateModifiedTemplate: (modifiedTemplate: WorkoutTemplateData) => void;
  toggleTimer: () => void;
  endWorkout: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  completeWorkout: (duration?: number, notes?: string) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recoverSession: (templateId: string, forceRecover?: boolean) => Promise<any>;
  /** Forces an immediate push, bypassing the debounce. */
  flushNow: () => Promise<void>;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null);

const SYNC_DEBOUNCE_MS = 1000;
const LEGACY_STORAGE_KEY = 'eternal-fitness-active-workout';

/* ── Timing ──────────────────────────────────────────────────────────────────
 * The original model stored `pausedTime` and re-derived elapsed time from
 * `startedAt`, which double-counted every segment before a pause — the clock
 * jumped forward each time you resumed. We instead track completed active
 * segments plus the start of the current one, which is unambiguous.
 *
 * Both fields are optional so sessions written by the old code still load; see
 * `normalizeTiming`.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Local state uses `undefined` for "no value"; the wire payload
 * (ActiveSessionUpdatePayload) additionally allows `null` to mean "clear this
 * field", since JSON.stringify drops undefined keys. `toLocalPatch` bridges the
 * two.
 */
type ActiveWorkout = ActiveWorkoutSessionData;

type LocalPatch = Partial<ActiveWorkout>;

function toLocalPatch(updates: ActiveSessionUpdatePayload): LocalPatch {
  const patch: LocalPatch = { ...updates } as LocalPatch;
  if (updates.lastPauseTime === null) patch.lastPauseTime = undefined;
  if (updates.segmentStartedAt === null) patch.segmentStartedAt = undefined;
  return patch;
}

function toDate(value: string | Date | undefined): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

/** Backfills the timing fields for sessions written before this model existed. */
function normalizeTiming(workout: ActiveWorkout): ActiveWorkout {
  if (workout.accumulatedSeconds !== undefined) return workout;

  const startedAt = toDate(workout.startedAt) ?? new Date();
  // Under the old model `pausedTime` had accumulated total elapsed time at each
  // pause, so it is the best available estimate of work done so far.
  const accumulated = workout.pausedTime ?? 0;

  return {
    ...workout,
    accumulatedSeconds: accumulated,
    segmentStartedAt: workout.isTimerActive
      ? (toDate(workout.lastPauseTime) ?? startedAt)
      : undefined,
  };
}

function elapsedSeconds(workout: ActiveWorkout | null): number {
  if (!workout) return 0;
  const accumulated = workout.accumulatedSeconds ?? 0;
  if (!workout.isTimerActive) return Math.max(0, Math.floor(accumulated));

  const segmentStart = toDate(workout.segmentStartedAt) ?? toDate(workout.startedAt);
  if (!segmentStart) return Math.max(0, Math.floor(accumulated));

  const running = (Date.now() - segmentStart.getTime()) / 1000;
  return Math.max(0, Math.floor(accumulated + running));
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Stable key for a completion attempt. Derived from the session itself rather
 * than generated per-request, so a retry after a timeout carries the same key
 * and the server can collapse it instead of logging the workout twice.
 */
function completionIdempotencyKey(workout: ActiveWorkout): string {
  const startedAt = toDate(workout.startedAt)?.getTime() ?? 0;
  return `complete:${workout.templateId}:${startedAt}`;
}

export function ActiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  // The provider is mounted app-wide, including on /login. Without this guard
  // every signed-out visitor fires a doomed request for an active session.
  const { status: authStatus } = useSession();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [tick, setTick] = useState(0);

  /**
   * Edits accumulated since the last successful push. Merged rather than
   * replaced: the old code overwrote this on each keystroke, so typing a note
   * and then a weight within the debounce window sent only the weight and
   * silently dropped the note.
   */
  const pendingUpdatesRef = useRef<ActiveSessionUpdatePayload>({});
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  /** Set when an edit arrives mid-flight, so we re-run instead of dropping it. */
  const resyncRequestedRef = useRef(false);
  /** Server's version counter, for optimistic concurrency on the PATCH. */
  const serverVersionRef = useRef<number | null>(null);

  /* ── Local persistence ───────────────────────────────────────────────── */

  const persistLocal = useCallback(async (workout: ActiveWorkout | null) => {
    if (!workout) {
      await clearActiveWorkout();
      return;
    }
    await writeActiveWorkout(workout);
  }, []);

  /* ── Server sync ─────────────────────────────────────────────────────── */

  const pushToServer = useCallback(async () => {
    if (inFlightRef.current) {
      resyncRequestedRef.current = true;
      return;
    }

    const updates = pendingUpdatesRef.current;
    if (Object.keys(updates).length === 0) {
      setSyncState('idle');
      return;
    }

    // Take ownership of the batch. Edits arriving during the request accumulate
    // into a fresh object and are picked up by the resync below.
    pendingUpdatesRef.current = {};
    inFlightRef.current = true;
    setSyncState('syncing');

    const payload: ActiveSessionUpdatePayload & { version?: number } = { ...updates };
    if (serverVersionRef.current !== null) {
      payload.version = serverVersionRef.current;
    }

    try {
      const response = await fetch('/api/session/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });

      if (response.status === 409) {
        // Another device advanced the session. Adopt the server's copy, then
        // replay our edits on top so nothing entered on this device is lost.
        const fresh = await fetch('/api/session/active', { credentials: 'same-origin' });
        if (fresh.ok) {
          const result = await fresh.json();
          const serverSession = result.data?.activeSession as ActiveWorkout | null;
          if (serverSession) {
            serverVersionRef.current = serverSession.version;
            const merged = normalizeTiming({ ...serverSession, ...toLocalPatch(updates) });
            setActiveWorkout(merged);
            await writeActiveWorkout(merged);
            // Re-queue so the merge itself reaches the server.
            pendingUpdatesRef.current = { ...updates, ...pendingUpdatesRef.current };
            resyncRequestedRef.current = true;
          }
        }
        return;
      }

      if (!response.ok) {
        // 4xx other than 409 means the payload itself is bad; retrying would
        // loop forever, so surface it and drop the batch.
        if (response.status >= 400 && response.status < 500) {
          console.error('[activeWorkout] Server rejected update', response.status);
          setSyncState('error');
          return;
        }
        throw new Error(`Sync failed with ${response.status}`);
      }

      const result = await response.json();
      const serverSession = result.data?.activeSession as ActiveWorkout | undefined;
      if (serverSession?.version !== undefined) {
        serverVersionRef.current = serverSession.version;
      }

      const stored = await readActiveWorkout();
      if (stored) await markActiveWorkoutSynced(stored.localVersion);
      setSyncState(resyncRequestedRef.current ? 'pending' : 'idle');
    } catch {
      // Network failure. The edits are already durable in IndexedDB; queue them
      // so Background Sync replays them once there is a connection again.
      await enqueue({
        url: '/api/session/active',
        method: 'PATCH',
        body: updates,
        description: 'Workout progress',
        // Only the newest snapshot is worth sending — collapse superseded ones.
        dedupeKey: 'active-session-patch',
      });
      setSyncState('offline');
      void refreshPendingCount();
    } finally {
      inFlightRef.current = false;

      if (resyncRequestedRef.current) {
        resyncRequestedRef.current = false;
        // Yield so state settles before the follow-up request.
        setTimeout(() => void pushToServer(), 0);
      }
    }
  }, []);

  const scheduleSync = useCallback(
    (updates: ActiveSessionUpdatePayload) => {
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
      setSyncState((prev) => (prev === 'syncing' ? prev : 'pending'));

      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => void pushToServer(), SYNC_DEBOUNCE_MS);
    },
    [pushToServer]
  );

  const flushNow = useCallback(async () => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    await pushToServer();
  }, [pushToServer]);

  const refreshPendingCount = useCallback(async () => {
    setPendingCount(await getPendingCount());
  }, []);

  /* ── Load ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      // Local first: this resolves in milliseconds and works with no network,
      // so the UI is usable before the server has answered.
      const stored = await readActiveWorkout();
      if (stored && !cancelled) {
        setActiveWorkout(normalizeTiming(stored.data as ActiveWorkout));
        setIsLoading(false);
      }

      try {
        const response = await fetch('/api/session/active', { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Failed to fetch active session');

        const result = await response.json();
        const serverSession = result.data?.activeSession as ActiveWorkout | null;
        if (cancelled) return;

        if (serverSession) {
          serverVersionRef.current = serverSession.version;

          // Local edits that never reached the server win over the server copy
          // for the fields they touch — the server is behind, not authoritative.
          const hasUnsynced = stored && stored.localVersion > stored.syncedVersion;
          const merged = normalizeTiming(
            hasUnsynced ? { ...serverSession, ...(stored.data as ActiveWorkout) } : serverSession
          );
          setActiveWorkout(merged);
          await writeActiveWorkout(merged, { synced: !hasUnsynced });
        } else if (stored) {
          // The server says there is no active session. Trust it only when we
          // have nothing unsynced; otherwise we would erase work done offline.
          const hasUnsynced = stored.localVersion > stored.syncedVersion;
          if (!hasUnsynced) {
            setActiveWorkout(null);
            await clearActiveWorkout();
          }
        } else {
          await migrateLegacyLocalStorage(setActiveWorkout);
        }
      } catch {
        // Offline, or the server is down. The local copy already loaded above,
        // which is exactly the situation this design exists for.
        if (!cancelled && !stored) {
          await migrateLegacyLocalStorage(setActiveWorkout);
        }
        if (!cancelled) setSyncState('offline');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    void refreshPendingCount();

    return () => {
      cancelled = true;
    };
  }, [refreshPendingCount, authStatus]);

  /* ── Outbox count ────────────────────────────────────────────────────── */

  useEffect(() => {
    const handler = () => void refreshPendingCount();
    window.addEventListener(OUTBOX_CHANGED_EVENT, handler);
    return () => window.removeEventListener(OUTBOX_CHANGED_EVENT, handler);
  }, [refreshPendingCount]);

  /* ── Clock ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!activeWorkout?.isTimerActive) return;

    // One interval for the whole app. Re-rendering via a counter rather than
    // storing the formatted string keeps this from thrashing the workout object.
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [activeWorkout?.isTimerActive]);

  // Timers drift badly while a tab is backgrounded; recompute on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTick((value) => value + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  /* ── Durability on the way out ───────────────────────────────────────── */

  useEffect(() => {
    // `pagehide` fires reliably on mobile Safari where `beforeunload` does not.
    const handlePageHide = () => {
      if (Object.keys(pendingUpdatesRef.current).length === 0) return;

      // The page may not survive long enough for fetch to finish; sendBeacon is
      // handed to the browser and completes after teardown.
      try {
        const body = JSON.stringify(pendingUpdatesRef.current);
        navigator.sendBeacon?.(
          '/api/session/active/beacon',
          new Blob([body], { type: 'application/json' })
        );
      } catch {
        /* best effort — IndexedDB already has the data */
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  /* ── Mutations ───────────────────────────────────────────────────────── */

  const applyUpdate = useCallback(
    (updates: ActiveSessionUpdatePayload) => {
      const localPatch = toLocalPatch(updates);
      setActiveWorkout((previous) => {
        if (!previous) return previous;
        const next: ActiveWorkout = { ...previous, ...localPatch, lastUpdated: new Date() };
        // Fire and forget: IndexedDB writes are fast and we must not block input.
        void persistLocal(next);
        return next;
      });
      scheduleSync(updates);
    },
    [persistLocal, scheduleSync]
  );

  const startWorkout = useCallback(
    async (templateId: string, templateName: string, template?: WorkoutTemplateData) => {
      const response = await fetch('/api/session/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, templateName, template }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        const error = new Error(
          detail?.error?.message ?? 'Failed to start workout session'
        ) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const result = await response.json();
      const session = normalizeTiming({
        ...(result.data.activeSession as ActiveWorkout),
        accumulatedSeconds: 0,
        segmentStartedAt: new Date(),
      });

      serverVersionRef.current = session.version;
      setActiveWorkout(session);
      await writeActiveWorkout(session, { synced: true });
    },
    []
  );

  const toggleTimer = useCallback(() => {
    setActiveWorkout((previous) => {
      if (!previous) return previous;

      const now = new Date();
      let next: ActiveWorkout;

      if (previous.isTimerActive) {
        const segmentStart =
          toDate(previous.segmentStartedAt) ?? toDate(previous.startedAt) ?? now;
        const segment = Math.max(0, (now.getTime() - segmentStart.getTime()) / 1000);
        next = {
          ...previous,
          isTimerActive: false,
          accumulatedSeconds: (previous.accumulatedSeconds ?? 0) + segment,
          segmentStartedAt: undefined,
          lastPauseTime: now,
          lastUpdated: now,
        };
      } else {
        next = {
          ...previous,
          isTimerActive: true,
          segmentStartedAt: now,
          lastPauseTime: undefined,
          lastUpdated: now,
        };
      }

      void persistLocal(next);
      // Explicit nulls, not undefined: JSON.stringify drops undefined keys, and
      // the server reads a missing key as "leave unchanged".
      scheduleSync({
        isTimerActive: next.isTimerActive,
        // `pausedTime` is kept in sync for anything still reading the old field.
        pausedTime: Math.floor(next.accumulatedSeconds ?? 0),
        accumulatedSeconds: next.accumulatedSeconds,
        lastPauseTime: next.lastPauseTime ?? null,
        segmentStartedAt: next.segmentStartedAt ?? null,
      });

      return next;
    });
  }, [persistLocal, scheduleSync]);

  const endWorkout = useCallback(async () => {
    // Clear locally first so the UI responds instantly, but only after the
    // server confirms do we consider it gone — otherwise a failed DELETE leaves
    // a phantom session server-side that 409s the next start.
    try {
      const response = await fetch('/api/session/active', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to end workout');
      }
    } catch {
      // Queue the delete so the server is cleaned up on reconnect. Without this
      // the next "Start workout" fails with a 409 the user cannot resolve.
      await enqueue({
        url: '/api/session/active',
        method: 'DELETE',
        description: 'Discard workout',
        dedupeKey: 'active-session-delete',
      });
      void refreshPendingCount();
    }

    pendingUpdatesRef.current = {};
    serverVersionRef.current = null;
    setActiveWorkout(null);
    setSyncState('idle');
    await clearActiveWorkout();
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* storage may be unavailable */
    }
  }, [refreshPendingCount]);

  const completeWorkout = useCallback(
    async (duration?: number, notes?: string) => {
      const current = activeWorkout;
      if (!current) throw new Error('No active workout to complete');

      // Make sure every logged set has reached the server before we ask it to
      // summarise the session.
      await flushNow();

      const idempotencyKey = completionIdempotencyKey(current);
      const body = { duration, notes };

      try {
        const response = await fetch('/api/session/active/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(body),
          credentials: 'same-origin',
        });

        if (!response.ok) {
          if (response.status >= 500) throw new Error('Server error');
          const detail = await response.json().catch(() => null);
          throw new Error(detail?.error?.message ?? 'Failed to complete workout');
        }

        const data = await response.json();
        pendingUpdatesRef.current = {};
        serverVersionRef.current = null;
        setActiveWorkout(null);
        await clearActiveWorkout();
        /*
         * Completing a workout moves points, stats, PRs, the leaderboard, the
         * progress charts and the recovery map. None of that was being
         * invalidated, so every one of those screens showed pre-workout data
         * until its staleTime lapsed. Awaited so the profile page this
         * navigates to is already refetching when it mounts.
         */
        await invalidateWorkoutData(queryClient);
        return data;
      } catch (error) {
        // Offline or the server is down. Queue the completion — the workout is
        // finished as far as the user is concerned, and the idempotency key
        // guarantees the replay cannot double-log it.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          await enqueue({
            url: '/api/session/active/complete',
            method: 'POST',
            body,
            headers: { 'Idempotency-Key': idempotencyKey },
            description: `Complete "${current.templateName}"`,
          });
          pendingUpdatesRef.current = {};
          serverVersionRef.current = null;
          setActiveWorkout(null);
          await clearActiveWorkout();
          void refreshPendingCount();
          // Queued rather than applied, but the session is over as far as the
          // user is concerned; let the affected views refetch when they can.
          await invalidateWorkoutData(queryClient);
          return { data: { queued: true } };
        }
        throw error;
      }
    },
    [activeWorkout, flushNow, refreshPendingCount, queryClient]
  );

  const recoverSession = useCallback(async (templateId: string, forceRecover = false) => {
    const response = await fetch('/api/session/active/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, forceRecover }),
      credentials: 'same-origin',
    });

    if (!response.ok) throw new Error('Failed to recover session');

    const result = await response.json();
    const session = result.data.activeSession as ActiveWorkout | null;

    if (session) {
      const normalized = normalizeTiming(session);
      serverVersionRef.current = session.version;
      setActiveWorkout(normalized);
      await writeActiveWorkout(normalized, { synced: true });
    } else {
      setActiveWorkout(null);
      await clearActiveWorkout();
    }
    return result.data;
  }, []);

  /* ── Cleanup ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  // Drain the outbox as soon as we're back, rather than waiting for the browser.
  useEffect(() => {
    const handleOnline = async () => {
      await flushOutbox();
      await refreshPendingCount();
      if (Object.keys(pendingUpdatesRef.current).length > 0) void pushToServer();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pushToServer, refreshPendingCount]);

  /* ── Derived ─────────────────────────────────────────────────────────── */

  const durationSeconds = useMemo(
    () => elapsedSeconds(activeWorkout),
    // `tick` is the intentional dependency: it is what re-renders the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeWorkout, tick]
  );

  const value = useMemo<ActiveWorkoutContextValue>(
    () => ({
      activeWorkout,
      isLoading,
      isSyncing: syncState === 'syncing',
      syncState,
      pendingCount,
      hasActiveWorkout: Boolean(activeWorkout),
      isTimerActive: activeWorkout?.isTimerActive ?? false,
      formatWorkoutDuration: formatDuration(durationSeconds),
      getWorkoutDuration: () => elapsedSeconds(activeWorkout),
      startWorkout,
      updateWorkout: applyUpdate,
      updatePerformance: (performance) => applyUpdate({ performance }),
      updateExerciseProgress: (exerciseProgress) => applyUpdate({ exerciseProgress }),
      updateSessionNotes: (sessionNotes) => applyUpdate({ sessionNotes }),
      updateModifiedTemplate: (modifiedTemplate) => applyUpdate({ modifiedTemplate }),
      toggleTimer,
      endWorkout,
      completeWorkout,
      recoverSession,
      flushNow,
    }),
    [
      activeWorkout,
      isLoading,
      syncState,
      pendingCount,
      durationSeconds,
      startWorkout,
      applyUpdate,
      toggleTimer,
      endWorkout,
      completeWorkout,
      recoverSession,
      flushNow,
    ]
  );

  return (
    <ActiveWorkoutContext.Provider value={value}>{children}</ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout(): ActiveWorkoutContextValue {
  const context = useContext(ActiveWorkoutContext);
  if (!context) {
    throw new Error('useActiveWorkout must be used within an ActiveWorkoutProvider');
  }
  return context;
}

/* ── Legacy migration ────────────────────────────────────────────────────── */

interface LegacyActiveWorkoutState {
  templateId: string;
  templateName: string;
  startTime: number;
  pausedTime: number;
  isTimerActive: boolean;
  sessionNotes: string;
  workoutPerformance: { [exerciseId: string]: ExercisePerformance };
  modifiedTemplate?: WorkoutTemplateData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exerciseProgress?: { [exerciseId: string]: any };
  lastPauseTime?: number;
}

/**
 * Reads the pre-server localStorage format one last time and moves it into
 * IndexedDB. Can be deleted once no installs remain on the old build.
 */
async function migrateLegacyLocalStorage(
  setWorkout: (workout: ActiveWorkout | null) => void
): Promise<void> {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return;
  }
  if (!saved) return;

  try {
    const parsed: LegacyActiveWorkoutState = JSON.parse(saved);
    const migrated = normalizeTiming({
      templateId: parsed.templateId,
      templateName: parsed.templateName,
      originalTemplate: parsed.modifiedTemplate ?? ({} as WorkoutTemplateData),
      startedAt: new Date(parsed.startTime),
      pausedTime: parsed.pausedTime,
      isTimerActive: parsed.isTimerActive,
      lastPauseTime: parsed.lastPauseTime ? new Date(parsed.lastPauseTime) : undefined,
      modifiedTemplate: parsed.modifiedTemplate,
      performance: parsed.workoutPerformance,
      exerciseProgress: parsed.exerciseProgress ?? {},
      sessionNotes: parsed.sessionNotes,
      version: 1,
      lastUpdated: new Date(),
    });

    setWorkout(migrated);
    await writeActiveWorkout(migrated);
  } catch (error) {
    console.error('[activeWorkout] Failed to migrate legacy data', error);
  } finally {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* nothing to do */
    }
  }
}
