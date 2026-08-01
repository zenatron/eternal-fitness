import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { userStats } from '../src/lib/db/schema';

/**
 * One-off repair for `userStats.totalSets` / `totalExercises`.
 *
 * /api/session/log computed both values and wrote them onto the session row, but
 * never added them to the lifetime totals — only /api/session/active/complete
 * did. So for anyone who used "Log Past Workout", the "Total Sets" figure on the
 * profile was short by every retroactively logged session. Both routes now share
 * one writer (src/lib/workout/completion.ts) so they cannot diverge again, but
 * the totals already in the database are still wrong.
 *
 * Rebuilt from `workoutSessions` rather than zeroed, because unlike the
 * training-hours bug these are recoverable: every completed session row carries
 * its own `total_sets` and `total_exercises`, so the correct lifetime figure is
 * just their sum. Rows for users with no completed sessions settle at zero,
 * which is also correct.
 *
 * Note this reads the *stored* per-session values, which for sessions written
 * before this change mean "sets attempted" on the live-workout path and "sets
 * completed" on the logging path. The two are identical unless sets were
 * skipped, and re-deriving skipped counts from the performance JSONB is not
 * worth the complexity for a difference that small.
 *
 * Safe to re-run: it assigns absolute sums rather than incrementing.
 */
async function main() {
  const pg = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(pg);

  console.log('Rebuilding userStats.totalSets / totalExercises from session history...\n');

  const before = await db
    .select({
      userId: userStats.userId,
      totalSets: userStats.totalSets,
      totalExercises: userStats.totalExercises,
    })
    .from(userStats);

  await db.execute(sql`
    UPDATE user_stats AS us
    SET total_sets = COALESCE(agg.sets, 0),
        total_exercises = COALESCE(agg.exercises, 0)
    FROM (
      SELECT u.id AS user_id,
             SUM(ws.total_sets)      AS sets,
             SUM(ws.total_exercises) AS exercises
        FROM users u
        LEFT JOIN workout_sessions ws
               ON ws.user_id = u.id
              AND ws.completed_at IS NOT NULL
       GROUP BY u.id
    ) AS agg
    WHERE us.user_id = agg.user_id
  `);

  const after = await db
    .select({
      userId: userStats.userId,
      totalSets: userStats.totalSets,
      totalExercises: userStats.totalExercises,
    })
    .from(userStats);

  const afterById = new Map(after.map((r) => [r.userId, r]));
  let changed = 0;

  for (const prev of before) {
    const next = afterById.get(prev.userId);
    if (!next) continue;
    if (next.totalSets !== prev.totalSets || next.totalExercises !== prev.totalExercises) {
      changed++;
      console.log(
        `  ${prev.userId}: sets ${prev.totalSets} -> ${next.totalSets}, ` +
          `exercises ${prev.totalExercises} -> ${next.totalExercises}`
      );
    }
  }

  await pg.end();

  console.log(
    `\nDone. ${changed} of ${before.length} user stat row(s) corrected.`
  );
}

main().catch((err) => {
  console.error('Set-total rebuild failed:', err);
  process.exit(1);
});
