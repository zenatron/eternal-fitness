import { describe, test, expect } from 'bun:test';
import {
  allow,
  pruneBuckets,
  AUTH_CHECK_LIMIT,
  AUTH_CHECK_GLOBAL_LIMIT,
  GENERAL_LIMIT,
  PUSH_TEST_LIMIT,
  type BucketMap,
} from '@/lib/rateLimit';

/**
 * Guards the token-bucket maths the middleware limits API abuse with. The
 * historical bug class here is silent: a wrong refill rate either locks real
 * users out mid-workout or leaves the brute-force surface wide open.
 */

const START = 1_000_000_000_000;

describe('allow (token bucket)', () => {
  test('admits up to capacity, then refuses', () => {
    const buckets: BucketMap = new Map();
    for (let i = 0; i < GENERAL_LIMIT.capacity; i++) {
      expect(allow(buckets, 'k', GENERAL_LIMIT, START)).toBe(true);
    }
    expect(allow(buckets, 'k', GENERAL_LIMIT, START)).toBe(false);
  });

  test('refills at the rule rate over time', () => {
    const buckets: BucketMap = new Map();
    const rule = { refillPerSecond: 2, capacity: 2 };
    expect(allow(buckets, 'k', rule, START)).toBe(true);
    expect(allow(buckets, 'k', rule, START)).toBe(true);
    expect(allow(buckets, 'k', rule, START)).toBe(false);
    // One second later, two tokens have refilled.
    expect(allow(buckets, 'k', rule, START + 1000)).toBe(true);
    expect(allow(buckets, 'k', rule, START + 1000)).toBe(true);
    expect(allow(buckets, 'k', rule, START + 1000)).toBe(false);
  });

  test('buckets are independent per key', () => {
    const buckets: BucketMap = new Map();
    expect(allow(buckets, 'a', AUTH_CHECK_LIMIT, START)).toBe(true);
    expect(allow(buckets, 'b', AUTH_CHECK_LIMIT, START)).toBe(true);
  });

  test('refill never exceeds capacity after a long idle', () => {
    const buckets: BucketMap = new Map();
    allow(buckets, 'k', GENERAL_LIMIT, START);
    // A week later the bucket must be full (capacity), not unbounded.
    expect(allow(buckets, 'k', GENERAL_LIMIT, START + 7 * 86400_000)).toBe(true);
    const bucket = buckets.get('k')!;
    expect(bucket.tokens).toBeLessThanOrEqual(GENERAL_LIMIT.capacity);
  });

  test('push-test rule is a slow trickle (1 token/minute, burst 3)', () => {
    const buckets: BucketMap = new Map();
    expect(allow(buckets, 'p', PUSH_TEST_LIMIT, START)).toBe(true);
    expect(allow(buckets, 'p', PUSH_TEST_LIMIT, START)).toBe(true);
    expect(allow(buckets, 'p', PUSH_TEST_LIMIT, START)).toBe(true);
    expect(allow(buckets, 'p', PUSH_TEST_LIMIT, START)).toBe(false);
    // Thirty seconds later: still no full token.
    expect(allow(buckets, 'p', PUSH_TEST_LIMIT, START + 30_000)).toBe(false);
    expect(allow(buckets, 'p', PUSH_TEST_LIMIT, START + 61_000)).toBe(true);
  });

  test('auth-check burst is tight enough to matter for brute force', () => {
    const buckets: BucketMap = new Map();
    let admitted = 0;
    for (let i = 0; i < 30; i++) {
      if (allow(buckets, 'a', AUTH_CHECK_LIMIT, START)) admitted++;
    }
    expect(admitted).toBe(AUTH_CHECK_LIMIT.capacity);
  });

  test('global auth-check bucket bounds minted identities', () => {
    const buckets: BucketMap = new Map();
    let admitted = 0;
    // The middleware funnels every caller through ONE shared key, so an
    // attacker minting a fresh x-forwarded-for per attempt still drains the
    // same bucket.
    for (let i = 0; i < 200; i++) {
      if (allow(buckets, 'auth-check:global', AUTH_CHECK_GLOBAL_LIMIT, START)) admitted++;
    }
    expect(admitted).toBe(AUTH_CHECK_GLOBAL_LIMIT.capacity);
  });
});

describe('pruneBuckets', () => {
  test('drops only stale buckets, and only when the map is large', () => {
    const buckets: BucketMap = new Map();
    buckets.set('stale', { tokens: 0, updated: START - 11 * 60_000 });
    buckets.set('fresh', { tokens: 0, updated: START });
    // Under the size threshold: untouched.
    pruneBuckets(buckets, START);
    expect(buckets.size).toBe(2);
    // Force the threshold.
    for (let i = 0; i < 10_000; i++) {
      buckets.set(`k${i}`, { tokens: 0, updated: START });
    }
    pruneBuckets(buckets, START);
    expect(buckets.has('stale')).toBe(false);
    expect(buckets.has('fresh')).toBe(true);
  });
});
