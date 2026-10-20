import { db } from '../src/lib/db';
import { userStats } from '../src/lib/db/schema';
import { rebuildPersonalRecords } from '../src/utils/personalRecords';

/**
 * One-off repair for `userStats.personalRecords`.
 *
 * Two defects left stored records wrong, and neither corrects itself because
 * records are a running maximum:
 *
 *  - Deleting or editing a session never touched records, so a deleted
 *    workout (or a typo fixed in the history editor — a 1,000 lb bench) kept
 *    its record forever, pointing at a session that no longer existed.
 *  - Records were dated when the workout was *saved*, so anything logged after
 *    the fact carried the logging date rather than the training date.
 *
 * Edits and deletes now rebuild records from history; this applies the same
 * rebuild to every existing user once. Safe to re-run: it derives the records
 * from the session rows and assigns them outright.
 *
 *   bun run db:rebuild-personal-records
 */
async function main() {
  const rows = await db.select({ userId: userStats.userId }).from(userStats);
  console.log(`Rebuilding personal records for ${rows.length} user(s)...`);

  for (const { userId } of rows) {
    const records = await db.transaction((tx) => rebuildPersonalRecords(tx, userId));
    console.log(`  ${userId}: ${Object.keys(records).length} exercise(s) with records`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
