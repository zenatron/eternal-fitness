import { describe, test, expect } from 'bun:test';
import { updateSessionSchema } from '@/lib/validation/activeSession';
import { parseLimitParam } from '@/lib/api/response';
import { encodeBeforeCursor, buildBeforeCursorFilter } from '@/lib/api/pagination';
import { workoutSessions } from '@/lib/db/schema';

/**
 * Server-input hygiene: the active-session row is the hottest row in the app
 * and every one of these schemas guards what a hostile or buggy client can
 * persist into it.
 */

describe('activeSession validation', () => {
  const base = {
    performance: { 'ex-1': { exerciseKey: 'Bench Press', sets: [] } },
  };

  test('accepts a normal update', () => {
    const result = updateSessionSchema.safeParse({
      ...base,
      sessionNotes: 'felt good',
      version: 3,
      isTimerActive: true,
    });
    expect(result.success).toBe(true);
  });

  test('rejects an oversized template blob', () => {
    const big = 'x'.repeat(600 * 1024);
    const result = updateSessionSchema.safeParse({
      modifiedTemplate: { exercises: [{ filler: big }] },
    });
    expect(result.success).toBe(false);
  });

  test('accepts a template well under the cap', () => {
    const result = updateSessionSchema.safeParse({
      modifiedTemplate: { exercises: [{ filler: 'y'.repeat(1024) }] },
    });
    expect(result.success).toBe(true);
  });

  test('bounds accumulatedSeconds against absurd values', () => {
    expect(updateSessionSchema.safeParse({ accumulatedSeconds: -5 }).success).toBe(false);
    expect(updateSessionSchema.safeParse({ accumulatedSeconds: 86400 * 30 }).success).toBe(false);
    expect(updateSessionSchema.safeParse({ accumulatedSeconds: 3600 }).success).toBe(true);
  });

  test('bounds session notes', () => {
    expect(updateSessionSchema.safeParse({ sessionNotes: 'a'.repeat(20001) }).success).toBe(false);
  });
});

describe('parseLimitParam', () => {
  test('falls back on garbage and clamps absurd values', () => {
    expect(parseLimitParam(null)).toBe(50);
    expect(parseLimitParam('abc')).toBe(50);
    expect(parseLimitParam('0')).toBe(50);
    expect(parseLimitParam('-4')).toBe(50);
    expect(parseLimitParam('999999', 50, 200)).toBe(200);
    expect(parseLimitParam('7')).toBe(7);
  });
});

describe('keyset pagination cursor', () => {
  test('round-trips a timestamp + id cursor', () => {
    const date = new Date('2026-10-04T10:00:00.000Z');
    const cursor = encodeBeforeCursor(date, 'abc-123');
    const filter = buildBeforeCursorFilter(cursor, workoutSessions.completedAt, workoutSessions.id);
    expect(filter).toBeDefined();
  });

  test('accepts a bare ISO timestamp (legacy cursor format)', () => {
    const filter = buildBeforeCursorFilter('2026-10-04T10:00:00.000Z', workoutSessions.completedAt, workoutSessions.id);
    expect(filter).toBeDefined();
  });

  test('garbage cursors filter nothing rather than throwing', () => {
    expect(buildBeforeCursorFilter('garbage', workoutSessions.completedAt, workoutSessions.id)).toBeUndefined();
    expect(buildBeforeCursorFilter(null, workoutSessions.completedAt, workoutSessions.id)).toBeUndefined();
  });
});
