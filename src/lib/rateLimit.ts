/**
 * In-memory token buckets for the middleware's API rate limiting.
 *
 * Extracted from middleware.ts so the refill maths is unit-testable, and so
 * the middleware module stays a thin wiring layer.
 *
 * Middleware runs once per instance and this app deploys as a single
 * container, so process memory is the right home: no extra moving parts, and
 * a restart merely resets the counters.
 */

export interface RateLimitRule {
  /** Bucket refill rate, tokens per second. */
  refillPerSecond: number;
  capacity: number;
}

export const GENERAL_LIMIT: RateLimitRule = { refillPerSecond: 10, capacity: 120 };
// Sends real Web Push messages to third-party services on every call.
export const PUSH_TEST_LIMIT: RateLimitRule = { refillPerSecond: 1 / 60, capacity: 3 };
// Unauthenticated auth checks are a brute-force surface.
export const AUTH_CHECK_LIMIT: RateLimitRule = { refillPerSecond: 1 / 6, capacity: 20 };
// Global ceiling for the unauthenticated auth check: per-identity buckets are
// keyed by x-forwarded-for, which a client behind no trusted proxy can simply
// mint fresh values for. The shared bucket bounds the total attempt rate no
// matter how many identities the attacker invents.
export const AUTH_CHECK_GLOBAL_LIMIT: RateLimitRule = { refillPerSecond: 1 / 2, capacity: 60 };

export type BucketMap = Map<string, { tokens: number; updated: number }>;

/**
 * Consume one token. Pure with respect to the bucket map — inject `now` for
 * tests. Returns false when the bucket is empty.
 */
export function allow(
  buckets: BucketMap,
  key: string,
  rule: RateLimitRule,
  now: number = Date.now()
): boolean {
  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { tokens: rule.capacity - 1, updated: now });
    return true;
  }
  const refilled = Math.min(
    rule.capacity,
    bucket.tokens + ((now - bucket.updated) / 1000) * rule.refillPerSecond
  );
  if (refilled < 1) {
    buckets.set(key, { tokens: refilled, updated: now });
    return false;
  }
  buckets.set(key, { tokens: refilled - 1, updated: now });
  return true;
}

/** Opportunistic pruning so the map cannot grow without bound. */
export function pruneBuckets(buckets: BucketMap, now: number = Date.now(), max = 10_000): void {
  if (buckets.size < max) return;
  const cutoff = now - 10 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (bucket.updated < cutoff) buckets.delete(key);
  }
}
