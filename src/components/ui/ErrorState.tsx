'use client';

import { ArrowPathIcon, ExclamationTriangleIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

/**
 * Shown when data could not be loaded.
 *
 * Exists because several pages caught fetch failures with `.catch(console.error)`
 * and then rendered their empty state — so "the request failed" and "you have
 * no workouts yet" looked identical, and there was no way to retry short of a
 * full reload.
 */
interface ErrorStateProps {
  /** What failed, in the user's terms — e.g. "progress data". */
  what: string;
  onRetry?: () => void;
  /** Set when the failure is known to be a network problem. */
  isRetrying?: boolean;
}

export function ErrorState({ what, onRetry, isRetrying = false }: ErrorStateProps) {
  const { isOnline } = useOnlineStatus();

  return (
    <div className="forge-card p-10 text-center" role="alert">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-danger-500/25 bg-danger-500/10">
        {isOnline ? (
          <ExclamationTriangleIcon className="h-6 w-6 text-danger-400" />
        ) : (
          <SignalSlashIcon className="h-6 w-6 text-danger-400" />
        )}
      </div>

      <p className="font-display text-lg uppercase tracking-wide text-surface-50 dark:text-white">
        {isOnline ? `Couldn't load ${what}` : 'No connection'}
      </p>

      <p className="mx-auto mt-2 max-w-sm text-sm text-surface-500 dark:text-surface-600">
        {isOnline
          ? 'Something went wrong on our end. Your data is safe.'
          : `${what} will load once you're back online. Anything you log in the meantime is saved on this device.`}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="btn btn-tertiary mt-6 gap-2 tap-control disabled:opacity-60"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  );
}
