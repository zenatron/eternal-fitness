import { describe, expect, it } from 'bun:test';
import {
  addDays,
  anchorToDayKey,
  civilDayToInstant,
  dayKeyOf,
  daysBetween,
  formatCivilDayRelative,
  formatDayKey,
  monthOf,
  resolveTimeZone,
  startOfDayInZone,
  startOfWeek,
  todayKey,
} from '@/utils/datetime';

const NY = 'America/New_York';
const TOKYO = 'Asia/Tokyo';
const KATHMANDU = 'Asia/Kathmandu'; // UTC+05:45, the offset that breaks naive maths
const LA = 'America/Los_Angeles';

describe('dayKeyOf', () => {
  it('reports the civil day in the requested zone, not UTC', () => {
    // 8pm on August 1st in New York is already August 2nd in UTC.
    const evening = new Date('2026-08-02T00:30:00Z');
    expect(dayKeyOf(evening, NY)).toBe('2026-08-01');
    expect(dayKeyOf(evening, 'UTC')).toBe('2026-08-02');
    expect(dayKeyOf(evening, TOKYO)).toBe('2026-08-02');
  });

  it('handles the 45-minute offset zone', () => {
    expect(dayKeyOf(new Date('2026-08-01T18:20:00Z'), KATHMANDU)).toBe('2026-08-02');
    expect(dayKeyOf(new Date('2026-08-01T18:10:00Z'), KATHMANDU)).toBe('2026-08-01');
  });

  it('returns empty for an invalid input rather than throwing', () => {
    expect(dayKeyOf(new Date('nonsense'), NY)).toBe('');
  });
});

describe('resolveTimeZone', () => {
  it('falls back to UTC for missing or unknown zones', () => {
    expect(resolveTimeZone(null)).toBe('UTC');
    expect(resolveTimeZone('')).toBe('UTC');
    expect(resolveTimeZone('Mars/Olympus_Mons')).toBe('UTC');
  });

  it('passes through a real zone', () => {
    expect(resolveTimeZone(NY)).toBe(NY);
  });
});

describe('civil day arithmetic', () => {
  it('adds and subtracts days across a month boundary', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is unaffected by DST, unlike local-midnight Date arithmetic', () => {
    // US spring-forward 2026 is March 8th; that civil day is 23 hours long.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });

  it('measures direction', () => {
    expect(daysBetween('2026-08-01', '2026-08-03')).toBe(2);
    expect(daysBetween('2026-08-03', '2026-08-01')).toBe(-2);
  });

  it('finds the Sunday starting the week', () => {
    expect(startOfWeek('2026-08-01')).toBe('2026-07-26'); // a Saturday
    expect(startOfWeek('2026-07-26')).toBe('2026-07-26');
  });

  it('reads the month a day belongs to', () => {
    expect(monthOf('2026-01-31')).toEqual({ year: 2026, month: 1 });
  });
});

describe('startOfDayInZone', () => {
  it('finds the real instant a civil day begins', () => {
    // August 1st 2026 in New York is EDT, UTC-4.
    expect(startOfDayInZone('2026-08-01', NY).toISOString()).toBe('2026-08-01T04:00:00.000Z');
    // Tokyo is UTC+9 year round.
    expect(startOfDayInZone('2026-08-01', TOKYO).toISOString()).toBe('2026-07-31T15:00:00.000Z');
    expect(startOfDayInZone('2026-08-01', 'UTC').toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('handles a 45-minute offset', () => {
    expect(startOfDayInZone('2026-08-01', KATHMANDU).toISOString()).toBe('2026-07-31T18:15:00.000Z');
  });

  it('handles winter, when New York is UTC-5', () => {
    expect(startOfDayInZone('2026-01-15', NY).toISOString()).toBe('2026-01-15T05:00:00.000Z');
  });

  it('lands inside the intended day on a spring-forward date', () => {
    // 2026-03-08 loses its 2am hour in New York; midnight itself still exists.
    const start = startOfDayInZone('2026-03-08', NY);
    expect(dayKeyOf(start, NY)).toBe('2026-03-08');
    expect(dayKeyOf(new Date(start.getTime() - 60_000), NY)).toBe('2026-03-07');
  });

  it('lands inside the intended day on a fall-back date', () => {
    const start = startOfDayInZone('2026-11-01', NY);
    expect(dayKeyOf(start, NY)).toBe('2026-11-01');
    expect(dayKeyOf(new Date(start.getTime() - 60_000), NY)).toBe('2026-10-31');
  });
});

describe('civilDayToInstant', () => {
  /**
   * The regression this whole module exists for: scheduling a workout on the
   * evening of August 1st for August 2nd, and being shown August 3rd.
   */
  it('round-trips the scheduled day in the zone it was picked in', () => {
    const stored = civilDayToInstant('2026-08-02', NY);
    expect(dayKeyOf(stored, NY)).toBe('2026-08-02');
  });

  it('survives a reader whose zone is wrong by up to twelve hours', () => {
    const stored = civilDayToInstant('2026-08-02', NY);
    // This is the guarantee noon anchoring actually provides, and the one that
    // matters: a midnight anchor would have shown August 1st in Los Angeles.
    expect(dayKeyOf(stored, LA)).toBe('2026-08-02');
    expect(dayKeyOf(stored, 'UTC')).toBe('2026-08-02');
    expect(dayKeyOf(stored, 'Europe/Berlin')).toBe('2026-08-02');
  });

  it('does not pretend to span the globe', () => {
    // NY noon is 16:00Z, which is already past midnight in Tokyo. Beyond ±12h
    // the day must be resolved in the zone it was scheduled in — noon is slack,
    // not a substitute for knowing the user's timezone.
    const stored = civilDayToInstant('2026-08-02', NY);
    expect(dayKeyOf(stored, TOKYO)).toBe('2026-08-03');
    expect(dayKeyOf(stored, KATHMANDU)).toBe('2026-08-02');
  });

  it('does not drift when the picked day is a DST transition', () => {
    expect(dayKeyOf(civilDayToInstant('2026-03-08', NY), NY)).toBe('2026-03-08');
    expect(dayKeyOf(civilDayToInstant('2026-11-01', NY), NY)).toBe('2026-11-01');
  });
});

describe('formatDayKey', () => {
  it('renders the day it stands for, regardless of the process zone', () => {
    expect(formatDayKey('2026-08-02', { month: 'long', day: 'numeric', year: 'numeric' }))
      .toBe('August 2, 2026');
  });

  it('returns empty for a blank key', () => {
    expect(formatDayKey('')).toBe('');
  });
});

describe('formatCivilDayRelative', () => {
  // 8:30pm on August 1st in New York.
  const evening = new Date('2026-08-02T00:30:00Z');

  it('names the day relative to the user, not to UTC', () => {
    expect(formatCivilDayRelative('2026-08-01', NY, evening)).toBe('Today');
    expect(formatCivilDayRelative('2026-08-02', NY, evening)).toBe('Tomorrow');
    expect(formatCivilDayRelative('2026-07-31', NY, evening)).toBe('Yesterday');
  });

  it('would have said the wrong thing under the old UTC reading', () => {
    // Same instant read in UTC is already the 2nd, so "tomorrow" becomes "today".
    expect(formatCivilDayRelative('2026-08-02', 'UTC', evening)).toBe('Today');
  });

  it('falls back to a dated label further out', () => {
    expect(formatCivilDayRelative('2026-08-20', NY, evening)).toBe('Aug 20');
    expect(formatCivilDayRelative('2027-01-04', NY, evening)).toBe('Jan 4, 2027');
  });
});

describe('todayKey / anchorToDayKey', () => {
  it('agree with each other', () => {
    const now = new Date('2026-08-02T00:30:00Z');
    expect(todayKey(NY, now)).toBe('2026-08-01');
    expect(anchorToDayKey(new Date(Date.UTC(2026, 7, 1)))).toBe('2026-08-01');
  });
});
