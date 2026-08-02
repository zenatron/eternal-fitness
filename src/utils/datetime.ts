/**
 * The one place that decides what a "date" means in this app.
 *
 * Every timezone bug this codebase has had came from conflating two different
 * things under the single name `Date`:
 *
 *   1. An **instant** — a real point in time. `completedAt`, `createdAt`,
 *      `startedAt`. Stored as `timestamptz`. Rendered in the *viewer's* zone.
 *      Formatting these is `relativeTime.ts`'s job, and it already does it
 *      correctly by using plain `toLocaleString` with no UTC games.
 *
 *   2. A **civil day** — "which square on the calendar". Streaks, monthly
 *      totals, activity grids, scheduled workouts. A civil day is not a point
 *      in time; it is only meaningful relative to a timezone. 8pm on August 1st
 *      in New York and 8pm on August 1st in Tokyo are seventeen hours apart and
 *      both are "August 1st".
 *
 * The old `dateUtils.ts` blurred the two. It took an instant, read its **UTC**
 * calendar components, and called the result "the local date". That is only
 * correct when the instant happens to be UTC midnight. For a real evening
 * timestamp west of Greenwich it silently reports tomorrow — which is exactly
 * how scheduling a workout for the 2nd at 8pm displayed it on the 3rd.
 *
 * The rule this module enforces: **a civil day is a `DayKey` string, never a
 * `Date`.** You cannot accidentally apply timezone arithmetic to a string, and
 * a `Date` never has to stand in for something that isn't an instant.
 */

/** A civil day as `YYYY-MM-DD`. Not an instant — it has no time and no offset. */
export type DayKey = string;

export const UTC = 'UTC';

const DAY_MS = 86_400_000;

/**
 * `en-CA` formats as `YYYY-MM-DD`, which is the whole reason it is used here
 * rather than the user's locale — this is a key, not display text.
 */
function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Validates an IANA zone name, falling back rather than throwing.
 *
 * A bad or missing zone must never take down a stats route, and an unknown zone
 * is entirely possible: the value originates from a browser and is stored for
 * as long as the account lives, while the IANA database keeps changing.
 * `Intl.DateTimeFormat` is the only reliable validator available without a
 * dependency — it throws `RangeError` on an unknown zone.
 */
export function resolveTimeZone(timeZone?: string | null): string {
  if (!timeZone) return UTC;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return timeZone;
  } catch {
    return UTC;
  }
}

/** The zone this device is in. Safe on the server, where it resolves to the container's zone. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || UTC;
  } catch {
    return UTC;
  }
}

/**
 * Which civil day an instant falls on, in a given zone.
 *
 * This is the function that replaces `formatUTCDateToLocalDateShort`. The
 * difference is that the zone is a required argument: there is no default,
 * because "whose calendar?" is precisely the question that kept being answered
 * by accident.
 */
export function dayKeyOf(instant: Date | string | number, timeZone: string): DayKey {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return dayFormatter(resolveTimeZone(timeZone)).format(date);
}

/** Today's civil day in a given zone. */
export function todayKey(timeZone: string, now: Date | number = Date.now()): DayKey {
  return dayKeyOf(now instanceof Date ? now : new Date(now), timeZone);
}

/** Splits a `DayKey` into its numeric parts. */
export function dayKeyParts(key: DayKey): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

/**
 * Turns a `DayKey` into a `Date` for arithmetic and comparison only.
 *
 * Anchored at UTC midnight deliberately: consecutive day keys are then exactly
 * `DAY_MS` apart with no DST discontinuity, so "are these two days adjacent?"
 * is honest subtraction. The result is a calendar label wearing a `Date`, not a
 * moment anything happened — never format it, and never send it to a client.
 */
export function dayKeyToAnchor(key: DayKey): Date {
  const { year, month, day } = dayKeyParts(key);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Inverse of {@link dayKeyToAnchor}. */
export function anchorToDayKey(anchor: Date): DayKey {
  return dayFormatter(UTC).format(anchor);
}

/** Shifts a civil day by whole days. Negative `n` goes backwards. */
export function addDays(key: DayKey, n: number): DayKey {
  return anchorToDayKey(new Date(dayKeyToAnchor(key).getTime() + n * DAY_MS));
}

/** Whole civil days from `from` to `to`. Positive when `to` is later. */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((dayKeyToAnchor(to).getTime() - dayKeyToAnchor(from).getTime()) / DAY_MS);
}

/** The Sunday that starts the civil week containing `key`. */
export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -dayKeyToAnchor(key).getUTCDay());
}

/** The calendar year and 1-indexed month a civil day belongs to. */
export function monthOf(key: DayKey): { year: number; month: number } {
  const { year, month } = dayKeyParts(key);
  return { year, month };
}

/**
 * The real instant at which a civil day begins in a zone.
 *
 * Needed for database range predicates, which compare against stored
 * `timestamptz` values and so must be given an actual moment.
 *
 * Found by probing rather than computing: guess UTC midnight, ask what civil day
 * that lands on in the target zone, and correct by the difference. Two rounds
 * converge for every real zone, including the half-hour and 45-minute offsets,
 * and this avoids hardcoding an offset table that DST would invalidate twice a
 * year. The final backward scan handles the spring-forward case where the
 * nominal midnight does not exist.
 */
export function startOfDayInZone(key: DayKey, timeZone: string): Date {
  const zone = resolveTimeZone(timeZone);
  let guess = dayKeyToAnchor(key);

  for (let i = 0; i < 2; i++) {
    const landed = dayKeyOf(guess, zone);
    const drift = daysBetween(landed, key);
    if (drift === 0) break;
    guess = new Date(guess.getTime() + drift * DAY_MS);
  }

  // Walk back to the first minute that is still the target day. The probe above
  // lands somewhere inside it, not necessarily at its start.
  let cursor = guess;
  for (let i = 0; i < 26 * 60; i++) {
    const previous = new Date(cursor.getTime() - 60_000);
    if (dayKeyOf(previous, zone) !== key) break;
    cursor = previous;
  }
  return cursor;
}

/**
 * A stable instant representing a civil day, for storage in a `timestamptz`
 * column that has to hold a day rather than a moment — `scheduledAt`.
 *
 * Anchored at local **noon**, not local midnight. Midnight sits on the boundary:
 * one hour of clock drift or a stale device zone is enough to push it into the
 * previous day, and the user sees their Tuesday workout on Monday. Noon leaves
 * about twelve hours of slack either way, so ordinary skew cannot move the day.
 *
 * Noon is defence in depth, not the correctness argument. Twelve hours does not
 * span the globe — a day anchored at noon in New York is already past midnight
 * in Tokyo — so the reader must still resolve the day in the zone the workout
 * was scheduled in, which is what {@link dayKeyOf} with the user's stored zone
 * does. What noon buys is that a *slightly* wrong zone still yields the right
 * day, which is the failure mode that actually occurs.
 */
export function civilDayToInstant(key: DayKey, timeZone: string): Date {
  return new Date(startOfDayInZone(key, timeZone).getTime() + 12 * 60 * 60 * 1000);
}

/**
 * Renders a civil day for display, e.g. "August 2, 2026".
 *
 * Formats the anchor in UTC, which is the one case where forcing UTC is correct:
 * the anchor *is* a UTC-midnight calendar label, so UTC is the zone in which it
 * reads back as the day it stands for.
 */
export function formatDayKey(
  key: DayKey,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  if (!key) return '';
  const anchor = dayKeyToAnchor(key);
  if (Number.isNaN(anchor.getTime())) return '';
  return anchor.toLocaleDateString(undefined, { ...options, timeZone: UTC });
}

/**
 * Display label for a scheduled workout: "Today", "Tomorrow", "Yesterday", then
 * the date. Scheduling is the one place where "which day" matters more to the
 * user than "what time", so the relative wording carries the meaning.
 */
export function formatCivilDayRelative(
  key: DayKey,
  timeZone: string,
  now: Date | number = Date.now(),
): string {
  if (!key) return '';
  const diff = daysBetween(todayKey(timeZone, now), key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';

  const { year } = monthOf(key);
  const thisYear = monthOf(todayKey(timeZone, now)).year;
  return formatDayKey(key, {
    weekday: diff > 1 && diff < 7 ? 'long' : undefined,
    month: 'short',
    day: 'numeric',
    year: year === thisYear ? undefined : 'numeric',
  });
}
