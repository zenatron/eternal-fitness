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
import {
  notifyThroughServiceWorker,
  playCountdownTick,
  playRestComplete,
  primeAudio,
} from '@/lib/workout/feedback';
import { getMeta, setMeta } from '@/lib/offline/db';

/**
 * Rest countdown between sets.
 *
 * The timer is anchored to an absolute wall-clock deadline rather than counted
 * down with an interval. This matters: mobile browsers throttle or entirely
 * freeze timers in a backgrounded tab, so an interval-based countdown drifts
 * badly or stops — and being backgrounded is the *normal* case here, since
 * people put the phone down between sets. Re-deriving from `Date.now()` means
 * the remaining time is correct no matter what happened while we were away.
 */

interface RestTimerContextValue {
  /** Seconds left, or null when no rest is running. */
  remaining: number | null;
  /** Duration the current rest started from, for progress rendering. */
  total: number | null;
  isRunning: boolean;
  /** Label of the set/exercise this rest follows. */
  label: string | null;
  start: (seconds: number, label?: string) => void;
  /** Add or subtract time; the deadline moves, nothing restarts. */
  adjust: (deltaSeconds: number) => void;
  skip: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const RestTimerContext = createContext<RestTimerContextValue | null>(null);

const SOUND_PREF_KEY = 'rest-timer-sound-enabled';
/** Tick audibly for the final stretch so you can look up in time. */
const TICK_FROM_SECONDS = 3;

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  /** Absolute epoch ms when rest ends. Null when idle. */
  const [deadline, setDeadline] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(true);

  /** Guards against firing the completion effects twice. */
  const completedRef = useRef(false);
  /** Last whole second we ticked on, so each tick plays exactly once. */
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      const stored = await getMeta<boolean>(SOUND_PREF_KEY);
      if (stored !== undefined) setSoundEnabledState(stored);
    })();
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    void setMeta(SOUND_PREF_KEY, enabled);
    // Unlock the audio context while we still have the user's click.
    if (enabled) primeAudio();
  }, []);

  const finish = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;

    setRemaining(0);

    if (soundEnabled) playRestComplete();

    // If the app is backgrounded the user cannot see the UI, so escalate to a
    // system notification. Requires permission; silently skipped otherwise.
    if (document.visibilityState !== 'visible') {
      await notifyThroughServiceWorker({
        title: 'Rest complete',
        body: label ? `Time for ${label}` : 'Back to work.',
        tag: 'rest-timer',
        url: '/',
        vibrate: [200, 100, 200, 100, 300],
      });
    }

    // Leave the finished state visible briefly so it registers, then clear.
    setTimeout(() => {
      setDeadline(null);
      setRemaining(null);
      setTotal(null);
      setLabel(null);
    }, 1500);
  }, [label, soundEnabled]);

  /* ── Countdown ───────────────────────────────────────────────────────── */

  useEffect(() => {
    if (deadline === null) return;

    const update = () => {
      const secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(secondsLeft);

      if (secondsLeft <= 0) {
        void finish();
        return;
      }

      if (
        soundEnabled &&
        secondsLeft <= TICK_FROM_SECONDS &&
        lastTickRef.current !== secondsLeft
      ) {
        lastTickRef.current = secondsLeft;
        playCountdownTick();
      }
    };

    update();
    // 250ms rather than 1000ms so the displayed second flips close to the real
    // boundary instead of drifting up to a second late.
    const interval = setInterval(update, 250);

    // Recompute the moment we come back — the interval may have been frozen.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [deadline, finish, soundEnabled]);

  /* ── Controls ────────────────────────────────────────────────────────── */

  const start = useCallback((seconds: number, nextLabel?: string) => {
    if (!seconds || seconds <= 0) return;

    completedRef.current = false;
    lastTickRef.current = null;
    setTotal(seconds);
    setLabel(nextLabel ?? null);
    setDeadline(Date.now() + seconds * 1000);
    setRemaining(seconds);
    // Called from the set-completion tap, so this is a valid gesture to unlock
    // audio with — without it the completion chime is blocked.
    primeAudio();
  }, []);

  const adjust = useCallback((deltaSeconds: number) => {
    setDeadline((current) => {
      if (current === null) return current;
      const next = current + deltaSeconds * 1000;
      // Never let an adjustment push the deadline into the past and instantly
      // fire completion; floor it at one more second.
      return Math.max(next, Date.now() + 1000);
    });
    setTotal((current) => (current === null ? current : Math.max(1, current + deltaSeconds)));
    completedRef.current = false;
  }, []);

  const skip = useCallback(() => {
    completedRef.current = true;
    setDeadline(null);
    setRemaining(null);
    setTotal(null);
    setLabel(null);
  }, []);

  const value = useMemo<RestTimerContextValue>(
    () => ({
      remaining,
      total,
      isRunning: deadline !== null,
      label,
      start,
      adjust,
      skip,
      soundEnabled,
      setSoundEnabled,
    }),
    [remaining, total, deadline, label, start, adjust, skip, soundEnabled, setSoundEnabled]
  );

  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>;
}

export function useRestTimer(): RestTimerContextValue {
  const context = useContext(RestTimerContext);
  if (!context) {
    throw new Error('useRestTimer must be used within a RestTimerProvider');
  }
  return context;
}
