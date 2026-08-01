import { db } from '@/lib/db';
import { idempotencyKeys } from '@/lib/db/schema';
import { and, eq, lt } from 'drizzle-orm';

/**
 * Server-side dedupe for writes that the client may deliver more than once.
 *
 * Needed because the app queues mutations offline and replays them: a workout
 * completed in a gym basement is sent again when signal returns, and a request
 * that timed out may already have committed. Without this, either case logs the
 * workout twice — inflating volume, streaks and XP with no way to undo it.
 */

/** Keys older than this are pruned; well beyond any plausible replay window. */
const RETENTION_MS = 1000 * 60 * 60 * 24 * 7;

export interface IdempotencyHit {
  /** The response recorded the first time this key was seen. */
  response: unknown;
}

/**
 * Returns the stored response if this key has already been processed for the
 * user, otherwise null.
 */
export async function findIdempotentResponse(
  userId: string,
  key: string,
  endpoint: string
): Promise<IdempotencyHit | null> {
  const [existing] = await db
    .select({ response: idempotencyKeys.response })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.userId, userId),
        eq(idempotencyKeys.key, key),
        eq(idempotencyKeys.endpoint, endpoint)
      )
    );

  if (!existing) return null;
  return { response: existing.response };
}

/**
 * Records the outcome of a successful write.
 *
 * `onConflictDoNothing` matters here: two replays racing each other would
 * otherwise collide on the unique constraint and turn a duplicate — which we
 * have just successfully absorbed — into a 500.
 */
export async function recordIdempotentResponse(
  userId: string,
  key: string,
  endpoint: string,
  response: unknown
): Promise<void> {
  try {
    await db
      .insert(idempotencyKeys)
      .values({ userId, key, endpoint, response })
      .onConflictDoNothing();
  } catch (error) {
    // Never fail the request over bookkeeping — the write itself succeeded.
    console.error('Failed to record idempotency key:', error);
  }
}

/** Reads the header, normalising the empty string to null. */
export function getIdempotencyKey(request: Request): string | null {
  const key = request.headers.get('Idempotency-Key');
  return key && key.trim().length > 0 ? key.trim() : null;
}

/** Opportunistic cleanup; safe to call from any write path. */
export async function pruneIdempotencyKeys(): Promise<void> {
  try {
    await db
      .delete(idempotencyKeys)
      .where(lt(idempotencyKeys.createdAt, new Date(Date.now() - RETENTION_MS)));
  } catch (error) {
    console.error('Failed to prune idempotency keys:', error);
  }
}
