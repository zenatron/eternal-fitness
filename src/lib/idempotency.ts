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

/** The transaction handle drizzle passes to `db.transaction(fn)`. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Returns the stored response if this key has already been processed for the
 * user, otherwise null. Cheap pre-flight outside the write transaction, so a
 * replay does not have to open one just to discover it is a replay.
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

export type IdempotencyClaim =
  | { status: 'claimed' }
  | { status: 'replay'; response: unknown }
  | { status: 'in-flight' };

/**
 * Atomically claims a key *inside the caller's transaction*.
 *
 * `INSERT … ON CONFLICT DO NOTHING` tests and takes the key in one statement,
 * closing the check-then-act window the find→record pair had: two concurrent
 * requests with the same key could both miss the pre-flight read and both run
 * the write, double-logging a workout. The losing transaction now simply finds
 * the key taken.
 *
 * - `claimed` — proceed with the write in this transaction; the claim commits
 *   or rolls back with it.
 * - `replay` — a previous attempt committed and stored its response.
 * - `in-flight` — the row exists with no stored response. Either another
 *   transaction holds the key right now (its claim rolls back if it fails) or
 *   a past attempt committed but crashed before recording the response — in
 *   which case the write DID happen. Both cases resolve the same way for the
 *   client: the entry is done and must not be retried (409).
 */
export async function claimIdempotencyKey(
  tx: Tx,
  userId: string,
  key: string,
  endpoint: string
): Promise<IdempotencyClaim> {
  const inserted = await tx
    .insert(idempotencyKeys)
    .values({ userId, key, endpoint, response: null })
    .onConflictDoNothing()
    .returning({ id: idempotencyKeys.id });
  if (inserted.length > 0) return { status: 'claimed' };

  const [existing] = await tx
    .select({ response: idempotencyKeys.response })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.userId, userId),
        eq(idempotencyKeys.key, key),
        eq(idempotencyKeys.endpoint, endpoint)
      )
    );
  if (existing?.response != null) return { status: 'replay', response: existing.response };
  return { status: 'in-flight' };
}

/**
 * Records the outcome of a successful write.
 *
 * An upsert because the row may already exist from `claimIdempotencyKey` (with
 * a null response waiting to be filled). `onConflictDoNothing` would leave that
 * null in place forever, turning every future replay into a false "in-flight".
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
      .onConflictDoUpdate({
        target: [idempotencyKeys.userId, idempotencyKeys.key],
        set: { response },
      });
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
