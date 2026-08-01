import { describe, expect, it } from 'bun:test';
import { computeStreakFromDates } from '@/lib/workout/completion';

/**
 * Streak rules, now shared by both completion routes.
 *
 * The case that motivated unifying them is `bridges a gap filled in afterwards`:
 * the live-completion path used to increment from `lastWorkoutAt`, which cannot
 * see a workout inserted behind it by the log-past-workout flow.
 */

/** Local midnight N days before the reference day. */
const daysAgo = (n: number, hour = 12) => {
  const d = new Date(2026, 7, 15, hour, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};

const NOW = new Date(2026, 7, 15, 20, 0, 0);

describe('computeStreakFromDates', () => {
  it('counts consecutive days ending today', () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2)];
    expect(computeStreakFromDates(dates, 0, NOW).currentStreak).toBe(3);
  });

  it('treats several workouts in one day as one day', () => {
    const dates = [daysAgo(0, 7), daysAgo(0, 18), daysAgo(1)];
    expect(computeStreakFromDates(dates, 0, NOW).currentStreak).toBe(2);
  });

  it('keeps the streak alive when the last workout was yesterday', () => {
    const dates = [daysAgo(1), daysAgo(2)];
    expect(computeStreakFromDates(dates, 0, NOW).currentStreak).toBe(2);
  });

  it('lapses the streak once a full day has been missed', () => {
    const dates = [daysAgo(2), daysAgo(3), daysAgo(4)];
    expect(computeStreakFromDates(dates, 0, NOW).currentStreak).toBe(0);
  });

  it('bridges a gap filled in afterwards', () => {
    // Monday and Wednesday were trained; Tuesday is logged retroactively. An
    // incremental count would still say 1 — this is why both routes recompute.
    const withGap = [daysAgo(0), daysAgo(2)];
    expect(computeStreakFromDates(withGap, 0, NOW).currentStreak).toBe(1);

    const bridged = [daysAgo(0), daysAgo(1), daysAgo(2)];
    expect(computeStreakFromDates(bridged, 0, NOW).currentStreak).toBe(3);
  });

  it('does not require the input to be sorted', () => {
    const shuffled = [daysAgo(2), daysAgo(0), daysAgo(1)];
    expect(computeStreakFromDates(shuffled, 0, NOW).currentStreak).toBe(3);
  });

  it('reports the longest run anywhere in the history', () => {
    // A 4-day run last month, a 2-day run now.
    const dates = [daysAgo(0), daysAgo(1), daysAgo(30), daysAgo(31), daysAgo(32), daysAgo(33)];
    const result = computeStreakFromDates(dates, 0, NOW);

    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(4);
  });

  it('never lowers a longest streak already recorded', () => {
    const result = computeStreakFromDates([daysAgo(0)], 12, NOW);
    expect(result.longestStreak).toBe(12);
  });

  it('reports the most recent completion as lastWorkoutAt', () => {
    const recent = daysAgo(0, 9);
    const result = computeStreakFromDates([daysAgo(3), recent, daysAgo(1)], 0, NOW);
    expect(result.lastWorkoutAt.getTime()).toBe(recent.getTime());
  });

  it('handles a user with no completed sessions', () => {
    const result = computeStreakFromDates([], 5, NOW);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(5);
  });
});
