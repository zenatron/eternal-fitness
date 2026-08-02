import { describe, expect, it } from 'bun:test';
import { computeStreakFromDates } from '@/lib/workout/completion';

/**
 * Streak rules, shared by all four completion routes.
 *
 * The case that motivated unifying them is `bridges a gap filled in afterwards`:
 * the live-completion path used to increment from `lastWorkoutAt`, which cannot
 * see a workout inserted behind it by the log-past-workout flow.
 *
 * Every date below is written as an explicit UTC instant and read back in a
 * named zone. The previous version of this file built dates in the *process*
 * zone, so it passed on a developer machine in New York and would have passed
 * just as happily in the UTC production container while the two disagreed about
 * what day an evening workout belonged to — which was the actual bug.
 */

const NY = 'America/New_York';
const TOKYO = 'Asia/Tokyo';

/**
 * `n` days before 2026-08-15 in New York, at the given local hour.
 * August is EDT, UTC-4, so local hour + 4 is the UTC hour.
 */
const daysAgo = (n: number, localHour = 12) => {
  const day = 15 - n;
  return new Date(Date.UTC(2026, 7, day, localHour + 4, 0, 0));
};

/** 8pm on 2026-08-15 in New York — which is already the 16th in UTC. */
const NOW = new Date(Date.UTC(2026, 7, 16, 0, 0, 0));

describe('computeStreakFromDates', () => {
  it('counts consecutive days ending today', () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2)];
    expect(computeStreakFromDates(dates, NY, 0, NOW).currentStreak).toBe(3);
  });

  it('treats several workouts in one day as one day', () => {
    const dates = [daysAgo(0, 7), daysAgo(0, 18), daysAgo(1)];
    expect(computeStreakFromDates(dates, NY, 0, NOW).currentStreak).toBe(2);
  });

  it('keeps the streak alive when the last workout was yesterday', () => {
    const dates = [daysAgo(1), daysAgo(2)];
    expect(computeStreakFromDates(dates, NY, 0, NOW).currentStreak).toBe(2);
  });

  it('lapses the streak once a full day has been missed', () => {
    const dates = [daysAgo(2), daysAgo(3), daysAgo(4)];
    expect(computeStreakFromDates(dates, NY, 0, NOW).currentStreak).toBe(0);
  });

  it('bridges a gap filled in afterwards', () => {
    // Monday and Wednesday were trained; Tuesday is logged retroactively. An
    // incremental count would still say 1 — this is why both routes recompute.
    const withGap = [daysAgo(0), daysAgo(2)];
    expect(computeStreakFromDates(withGap, NY, 0, NOW).currentStreak).toBe(1);

    const bridged = [daysAgo(0), daysAgo(1), daysAgo(2)];
    expect(computeStreakFromDates(bridged, NY, 0, NOW).currentStreak).toBe(3);
  });

  it('does not require the input to be sorted', () => {
    const shuffled = [daysAgo(2), daysAgo(0), daysAgo(1)];
    expect(computeStreakFromDates(shuffled, NY, 0, NOW).currentStreak).toBe(3);
  });

  it('reports the longest run anywhere in the history', () => {
    // A 4-day run last month, a 2-day run now.
    const dates = [daysAgo(0), daysAgo(1), daysAgo(30), daysAgo(31), daysAgo(32), daysAgo(33)];
    const result = computeStreakFromDates(dates, NY, 0, NOW);

    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(4);
  });

  it('never lowers a longest streak already recorded', () => {
    const result = computeStreakFromDates([daysAgo(0)], NY, 12, NOW);
    expect(result.longestStreak).toBe(12);
  });

  it('reports the most recent completion as lastWorkoutAt', () => {
    const recent = daysAgo(0, 9);
    const result = computeStreakFromDates([daysAgo(3), recent, daysAgo(1)], NY, 0, NOW);
    expect(result.lastWorkoutAt.getTime()).toBe(recent.getTime());
  });

  it('handles a user with no completed sessions', () => {
    const result = computeStreakFromDates([], NY, 5, NOW);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(5);
  });
});

describe('computeStreakFromDates timezone handling', () => {
  /**
   * The regression. Three consecutive evening workouts in New York — 9pm on the
   * 13th, 14th and 15th — are 01:00 UTC on the 14th, 15th and 16th. Counted in
   * UTC that is still three days, but the *current* day is wrong: UTC believes
   * today is already the 16th, so the run reads as ending yesterday.
   */
  const evening = (day: number) => new Date(Date.UTC(2026, 7, day + 1, 1, 0, 0));

  it('counts evening workouts against the user local day', () => {
    const dates = [evening(13), evening(14), evening(15)];
    expect(computeStreakFromDates(dates, NY, 0, NOW).currentStreak).toBe(3);
  });

  it('collapses two local days that share one UTC day', () => {
    // 11pm on the 14th and 1am on the 15th, New York: two distinct local days,
    // but both fall inside 2026-08-15 UTC.
    const lateNight = new Date(Date.UTC(2026, 7, 15, 3, 0, 0));
    const earlyMorning = new Date(Date.UTC(2026, 7, 15, 5, 0, 0));

    expect(computeStreakFromDates([lateNight, earlyMorning], NY, 0, NOW).currentStreak).toBe(2);
    expect(computeStreakFromDates([lateNight, earlyMorning], 'UTC', 0, NOW).currentStreak).toBe(1);
  });

  it('works east of Greenwich too', () => {
    // 8am Tokyo on the 14th, 15th and 16th — the 16th is Tokyo's "today" at NOW.
    const morning = (day: number) => new Date(Date.UTC(2026, 7, day, 23, 0, 0));
    const dates = [morning(13), morning(14), morning(15)];
    expect(computeStreakFromDates(dates, TOKYO, 0, NOW).currentStreak).toBe(3);
  });

  it('falls back to UTC rather than throwing on an unknown zone', () => {
    const dates = [daysAgo(0), daysAgo(1)];
    expect(() => computeStreakFromDates(dates, 'Not/AZone', 0, NOW)).not.toThrow();
  });
});
