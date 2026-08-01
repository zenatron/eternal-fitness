import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { userStats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ActiveWorkoutSessionData } from '@/types/workout';
import { updateSessionSchema } from '@/lib/validation/activeSession';

/**
 * Last-gasp save target for `navigator.sendBeacon`.
 *
 * When the OS kills a backgrounded tab, an in-flight fetch dies with it —
 * sendBeacon is handed to the browser and completes after teardown, but it can
 * only issue a POST and cannot read the response. Hence a separate endpoint
 * rather than reusing PATCH.
 *
 * IndexedDB is still the real durability guarantee (see ActiveWorkoutProvider);
 * this just narrows the window where the server copy lags behind.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    // Nothing can be reported to a caller that is already gone, so failures
    // here are silent by design — 204 regardless.
    if (!userId) return new NextResponse(null, { status: 204 });

    const body = await request.json().catch(() => null);
    if (!body) return new NextResponse(null, { status: 204 });

    const parsed = updateSessionSchema.safeParse(body);
    if (!parsed.success) return new NextResponse(null, { status: 204 });

    const updates = parsed.data;

    const [stats] = await db
      .select({ activeWorkoutData: userStats.activeWorkoutData })
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (!stats?.activeWorkoutData) return new NextResponse(null, { status: 204 });

    const current = stats.activeWorkoutData as ActiveWorkoutSessionData;

    // Deliberately no version check: a beacon is a best-effort flush of work the
    // user already did, and rejecting it would throw that work away for the sake
    // of a conflict no one is around to resolve.
    const merged: ActiveWorkoutSessionData = {
      ...current,
      ...updates,
      lastPauseTime:
        updates.lastPauseTime === undefined
          ? current.lastPauseTime
          : updates.lastPauseTime === null
            ? undefined
            : new Date(updates.lastPauseTime),
      segmentStartedAt:
        updates.segmentStartedAt === undefined
          ? current.segmentStartedAt
          : updates.segmentStartedAt === null
            ? undefined
            : new Date(updates.segmentStartedAt),
      version: current.version + 1,
      lastUpdated: new Date(),
    };

    await db
      .update(userStats)
      .set({ activeWorkoutData: merged })
      .where(eq(userStats.userId, userId));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Beacon save failed:', error);
    return new NextResponse(null, { status: 204 });
  }
}
