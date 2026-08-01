'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { flushOutbox, OUTBOX_CHANGED_EVENT } from '@/lib/offline/outbox';

/**
 * Registers the service worker and surfaces updates.
 *
 * Updates are never applied silently: `skipWaiting` is disabled in the worker
 * so a new build cannot swap itself in mid-workout and reload the page out from
 * under someone holding a barbell. The user is asked instead.
 */
export function ServiceWorkerRegistrar() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    // Dev builds have no compiled worker (see next.config.mjs).
    if (process.env.NODE_ENV === 'development') return;

    let registration: ServiceWorkerRegistration | undefined;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // A worker already parked in `waiting` means an update arrived on a
        // previous visit and was never applied.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration?.installing;
          if (!installing) return;

          installing.addEventListener('statechange', () => {
            // `controller` being absent means this is the first install, not an
            // update — nothing to prompt about.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(installing);
            }
          });
        });

        // Check for a new build when the app is brought back to the foreground.
        const checkForUpdate = () => {
          if (document.visibilityState === 'visible') {
            void registration?.update();
          }
        };
        document.addEventListener('visibilitychange', checkForUpdate);
        return () => document.removeEventListener('visibilitychange', checkForUpdate);
      } catch (error) {
        console.error('[pwa] Service worker registration failed', error);
      }
    };

    void register();

    // The new worker took control; reload once so the page matches its assets.
    const handleControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // The worker reports back after replaying queued mutations.
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OUTBOX_FLUSHED' && event.data.sent > 0) {
        const count = event.data.sent as number;
        toast.success(
          count === 1 ? 'Synced 1 pending change' : `Synced ${count} pending changes`,
          { id: 'outbox-sync' }
        );
        window.dispatchEvent(new CustomEvent(OUTBOX_CHANGED_EVENT));
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Safari and Firefox lack Background Sync, so the page drains the queue itself
  // whenever the connection comes back.
  useEffect(() => {
    const handleOnline = () => void flushOutbox();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const applyUpdate = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    setWaitingWorker(null);
  };

  return (
    <AnimatePresence>
      {waitingWorker && (
        <motion.div
          // Centred via motion's `x`, not `-translate-x-1/2`: the inline
          // transform motion writes would override the utility class.
          initial={{ opacity: 0, y: 24, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 24, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          role="status"
          className="fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
          // Sits above the mobile bottom nav rather than behind it.
          style={{ bottom: 'calc(1rem + var(--bottom-nav-total))' }}
        >
          <div className="flex items-center gap-3 rounded-xl border border-accent-500/30 bg-white px-4 py-3 shadow-lg shadow-black/20 dark:bg-surface-100 dark:shadow-black/30">
            <ArrowPathIcon className="w-5 h-5 shrink-0 text-accent-400" />
            <p className="flex-1 text-sm text-surface-50 dark:text-white">
              A new version is ready.
            </p>
            <button
              onClick={applyUpdate}
              className="rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 tap-control"
            >
              Reload
            </button>
            <button
              onClick={() => setWaitingWorker(null)}
              aria-label="Dismiss update"
              className="rounded-lg p-1 text-surface-600 transition-colors hover:text-surface-50 dark:text-surface-700 dark:hover:text-white tap-control"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
