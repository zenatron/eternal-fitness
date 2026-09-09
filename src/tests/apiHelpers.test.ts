import { describe, expect, test } from 'bun:test';
import { parseLimitParam } from '@/lib/api/response';
import { getIdempotencyKey } from '@/lib/idempotency';

/**
 * The session-list endpoints take `limit` straight from the query string, and
 * it flows into SQL. These tests pin the contract: garbage must never become
 * NaN or an unbounded number.
 */
describe('parseLimitParam', () => {
  test('missing value falls back to the default', () => {
    expect(parseLimitParam(null)).toBe(50);
    expect(parseLimitParam(null, 20)).toBe(20);
  });

  test('non-numeric values fall back instead of becoming NaN', () => {
    expect(parseLimitParam('abc')).toBe(50);
    expect(parseLimitParam('')).toBe(50);
    // NaN reaching a SQL LIMIT throws — the regression this guards against.
    expect(Number.isNaN(parseLimitParam('12xyz'))).toBe(false);
  });

  test('non-positive values fall back; large values clamp to max', () => {
    expect(parseLimitParam('0')).toBe(50);
    expect(parseLimitParam('-5')).toBe(50);
    expect(parseLimitParam('999999')).toBe(200);
    expect(parseLimitParam('999999', 20, 50)).toBe(50);
  });

  test('valid values pass through', () => {
    expect(parseLimitParam('5', 20)).toBe(5);
    expect(parseLimitParam('200')).toBe(200);
  });
});

describe('getIdempotencyKey', () => {
  const requestWith = (key: string | null) =>
    new Request('https://app.test/api/test', {
      method: 'POST',
      headers: key === null ? {} : { 'Idempotency-Key': key },
    });

  test('reads the header', () => {
    expect(getIdempotencyKey(requestWith('abc-123'))).toBe('abc-123');
  });

  test('missing header is null', () => {
    expect(getIdempotencyKey(requestWith(null))).toBeNull();
  });

  test('empty and whitespace-only keys are treated as absent', () => {
    expect(getIdempotencyKey(requestWith(''))).toBeNull();
    expect(getIdempotencyKey(requestWith('   '))).toBeNull();
  });

  test('surrounding whitespace is trimmed', () => {
    expect(getIdempotencyKey(requestWith('  key-1  '))).toBe('key-1');
  });
});
