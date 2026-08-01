/**
 * Relative and absolute timestamp formatting for session times.
 *
 * These used to be three near-identical local helpers: `formatTimeAgo` inside
 * the dashboard route, `formatDateTime` inside the profile RecentActivity card
 * and `formatFullDate` inside RecentActivityModal. Beyond the duplication, the
 * dashboard one had a real bug — it ran on the server and baked its result into
 * the JSON payload, which React Query then caches for five minutes and persists
 * to IndexedDB across reloads. A workout logged an hour ago kept reporting
 * "1m ago" because the *string* was an hour old, not the workout.
 *
 * Everything here is therefore pure and client-side: pass a timestamp, format at
 * render time. Pair with `useNow` when a value needs to age on screen.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Compact relative label: "Just now", "12m ago", "3h ago", "Yesterday",
 * "4d ago", then an absolute date once a week has passed.
 *
 * `now` is injectable so callers can drive it from a ticking clock and so the
 * tests do not depend on wall time.
 */
export function formatTimeAgo(
  dateInput?: Date | string | null,
  now: Date | number = Date.now(),
): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = (now instanceof Date ? now.getTime() : now) - date.getTime();

  // A timestamp in the future (clock skew, or a session dated forward) reads
  // better as "Just now" than as a negative age.
  if (diffMs < MINUTE) return 'Just now';
  if (diffMs < HOUR) return `${Math.floor(diffMs / MINUTE)}m ago`;
  if (diffMs < DAY) return `${Math.floor(diffMs / HOUR)}h ago`;

  const days = Math.floor(diffMs / DAY);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Calendar-relative label with a time: "Today at 6:32 PM", "Tuesday at 7:15 AM",
 * "Mar 4 at 6:00 PM". Day boundaries are local, not elapsed-hours, so a workout
 * finished at 11pm still says "Yesterday" at 1am rather than "2h ago".
 */
export function formatSessionDateTime(
  dateInput?: Date | string | null,
  now: Date | number = Date.now(),
): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  const nowDate = now instanceof Date ? now : new Date(now);

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(nowDate) - startOfDay(date)) / DAY);

  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  let label: string;
  if (diffDays === 0) label = 'Today';
  else if (diffDays === 1) label = 'Yesterday';
  else if (diffDays > 1 && diffDays <= 7) label = date.toLocaleDateString(undefined, { weekday: 'long' });
  else {
    label = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== nowDate.getFullYear() ? 'numeric' : undefined,
    });
  }

  return `${label} at ${time}`;
}

/** Full, unambiguous timestamp for detail rows: "Monday, March 4, 2026 at 6:00 PM". */
export function formatFullDateTime(dateInput?: Date | string | null): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
