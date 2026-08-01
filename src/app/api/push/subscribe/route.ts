import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getVapidPublicKey, isPushConfigured } from '@/lib/push';
import { z } from 'zod';

const successResponse = (data: unknown, status = 200) =>
  NextResponse.json({ data }, { status });

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: { message } }, { status });

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/** Registers this browser to receive push notifications. */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    if (!isPushConfigured()) {
      return errorResponse('Push notifications are not configured on this server', 503);
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid subscription', 400);

    const { endpoint, keys } = parsed.data;

    // Endpoint is unique per device. Upserting on it means re-subscribing after
    // the browser rotates the subscription updates the existing row rather than
    // leaving an orphan that will only ever return 410.
    await db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: request.headers.get('user-agent') ?? null,
        lastUsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          // Reassign ownership too: a shared device may have changed hands.
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          lastUsedAt: new Date(),
        },
      });

    return successResponse({ subscribed: true });
  } catch (error) {
    console.error('Failed to save push subscription:', error);
    return errorResponse('Failed to save subscription', 500);
  }
}

/** Unregisters this browser. */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await request.json().catch(() => null);
    const endpoint = body?.endpoint;

    if (typeof endpoint !== 'string') {
      return errorResponse('Missing endpoint', 400);
    }

    // Scoped to the user so one account cannot delete another's subscription.
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, userId)
        )
      );

    return successResponse({ unsubscribed: true });
  } catch (error) {
    console.error('Failed to delete push subscription:', error);
    return errorResponse('Failed to remove subscription', 500);
  }
}

/**
 * Push configuration for this client: whether the server can send at all, the
 * VAPID public key needed to create a subscription, and how many devices are
 * already registered.
 *
 * The public key is served at runtime rather than inlined via NEXT_PUBLIC_ at
 * build time. It is not a secret — `pushManager.subscribe()` requires it in the
 * browser, so every visitor necessarily receives it — but serving it from here
 * keeps it ordinary environment config: rotating the VAPID keys is a restart
 * rather than an image rebuild, and one image can run against any environment.
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const rows = await db
      .select({ endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    const configured = isPushConfigured();

    return successResponse({
      configured,
      // Null unless the server holds a usable keypair, so the client cannot
      // subscribe against a key we would be unable to sign with.
      publicKey: getVapidPublicKey(),
      deviceCount: rows.length,
    });
  } catch (error) {
    console.error('Failed to read push subscriptions:', error);
    return errorResponse('Failed to read subscriptions', 500);
  }
}
