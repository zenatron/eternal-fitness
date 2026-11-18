/**
 * Strength trends, per exercise and per muscle.
 *
 * The app already answered "what did I lift?" (history), "what is my best?"
 * (records) and "how much did I do?" (volume). It could not answer the question
 * a training log exists for — "am I getting stronger, and where?" — without
 * opening each exercise page and eyeballing a chart. This module turns a span of
 * logged sessions into that answer.
 *
 * Everything is measured in estimated one-rep max (see utils/oneRepMax.ts)
 * rather than top weight, because 5 × 100 and 1 × 105 are different
 * performances and only e1RM can tell them apart. It is pure: the API route
 * does the reading and the time-zone bucketing, this does the maths, and the
 * tests drive it with fixed data.
 *
 * Weights are compared in whatever unit they were logged in. Mixing units in
 * one history would skew a trend, but no screen in the app converts stored
 * sets either, so this is no worse than the history it reads.
 */

import { bestOneRepMax, type SetLike } from '@/utils/oneRepMax';
import { computeRegionLoad, type LoadSet } from '@/utils/muscleLoad';
import { regionsForMuscle, REGION_META, BODY_REGIONS, type BodyRegion } from '@/lib/muscleRegions';
import { canonicalExerciseKey, exerciseDisplayName, resolveExercise } from '@/lib/exerciseLookup';
import { addDays, daysBetween, startOfWeek, type DayKey } from '@/utils/datetime';

export interface InsightExercise {
  exerciseKey: string;
  sets: (SetLike & LoadSet)[];
}

export interface InsightSession {
  /** Civil day the session was finished on, in the user's zone. */
  day: DayKey;
  exercises: InsightExercise[];
}

export interface StrengthPoint {
  day: DayKey;
  e1rm: number;
  weight: number;
  reps: number;
}

export type TrendStatus = 'up' | 'flat' | 'down' | 'new';

export interface ExerciseTrend {
  key: string;
  name: string;
  /** The region the exercise mainly trains, from its first-listed muscle. */
  region: BodyRegion | null;
  points: StrengthPoint[];
  /** Best e1RM over the first two sessions in the window. */
  start: number;
  /** Best e1RM over the last two sessions in the window. */
  current: number;
  /** Highest e1RM in the window, and the day it was set. */
  best: number;
  bestDay: DayKey;
  /** (current − start) / start, or null with too few sessions to say. */
  change: number | null;
  /** Least-squares slope, in weight units per week. */
  perWeek: number | null;
  status: TrendStatus;
  sessions: number;
  lastDay: DayKey;
  /** Days from the best session to `today`; set by buildStrengthInsights. */
  daysSinceBest?: number;
  /**
   * Still being trained, but no new best for STALL_DAYS. A lift that is
   * "up 5%" over six months can still have been stuck for the last two, and
   * that is the part worth acting on.
   */
  stalled?: boolean;
}

export interface WeekValue {
  week: DayKey;
  value: number | null;
}

export interface RegionTrend {
  region: BodyRegion;
  label: string;
  /** Strength relative to each lift's starting level (see ExerciseTrend.start),
   *  averaged across the region's lifts. 1 = that starting level. */
  index: WeekValue[];
  /** Mean of the region's exercise changes; null until one has a trend. */
  change: number | null;
  /** Names of the exercises that feed the index, most-trained first. */
  exercises: string[];
  /** Effective hard sets per week (see utils/muscleLoad.ts). */
  weeklySets: WeekValue[];
  /** Mean effective sets per week over the last four weeks. */
  recentSetsPerWeek: number;
}

export interface StrengthInsights {
  weeks: DayKey[];
  exercises: ExerciseTrend[];
  regions: RegionTrend[];
}

/** Sessions needed before a trend is reported rather than called "new". */
export const MIN_SESSIONS_FOR_TREND = 3;

/**
 * A move smaller than this either way is "flat". e1RM from a single good or bad
 * day wanders a few percent on its own; calling 1% "progress" would just be
 * reading noise back to the user.
 */
export const FLAT_THRESHOLD = 0.025;

/** No new best for this long, while still training the lift, is a stall. */
export const STALL_DAYS = 21;

/** Weeks averaged for the "sets per week right now" figure. */
const RECENT_WEEKS = 4;

/** The single region an exercise is credited to for strength. */
export function primaryRegion(exerciseKey: string): BodyRegion | null {
  const muscles = resolveExercise(exerciseKey)?.muscles ?? [];
  const first = muscles[0];
  if (!first) return null;
  // For a broad group ("Back") take the region it weights most heavily, so a
  // row is credited to the lats rather than split three ways.
  const entries = Object.entries(regionsForMuscle(first)) as [BodyRegion, number][];
  if (entries.length === 0) return null;
  // 'Full Body' spreads across a dozen regions; crediting a burpee to quads
  // would be invention, so broad-everything movements stay unassigned.
  if (entries.length > 4) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function slopePerWeek(points: StrengthPoint[]): number | null {
  if (points.length < 2) return null;
  const origin = points[0].day;
  const xs = points.map((p) => daysBetween(origin, p.day));
  const ys = points.map((p) => p.e1rm);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  // Every point on one day: no time axis to take a slope along.
  if (den === 0) return null;
  return (num / den) * 7;
}

/** Trend for one exercise from its per-session best sets, oldest first. */
export function exerciseTrend(key: string, points: StrengthPoint[]): ExerciseTrend | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  // Two-session windows at each end: one light day at the start (a deload, a
  // first go at a new lift) would otherwise make every later session look like
  // a huge jump.
  const head = sorted.slice(0, 2);
  const tail = sorted.slice(-2);
  const start = Math.max(...head.map((p) => p.e1rm));
  const current = Math.max(...tail.map((p) => p.e1rm));

  let bestPoint = sorted[0];
  for (const p of sorted) if (p.e1rm >= bestPoint.e1rm) bestPoint = p;

  const enough = sorted.length >= MIN_SESSIONS_FOR_TREND;
  const change = enough && start > 0 ? (current - start) / start : null;
  const status: TrendStatus =
    change === null ? 'new' : change >= FLAT_THRESHOLD ? 'up' : change <= -FLAT_THRESHOLD ? 'down' : 'flat';

  return {
    key,
    name: exerciseDisplayName(key),
    region: primaryRegion(key),
    points: sorted,
    start,
    current,
    best: bestPoint.e1rm,
    bestDay: bestPoint.day,
    change,
    perWeek: enough ? slopePerWeek(sorted) : null,
    status,
    sessions: sorted.length,
    lastDay: sorted[sorted.length - 1].day,
  };
}

/** Every week start from the first to the last, inclusive. */
export function weekRange(from: DayKey, to: DayKey): DayKey[] {
  const weeks: DayKey[] = [];
  const last = startOfWeek(to);
  // Bounded: a decade of weeks is ~520, far past any real window, and stops a
  // corrupt date from producing an unbounded loop.
  for (let w = startOfWeek(from); w <= last && weeks.length < 600; w = addDays(w, 7)) {
    weeks.push(w);
  }
  return weeks;
}

/**
 * Builds the full picture for a window of sessions.
 *
 * `from` is the first day of the window (null for all time) and `today` the
 * last; both are civil days in the user's zone.
 */
export function buildStrengthInsights(
  sessions: readonly InsightSession[],
  { from, today }: { from: DayKey | null; today: DayKey }
): StrengthInsights {
  const ordered = [...sessions].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const firstDay = from ?? ordered[0]?.day ?? today;
  const weeks = weekRange(firstDay, today);
  const weekIndex = new Map(weeks.map((w, i) => [w, i]));

  // ── Per exercise: the best set of each session ──
  const byExercise = new Map<string, StrengthPoint[]>();
  const weeklyLoad = weeks.map(() => Object.fromEntries(BODY_REGIONS.map((r) => [r, 0])) as Record<BodyRegion, number>);

  for (const session of ordered) {
    const wi = weekIndex.get(startOfWeek(session.day));

    // Region load for the volume view. Computed per session, summed per week.
    if (wi !== undefined) {
      const load = computeRegionLoad(session.exercises);
      for (const r of BODY_REGIONS) weeklyLoad[wi][r] += load[r];
    }

    for (const ex of session.exercises) {
      const key = canonicalExerciseKey(ex.exerciseKey ?? '');
      if (!key) continue;
      const best = bestOneRepMax(ex.sets ?? []);
      if (!best) continue;
      const list = byExercise.get(key) ?? [];
      // Two entries of one lift in a session (a top set and back-off work
      // logged separately) are one data point: the better of the two.
      const sameDay = list.find((p) => p.day === session.day);
      if (sameDay) {
        if (best.oneRepMax > sameDay.e1rm) {
          sameDay.e1rm = best.oneRepMax;
          sameDay.weight = best.weight;
          sameDay.reps = best.reps;
        }
      } else {
        list.push({ day: session.day, e1rm: best.oneRepMax, weight: best.weight, reps: best.reps });
      }
      byExercise.set(key, list);
    }
  }

  const exercises = [...byExercise.entries()]
    .map(([key, points]) => exerciseTrend(key, points))
    .filter((t): t is ExerciseTrend => t !== null)
    .map((t) => {
      const daysSinceBest = daysBetween(t.bestDay, today);
      // Trained at least twice since the best, so this is a lift being worked
      // on and not moving — not one that was simply dropped.
      const sinceBest = t.points.filter((p) => p.day > t.bestDay).length;
      return { ...t, daysSinceBest, stalled: t.status !== 'new' && daysSinceBest >= STALL_DAYS && sinceBest >= 2 };
    })
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));

  // ── Per region: a strength index ──
  //
  // Each exercise is expressed relative to its own starting point (1.0 = where
  // it began), so a 60 lb curl and a 300 lb squat can be averaged without the
  // squat drowning the curl out. Within a week the index is the mean, across
  // the exercises for that region, of each one's most recent ratio — carried
  // forward through weeks it was not trained, because not benching for a week
  // does not make you weaker on paper.
  const regions: RegionTrend[] = [];
  for (const region of BODY_REGIONS) {
    const contributors = exercises.filter((e) => e.region === region && e.sessions >= 2 && e.start > 0);
    const weeklySets = weeks.map((week, i) => ({ week, value: round1(weeklyLoad[i][region]) }));
    const trainedAtAll = weeklySets.some((w) => (w.value ?? 0) > 0);
    if (contributors.length === 0 && !trainedAtAll) continue;

    const index: WeekValue[] = weeks.map((week) => {
      const weekEnd = addDays(week, 6);
      const ratios: number[] = [];
      for (const ex of contributors) {
        let latest: StrengthPoint | undefined;
        for (const p of ex.points) {
          if (p.day <= weekEnd) latest = p;
          else break;
        }
        if (latest) ratios.push(latest.e1rm / ex.start);
      }
      return { week, value: ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null };
    });

    // The mean of the contributing exercises' own changes — not the index's
    // first-to-last delta — so a muscle trained by one lift reports exactly
    // the figure that lift does. Measuring the two differently had chest at
    // +15% beside a +9.5% bench press, from the same sessions.
    const changes = contributors.map((c) => c.change).filter((c): c is number => c !== null);
    const change = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : null;

    const recent = weeklySets.slice(-RECENT_WEEKS);
    regions.push({
      region,
      label: REGION_META[region].label,
      index,
      change,
      exercises: contributors.map((c) => c.name),
      weeklySets,
      recentSetsPerWeek: round1(recent.reduce((t, w) => t + (w.value ?? 0), 0) / Math.max(1, recent.length)),
    });
  }

  regions.sort((a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity) || b.recentSetsPerWeek - a.recentSetsPerWeek);

  return { weeks, exercises, regions };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
