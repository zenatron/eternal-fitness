'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Manages this browser's push subscription.
 *
 * Permission is never requested on mount — a notification prompt that appears
 * unprompted is the fastest way to get permanently blocked, and `denied` cannot
 * be undone from JavaScript. `subscribe()` must be called from a user gesture.
 */

export type PushStatus =
  | 'unsupported' // no service worker or Push API
  | 'unconfigured' // server has no VAPID keys
  | 'denied' // user blocked notifications
  | 'unsubscribed'
  | 'subscribed';

/**
 * The VAPID public key is sent to the browser as a base64url string but
 * `applicationServerKey` requires a Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  // Backed by an explicit ArrayBuffer: `applicationServerKey` requires a
  // BufferSource over ArrayBuffer, and the default Uint8Array type is generic
  // over ArrayBufferLike, which also admits SharedArrayBuffer.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('unsupported');
  const [isBusy, setIsBusy] = useState(false);
  /**
   * Fetched from the server rather than read from a NEXT_PUBLIC_ build-time
   * constant, so the VAPID keypair stays ordinary runtime config — rotating it
   * is a restart, not an image rebuild.
   */
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      typeof Notification === 'undefined'
    ) {
      setStatus('unsupported');
      return;
    }

    let key: string | null = null;
    try {
      const response = await fetch('/api/push/subscribe', { credentials: 'same-origin' });
      if (response.ok) {
        const result = await response.json();
        if (result?.data?.configured) key = result.data.publicKey ?? null;
      }
    } catch {
      // Offline, or the server is unreachable. Treated as "not configured"
      // below, which hides the toggle rather than offering one that can't work.
    }

    setPublicKey(key);

    if (!key) {
      setStatus('unconfigured');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? 'subscribed' : 'unsubscribed');
    } catch {
      setStatus('unsubscribed');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    // Only reachable once `refresh` has resolved a key — the toggle is not
    // rendered in the 'unconfigured' state — but guard rather than assume.
    if (!publicKey) return false;
    setIsBusy(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'unsubscribed');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Reuse an existing subscription where possible: creating a second one
      // for the same registration silently replaces the first, orphaning the
      // row we already stored.
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          // Required to be true by every browser that implements Push — silent
          // pushes are not permitted on the open web.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const payload = subscription.toJSON();
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: payload.keys,
        }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        // Don't leave a browser-side subscription the server doesn't know
        // about — it would never receive anything.
        await subscription.unsubscribe().catch(() => {});
        setStatus('unsubscribed');
        return false;
      }

      setStatus('subscribed');
      return true;
    } catch (error) {
      console.error('[push] Subscribe failed', error);
      setStatus('unsubscribed');
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [publicKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setStatus('unsubscribed');
        return true;
      }

      // Tell the server first: once the local subscription is gone we no longer
      // know the endpoint to delete, and the row would linger until it 410s.
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        credentials: 'same-origin',
      }).catch(() => {});

      await subscription.unsubscribe();
      setStatus('unsubscribed');
      return true;
    } catch (error) {
      console.error('[push] Unsubscribe failed', error);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const sendTest = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        credentials: 'same-origin',
      });
      const result = await response.json();
      if (!response.ok) {
        return { ok: false, message: result?.error?.message ?? 'Test failed' };
      }
      return { ok: true, message: 'Test notification sent' };
    } catch {
      return { ok: false, message: 'Could not reach the server' };
    }
  }, []);

  return {
    status,
    isBusy,
    isSupported: status !== 'unsupported' && status !== 'unconfigured',
    subscribe,
    unsubscribe,
    sendTest,
    refresh,
  };
}
