'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CloudArrowUpIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { getPendingCount, OUTBOX_CHANGED_EVENT } from '@/lib/offline/outbox';

/**
 * Persistent connectivity banner.
 *
 * The point is reassurance, not alarm: someone mid-workout on gym wifi needs to
 * know their sets are being kept, so the copy leads with what is saved rather
 * than with the failure.
 */
export function OfflineIndicator() {
  const { isOnline, isReconnecting } = useOnlineStatus();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const count = await getPendingCount();
      if (!cancelled) setPending(count);
    };

    void refresh();
    window.addEventListener(OUTBOX_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(OUTBOX_CHANGED_EVENT, refresh);
    };
  }, []);

  // Once we're online with an empty queue there is nothing worth saying.
  const show = !isOnline || pending > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          role="status"
          aria-live="polite"
          className={`overflow-hidden ${
            isOnline ? 'bg-accent-600 text-white' : 'bg-surface-300 text-white'
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2 text-sm sm:px-6">
            {isOnline ? (
              <CloudArrowUpIcon className="h-4 w-4 shrink-0 animate-pulse" />
            ) : (
              <SignalSlashIcon className="h-4 w-4 shrink-0" />
            )}

            <span className="min-w-0 flex-1 truncate">
              {!isOnline && pending > 0 && (
                <>
                  Offline —{' '}
                  <span className="font-semibold">
                    {pending} {pending === 1 ? 'change' : 'changes'} saved
                  </span>{' '}
                  on this device
                </>
              )}
              {!isOnline && pending === 0 && (
                <>Offline — everything you log is saved on this device</>
              )}
              {isOnline && pending > 0 && (
                <>
                  {isReconnecting ? 'Reconnecting' : 'Syncing'} {pending}{' '}
                  {pending === 1 ? 'change' : 'changes'}…
                </>
              )}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
