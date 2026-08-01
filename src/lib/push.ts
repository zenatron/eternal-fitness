import webpush from 'web-push';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

/**
 * Web Push delivery.
 *
 * Push is optional: if VAPID keys are not configured the whole feature degrades
 * to a no-op rather than throwing, so a deployment without keys still runs. Use
 * `isPushConfigured()` before offering push in the UI.
 *
 * Generate keys with `bun run scripts/generate-vapid-keys.mjs`.
 */

/**
 * Read at runtime, and deliberately without a NEXT_PUBLIC_ prefix: the key is
 * handed to the browser by GET /api/push/subscribe rather than inlined into the
 * client bundle at build time. The old prefixed name is still accepted so an
 * environment configured before that change keeps working.
 */
const publicKey =
  process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';

let configured = false;

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    console.error('Invalid VAPID configuration; push notifications disabled:', error);
  }
}

export function isPushConfigured(): boolean {
  return configured;
}

/** The VAPID public key to hand to `pushManager.subscribe()`, if configured. */
export function getVapidPublicKey(): string | null {
  return configured ? (publicKey ?? null) : null;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Notifications sharing a tag replace each other instead of stacking. */
  tag?: string;
  /** Path to open when the notification is clicked. */
  url?: string;
  /** Requires interaction and vibrates harder — for time-sensitive alerts. */
  urgent?: boolean;
  actions?: { action: string; title: string }[];
}

export interface PushResult {
  sent: number;
  failed: number;
  /** Subscriptions removed because the push service reported them dead. */
  pruned: number;
}

/**
 * Sends to every device registered to a user.
 *
 * 404 and 410 from a push service mean the subscription is permanently gone
 * (app uninstalled, browser data cleared). Those rows are deleted rather than
 * retried — otherwise the table fills with endpoints that can never succeed.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  if (!configured) return { sent: 0, failed: 0, pruned: 0 };

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subscriptions.length === 0) return { sent: 0, failed: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  const deadEndpoints: string[] = [];
  let sent = 0;
  let failed = 0;

  // Sent in parallel: these are independent requests to third-party services,
  // and a slow one shouldn't hold up the rest.
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          { TTL: 60 * 60 * 24, urgency: payload.urgent ? 'high' : 'normal' }
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          deadEndpoints.push(subscription.endpoint);
        } else {
          console.error('Push delivery failed:', statusCode, error);
          failed += 1;
        }
      }
    })
  );

  if (deadEndpoints.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, deadEndpoints));
  }

  return { sent, failed, pruned: deadEndpoints.length };
}

/** Marks a device as recently reached, for pruning stale rows later. */
export async function touchSubscription(endpoint: string): Promise<void> {
  await db
    .update(pushSubscriptions)
    .set({ lastUsedAt: new Date() })
    .where(eq(pushSubscriptions.endpoint, endpoint));
}
