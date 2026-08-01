import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { isPushConfigured, sendPushToUser } from '@/lib/push';

const successResponse = (data: unknown, status = 200) =>
  NextResponse.json({ data }, { status });

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: { message } }, { status });

/**
 * Sends a test notification to the caller's own devices.
 *
 * Push has several independent failure points — permission, the subscription
 * itself, VAPID config, the service worker handler — and this is the only way
 * to confirm end to end that they all line up. Restricted to the caller's own
 * subscriptions, so it cannot be used to notify anyone else.
 */
export async function POST() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    if (!isPushConfigured()) {
      return errorResponse('Push notifications are not configured on this server', 503);
    }

    const result = await sendPushToUser(userId, {
      title: 'Eternal Fitness',
      body: "Notifications are working. You'll get a nudge when your streak is at risk.",
      tag: 'push-test',
      url: '/profile',
    });

    if (result.sent === 0) {
      return errorResponse(
        result.pruned > 0
          ? 'Your subscription had expired. Turn notifications off and on again.'
          : 'No registered devices for this account.',
        404
      );
    }

    return successResponse(result);
  } catch (error) {
    console.error('Test push failed:', error);
    return errorResponse('Failed to send test notification', 500);
  }
}
