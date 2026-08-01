'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
    <div className="min-h-screen-dvh flex flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="w-20 h-20 rounded-2xl bg-accent-500/10 border border-accent-500/25 flex items-center justify-center mb-8"
      >
        <SignalSlashIcon className="w-10 h-10 text-accent-500" />
      </motion.div>

      <h1 className="font-display text-3xl uppercase tracking-wide text-surface-50 dark:text-white mb-3">
        No connection
      </h1>

      <p className="text-secondary max-w-sm mb-2">
        {isOnline
          ? "You're back online — this page just isn't saved yet."
          : "You're offline. Pages you've already visited still work."}
      </p>

      <p className="text-sm text-surface-500 dark:text-surface-600 max-w-sm mb-10">
        An active workout keeps recording either way. Every set is saved on this
        device and syncs automatically once you have signal again.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary flex-1 gap-2 touch-target tap-control"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Try again
        </button>
        <Link href="/" className="btn btn-tertiary flex-1 touch-target tap-control">
          Go home
        </Link>
      </div>

      <div className="mt-10 flex items-center gap-2 text-xs text-surface-500 dark:text-surface-600">
        <span
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-success-500' : 'bg-danger-500'
          }`}
          aria-hidden="true"
        />
        {isOnline ? 'Connected' : 'Offline'}
      </div>
    </div>
  );
}
