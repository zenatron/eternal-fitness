'use client';

import { useEffect, useState } from 'react';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { SignalSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

/**
 * Served by the service worker when a navigation fails and nothing is cached.
 *
 * Deliberately dependency-light: it has to render from the precache with no
 * network and no session, so it does not fetch, and it does not assume any
 * provider above it has data.
 */
export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <StatusScreen
      icon={SignalSlashIcon}
      title="No connection"
      actions={
        <>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary tap-control min-h-[44px] flex-1"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Try again
          </button>
          <Link href="/" className="btn btn-tertiary tap-control min-h-[44px] flex-1">
            Go home
          </Link>
        </>
      }
      footer={
        <p className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-600">
          <span
            className={`h-2 w-2 rounded-full ${isOnline ? 'bg-success-500' : 'bg-danger-500'}`}
            aria-hidden="true"
          />
          {isOnline ? 'Connected' : 'Offline'}
        </p>
      }
    >
      <p>
        {isOnline
          ? "You're back online — this page just isn't saved yet."
          : "You're offline. Pages you've already visited still work."}
      </p>
      <p>
        An active workout keeps recording either way. Every set is saved on this device and syncs
        once you have signal again.
      </p>
    </StatusScreen>
  );
}
