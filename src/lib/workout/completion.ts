import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { monthlyStats, userStats, workoutSessions } from '@/lib/db/schema';
import { dayKeyOf, daysBetween, monthOf, todayKey } from '@/utils/datetime';

/**
 * The bookkeeping that happens when a workout is finished.
 *
 * There are two ways to finish one — completing a live session
 * (`/api/session/active/complete`) and logging one after the fact
 * (`/api/session/log`) — and both used to carry their own copy of this: streak
 * calculation, the `userStats` write, the `monthlyStats` upsert. Around 150
 * lines each, written months apart.
 *
 * They had already drifted. The live path incremented `userStats.totalSets` and
 * `totalExercises`; the logging path computed both values, wrote them onto the
 * session row, and then never added them to the lifetime totals. Every
 * retroactively logged workout was therefore invisible to the "Total Sets"
 * figure on the profile. That is the failure mode this module exists to prevent:
 * one writer, so a column cannot be updated on one path and forgotten on the
 * other.
 *
 * The routes still differ where they genuinely differ — the live path clears the
 * active-workout fields and is idempotency-keyed, the logging path builds its
 * performance data from a template. What they share is below.
 */

/** The drizzle transaction handle, as handed to `db.transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface WorkoutTotals {
  totalVolume: number;
  /**
   * Sets actually performed, excluding skipped ones.
   *
   * The two paths disagreed here too: the live path added every set in the
   * session including those explicitly marked skipped, while the logging path
   * recorded only completed ones. Completed is the honest reading — a skipped
   * set is work the user declined to do — and it is what both screens already
   * show in their own summaries, so this makes the stored number match what the
   * user was told they did.
   */
  totalSets: number;
  totalExercises: number;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutAt: Date;
}

/**
 * A streak is counted in the *user's* calendar days.
 *
 * This used to call `setHours(0,0,0,0)`, which snaps to midnight in whatever
 * zone the process runs in. In production that process is a container with no
 * `TZ` set, so it was UTC — and a workout finished at 8pm in New York was
 * bucketed as the *following* day. Two workouts on consecutive evenings could
 * therefore land on the same UTC day and count once, or an evening workout
 * could appear to happen a day ahead of the user's own calendar and break the
 * chain. Neither is visible in development, where the process zone happens to
 * be the developer's.
 */

/**
 * Recomputes both streaks from the user's full session history.
 *
 * Must be called *after* the new session row is inserted, so the workout being
 * recorded is included.
 *
 * The live-completion path used to do this incrementally — compare
 * `lastWorkoutAt` to today, add one if they are a day apart. That is cheaper but
 * wrong as soon as sessions can be inserted into the past: logging Tuesday's
 * missed workout should bridge Monday and Wednesday into a three-day streak, and
 * the incremental version cannot see that because it only ever looks at the most
 * recent workout. Recomputing is O(sessions) but runs once per completed
 * workout, against an indexed column, and is the only version that is correct
 * for both entry points.
 */
export async function computeStreakFromHistory(
  tx: Tx,
  userId: string,
  timeZone: string,
  existingLongestStreak = 0
): Promise<StreakResult> {
  const sessions = await tx
    .select({ completedAt: workoutSessions.completedAt })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)))
    .orderBy(desc(workoutSessions.completedAt));

  return computeStreakFromDates(
    sessions.map((s) => s.completedAt!),
    timeZone,
    existingLongestStreak
  );
}

/**
 * The streak rules themselves, separated from the query so they can be tested
 * against a list of dates rather than a database.
 *
 * `completionDates` need not be sorted. `now` is injectable so the "has this
 * streak lapsed?" check does not depend on wall time.
 */
export function computeStreakFromDates(
  completionDates: Date[],
  timeZone: string,
  existingLongestStreak = 0,
  now: Date = new Date()
): StreakResult {
  if (completionDates.length === 0) {
    return { currentStreak: 0, longestStreak: existingLongestStreak, lastWorkoutAt: now };
  }

  const sorted = [...completionDates].sort((a, b) => b.getTime() - a.getTime());

  // Several workouts in one day are one day of the streak. Descending, so
  // uniqueDays[0] is the most recent.
  const uniqueDays = Array.from(new Set(sorted.map((d) => dayKeyOf(d, timeZone)))).sort((a, b) =>
    b.localeCompare(a)
  );

  // Walk back from the most recent day for as long as the days are consecutive.
  let currentStreak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    if (daysBetween(uniqueDays[i], uniqueDays[i - 1]) !== 1) break;
    currentStreak++;
  }

  // A streak whose most recent day is older than yesterday has already lapsed —
  // today has not been missed yet, so yesterday still counts.
  if (daysBetween(uniqueDays[0], todayKey(timeZone, now)) > 1) currentStreak = 0;

  // Longest run anywhere in the history, floored at whatever was already
  // recorded so a pruned history cannot lower it.
  let longestRun = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    if (daysBetween(uniqueDays[i], uniqueDays[i - 1]) === 1) {
      run++;
      longestRun = Math.max(longestRun, run);
    } else {
      run = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestRun, existingLongestStreak),
    lastWorkoutAt: sorted[0],
  };
}

/** Reads the streak fields the recompute needs as a baseline. */
export async function getStreakBaseline(tx: Tx, userId: string): Promise<number> {
  const [stats] = await tx
    .select({ longestStreak: userStats.longestStreak })
    .from(userStats)
    .where(eq(userStats.userId, userId));

  return stats?.longestStreak ?? 0;
}

interface RecordCompletionArgs {
  userId: string;
  totals: WorkoutTotals;
  /** Seconds. Converted to the fractional hours `userStats` stores. */
  durationSeconds: number;
  /** When the workout finished — which month it lands in, not today's month. */
  completionTime: Date;
  /** The user's IANA zone, deciding which calendar month `completionTime` falls in. */
  timeZone: string;
  streak: StreakResult;
  /**
   * Set by the live path, which must release the in-progress workout in the same
   * transaction that records it. The logging path has no active session.
   */
  clearActiveWorkout?: boolean;
}

/**
 * Adds one finished workout to the user's lifetime and monthly totals.
 *
 * An upsert rather than an update: the logging path can be the very first thing
 * a user does, before any `userStats` row exists. The live path always has one
 * (it is where the active workout was stored), so the insert branch is simply
 * never taken there.
 */
export async function recordWorkoutCompletion(
  tx: Tx,
  { userId, totals, durationSeconds, completionTime, timeZone, streak, clearActiveWorkout }: RecordCompletionArgs
): Promise<void> {
  const trainingHours = durationSeconds > 0 ? durationSeconds / 3600 : 0;

  const activeWorkoutReset = clearActiveWorkout
    ? { activeWorkoutId: null, activeWorkoutData: null, activeWorkoutStartedAt: null }
    : {};

  await tx
    .insert(userStats)
    .values({
      userId,
      totalWorkouts: 1,
      totalVolume: totals.totalVolume,
      totalSets: totals.totalSets,
      totalExercises: totals.totalExercises,
      totalTrainingHours: trainingHours,
      lastWorkoutAt: streak.lastWorkoutAt,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        ...activeWorkoutReset,
        totalWorkouts: sql`${userStats.totalWorkouts} + 1`,
        totalVolume: sql`${userStats.totalVolume} + ${totals.totalVolume}`,
        totalSets: sql`${userStats.totalSets} + ${totals.totalSets}`,
        totalExercises: sql`${userStats.totalExercises} + ${totals.totalExercises}`,
        totalTrainingHours: sql`${userStats.totalTrainingHours} + ${trainingHours}`,
        lastWorkoutAt: streak.lastWorkoutAt,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      },
    });

  /*
   * `getFullYear()/getMonth()` read the process zone, which is UTC in the
   * production container. A workout finished at 8pm on January 31st in New York
   * is already February 1st in UTC, so it was credited to the wrong month — and
   * every month boundary shifted the same way for anyone west of Greenwich.
   */
  const { year, month } = monthOf(dayKeyOf(completionTime, timeZone));

  await tx
    .insert(monthlyStats)
    .values({
      userId,
      year,
      month,
      workoutsCount: 1,
      volume: totals.totalVolume,
      trainingHours,
    })
    .onConflictDoUpdate({
      target: [monthlyStats.userId, monthlyStats.year, monthlyStats.month],
      set: {
        workoutsCount: sql`${monthlyStats.workoutsCount} + 1`,
        volume: sql`${monthlyStats.volume} + ${totals.totalVolume}`,
        trainingHours: sql`${monthlyStats.trainingHours} + ${trainingHours}`,
      },
    });
}
