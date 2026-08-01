'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownTrayIcon, XMarkIcon, ShareIcon } from '@heroicons/react/24/outline';
import { getMeta, setMeta } from '@/lib/offline/db';
import { useActiveWorkout } from '@/components/workout/ActiveWorkoutProvider';

/**
 * Install affordance.
 *
 * Two paths, because iOS does not implement `beforeinstallprompt`:
 *  - Chromium: capture the deferred event and drive the native prompt.
 *  - iOS Safari: explain the Share → Add to Home Screen flow, since there is no
 *    API to trigger it.
 *
 * Neither is shown immediately. Asking someone to install an app they have used
 * for four seconds is how install prompts got their reputation, so we wait for
 * evidence of actual engagement.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'install-prompt-dismissed-at';
const VISITS_KEY = 'install-prompt-visits';
/** Show only once the app has been opened this many times. */
const MIN_VISITS = 3;
/** Wait this long after a dismissal before asking again. */
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 14;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's non-standard flag.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports as a Mac; the touch points disambiguate it.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [visible, setVisible] = useState(false);
  /**
   * Never interrupt a workout in progress. This panel is anchored to the bottom
   * of the screen, which is exactly where the set-entry controls are, so
   * showing it mid-session covers the one thing the user is actually doing.
   */
  const { hasActiveWorkout } = useActiveWorkout();

  const dismiss = useCallback(async () => {
    setVisible(false);
    await setMeta(DISMISSED_KEY, Date.now());
  }, []);

  useEffect(() => {
    if (isStandalone()) return;

    let cancelled = false;

    const evaluate = async () => {
      const dismissedAt = (await getMeta<number>(DISMISSED_KEY)) ?? 0;
      if (Date.now() - dismissedAt < SNOOZE_MS) return;

      const visits = ((await getMeta<number>(VISITS_KEY)) ?? 0) + 1;
      await setMeta(VISITS_KEY, visits);
      if (visits < MIN_VISITS) return;
      if (cancelled) return;

      if (isIOS()) {
        setShowIOSHint(true);
        setVisible(true);
      }
    };

    void evaluate();

    const handleBeforeInstall = (event: Event) => {
      // Suppress Chrome's own mini-infobar so we can choose the moment.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);

      void (async () => {
        const dismissedAt = (await getMeta<number>(DISMISSED_KEY)) ?? 0;
        if (Date.now() - dismissedAt < SNOOZE_MS) return;
        const visits = (await getMeta<number>(VISITS_KEY)) ?? 0;
        if (visits >= MIN_VISITS && !cancelled) setVisible(true);
      })();
    };

    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    } else {
      await dismiss();
    }
    // The event is single-use.
    setDeferredPrompt(null);
  };

  if (!visible || hasActiveWorkout) return null;

  return (
    <AnimatePresence>
      <motion.div
        // Horizontal centring is done with motion's `x`, not Tailwind's
        // `-translate-x-1/2`: Framer Motion writes its own inline `transform`
        // for the animation, which silently overrides the utility class and
        // left this panel hanging half off the right edge of the screen.
        initial={{ opacity: 0, y: 32, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: 32, x: '-50%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        role="dialog"
        aria-label="Install Eternal Fitness"
        className="fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        // Sits above the mobile bottom nav rather than behind it.
          style={{ bottom: 'calc(1rem + var(--bottom-nav-total))' }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-accent-500/25 bg-white p-4 shadow-xl shadow-black/20 dark:bg-surface-100 dark:shadow-black/40">
          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="absolute right-2 top-2 rounded-lg p-2 text-surface-600 transition-colors hover:text-surface-50 dark:hover:text-white tap-control"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 border border-accent-500/25">
              <ArrowDownTrayIcon className="h-5 w-5 text-accent-400" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-base uppercase tracking-wide text-surface-50 dark:text-white">
                Install Eternal
              </p>
              <p className="mt-1 text-sm text-surface-600 dark:text-surface-700">
                Full screen, instant launch, and workouts that log with no signal.
              </p>
            </div>
          </div>

          {showIOSHint ? (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-950 px-3 py-2 text-xs text-surface-600 dark:bg-surface-200/60 dark:text-surface-800">
              Tap
              <ShareIcon className="inline h-4 w-4 text-accent-400" aria-label="the Share button" />
              then <span className="font-semibold text-surface-50 dark:text-white">Add to Home Screen</span>
            </p>
          ) : (
            <button
              onClick={install}
              className="btn btn-primary mt-3 w-full tap-control"
            >
              Install
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
