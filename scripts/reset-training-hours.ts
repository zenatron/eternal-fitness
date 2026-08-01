import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { userStats, monthlyStats } from '../src/lib/db/schema';

/**
 * One-off repair for the training-hours units bug.
 *
 * workoutSessions.duration is stored in SECONDS, but the active-completion and
 * session-json writers were treating it as minutes (or skipping the rollups
 * entirely), so userStats.totalTrainingHours and monthlyStats.trainingHours
 * drifted away from reality in inconsistent directions per user.
 *
 * Per the fix decision, we Wipe & start clean: zero both hours columns so
 * future workouts (written by the corrected code) rebuild them accurately.
 * workoutsCount and volume are left untouched — those were written correctly by
 * the other paths and are not affected by the units bug.
 */
async function main() {
  const pg = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(pg);

  console.log('Resetting training hours (wipe & start clean)...');
  console.log('  - userStats.totalTrainingHours  -> 0');
  console.log('  - monthlyStats.trainingHours     -> 0 (workoutsCount & volume untouched)\n');

  const updatedUserRows = await db
    .update(userStats)
    .set({ totalTrainingHours: 0 })
    .returning({ userId: userStats.userId });

  const usersTouched = updatedUserRows.length;

  await db.update(monthlyStats).set({ trainingHours: 0 });

  await pg.end();

  console.log(`Done. Reset totalTrainingHours for ${usersTouched} user stat row(s); zeroed all monthly training hours.`);
  console.log('Future workouts will rebuild these values correctly via the fixed completion routes.');
}

main().catch((err) => {
  console.error('Training-hours reset failed:', err);
  process.exit(1);
});
