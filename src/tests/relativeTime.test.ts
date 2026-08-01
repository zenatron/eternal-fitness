import { describe, expect, it } from 'bun:test';
import { formatTimeAgo, formatSessionDateTime } from '@/utils/relativeTime';

/**
 * These exist because the bug they guard against was invisible: the dashboard
 * rendered a relative label that was correct when computed and wrong by the time
 * anyone read it. Injecting `now` is what makes that testable at all, so the
 * tests mostly exercise that the age comes from the gap between the two
 * arguments rather than from wall time.
 */

const at = (iso: string) => new Date(iso).getTime();

describe('formatTimeAgo', () => {
  const now = at('2026-08-01T18:00:00Z');

  it('ages a fixed timestamp as `now` advances', () => {
    const logged = '2026-08-01T17:00:00Z';

    expect(formatTimeAgo(logged, at('2026-08-01T17:00:30Z'))).toBe('Just now');
    expect(formatTimeAgo(logged, at('2026-08-01T17:05:00Z'))).toBe('5m ago');
    // The regression: an hour later this used to still read "1m ago" because the
    // string, not the timestamp, was what got cached.
    expect(formatTimeAgo(logged, at('2026-08-01T18:00:00Z'))).toBe('1h ago');
  });

  it('rounds down rather than up', () => {
    expect(formatTimeAgo(at('2026-08-01T17:00:59Z'), now)).toBe('59m ago');
    expect(formatTimeAgo(at('2026-08-01T16:59:59Z'), now)).toBe('1h ago');
  });

  it('names the day once past 24 hours', () => {
    expect(formatTimeAgo(at('2026-07-31T17:00:00Z'), now)).toBe('Yesterday');
    expect(formatTimeAgo(at('2026-07-29T17:00:00Z'), now)).toBe('3d ago');
  });

  it('falls back to a date beyond a week', () => {
    const result = formatTimeAgo(at('2026-07-01T17:00:00Z'), now);
    expect(result).not.toContain('ago');
    expect(result.length).toBeGreaterThan(0);
  });

  it('treats a future timestamp as just now rather than a negative age', () => {
    expect(formatTimeAgo(at('2026-08-01T18:30:00Z'), now)).toBe('Just now');
  });

  it('returns empty for missing or unparseable input', () => {
    expect(formatTimeAgo(null)).toBe('');
    expect(formatTimeAgo(undefined)).toBe('');
    expect(formatTimeAgo('not a date')).toBe('');
  });
});

describe('formatSessionDateTime', () => {
  it('uses calendar days, not elapsed hours', () => {
    // Two hours apart, but across local midnight: "Yesterday", not "2h".
    const finished = new Date(2026, 7, 1, 23, 0);
    const now = new Date(2026, 7, 2, 1, 0);

    expect(formatSessionDateTime(finished, now)).toContain('Yesterday');
  });

  it('labels the same calendar day as today', () => {
    const finished = new Date(2026, 7, 1, 6, 0);
    const now = new Date(2026, 7, 1, 22, 0);

    expect(formatSessionDateTime(finished, now)).toContain('Today');
  });

  it('returns empty for missing input', () => {
    expect(formatSessionDateTime(null)).toBe('');
  });
});
