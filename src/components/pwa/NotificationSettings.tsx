'use client';

import { Switch } from '@headlessui/react';
import { BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';

/**
 * Notification opt-in, for the profile page.
 *
 * The toggle is the only thing that requests permission, so the browser prompt
 * always follows a deliberate action. When permission has been denied there is
 * no API to re-request it, so we say so plainly instead of showing a control
 * that silently does nothing.
 */
export function NotificationSettings() {
  const { status, isBusy, subscribe, unsubscribe, sendTest } = usePushNotifications();

  // Nothing actionable to show if the browser or server can't do push at all.
  if (status === 'unsupported' || status === 'unconfigured') {
    return null;
  }

  const isSubscribed = status === 'subscribed';
  const isDenied = status === 'denied';

  const handleToggle = async (next: boolean) => {
    if (next) {
      const ok = await subscribe();
      toast[ok ? 'success' : 'error'](
        ok ? 'Notifications on' : 'Could not enable notifications'
      );
    } else {
      const ok = await unsubscribe();
      if (ok) toast.success('Notifications off');
    }
  };

  const handleTest = async () => {
    const result = await sendTest();
    toast[result.ok ? 'success' : 'error'](result.message);
  };

  return (
    <div className="forge-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              isSubscribed
                ? 'bg-accent-500/10 border-accent-500/25'
                : 'bg-surface-200/60 border-surface-300'
            }`}
          >
            {isSubscribed ? (
              <BellIcon className="h-5 w-5 text-accent-400" />
            ) : (
              <BellSlashIcon className="h-5 w-5 text-surface-600" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base uppercase tracking-wide text-surface-50 dark:text-white">
              Notifications
            </h3>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-600">
              {isDenied
                ? 'Blocked in your browser settings. Allow notifications for this site to turn them back on.'
                : 'Rest timer alerts when the app is in the background, and a nudge when your streak is at risk.'}
            </p>
          </div>
        </div>

        {!isDenied && (
          <Switch
            checked={isSubscribed}
            onChange={handleToggle}
            disabled={isBusy}
            className={`${
              isSubscribed ? 'bg-accent-500' : 'bg-surface-300'
            } relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 tap-control`}
          >
            <span className="sr-only">Enable push notifications</span>
            <span
              className={`${
                isSubscribed ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 rounded-full bg-white transition-transform`}
            />
          </Switch>
        )}
      </div>

      {isSubscribed && (
        <button
          onClick={handleTest}
          className="btn btn-tertiary mt-4 w-full text-xs tap-control"
        >
          Send a test notification
        </button>
      )}
    </div>
  );
}
