import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, isNotNull } from 'drizzle-orm';
import { userStats, workoutSessions, users } from '../src/lib/db/schema';
import { bestOneRepMax } from '../src/utils/oneRepMax';
import type { UserPersonalRecords } from '../src/types/personalRecords';
import type { WorkoutSessionData, PerformedSet } from '../src/types/workout';

/**
 * Backfills the maxOneRepMax personal record from existing session history.
 *
 * The record type was added after these sessions were logged, so without this
 * every existing user would show no estimated-1RM record until they next train
 * — despite the app having every set needed to compute it. The exercise history
 * page derives e1RM from raw sessions and so was already correct; this is only
 * about the stored record.
 *
 * Safe to re-run. It only ever raises a record, never lowers or removes one, and
 * it leaves every other record type untouched.
 *
 *   bun run scripts/backfill-e1rm.ts          # report only
 *   bun run scripts/backfill-e1rm.ts --write  # apply
 */

const WRITE = process.argv.includes('--write');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  console.log(WRITE ? 'Backfilling estimated 1RM records...' : 'Dry run — pass --write to apply.\n');

  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
  let totalAdded = 0;

  for (const user of allUsers) {
    const sessions = await db
      .select({
        id: workoutSessions.id,
        completedAt: workoutSessions.completedAt,
        performanceData: workoutSessions.performanceData,
      })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, user.id), isNotNull(workoutSessions.completedAt)));

    if (sessions.length === 0) continue;

    const [stats] = await db
      .select({ personalRecords: userStats.personalRecords })
      .from(userStats)
      .where(eq(userStats.userId, user.id));

    const records: UserPersonalRecords = (stats?.personalRecords as UserPersonalRecords) ?? {};
    const added: string[] = [];

    for (const session of sessions) {
      const data = session.performanceData as WorkoutSessionData | null;
      if (!data?.performance) continue;

      for (const entry of Object.values(data.performance)) {
        // PRs are keyed by display name, matching the live write path.
        // Annotated explicitly: templateSnapshot's element type is recursive, so
        // inference here goes circular (TS7022).
        const fromTemplate: { exerciseKey?: string; name?: string } | undefined =
          data.templateSnapshot?.exercises?.find(
            (ex: { exerciseKey?: string; name?: string }) => ex.exerciseKey === entry.exerciseKey
          );
        const name = fromTemplate?.name || entry.exerciseKey;
        if (!name) continue;

        const done = (entry.sets ?? []).filter(
          (s: PerformedSet) => s.completed && !s.skipped
        );
        const best = bestOneRepMax(done);
        if (!best) continue;

        const existing = records[name]?.maxOneRepMax;
        if (existing && existing.value >= best.oneRepMax) continue;

        records[name] = {
          ...(records[name] ?? {}),
          maxOneRepMax: {
            value: best.oneRepMax,
            weight: best.weight,
            reps: best.reps,
            // The date the set was actually performed, not today — the record
            // list sorts by this and would otherwise claim every historic PR
            // was set during the backfill.
            achievedAt: (session.completedAt ?? new Date()).toISOString(),
            sessionId: session.id,
          },
        };
        added.push(`${name}: ${Math.round(best.oneRepMax * 10) / 10} (${best.weight}x${best.reps})`);
      }
    }

    if (added.length === 0) continue;

    console.log(`\n${user.email} — ${added.length} record(s)`);
    for (const line of added.slice(0, 10)) console.log(`  ${line}`);
    if (added.length > 10) console.log(`  ... and ${added.length - 10} more`);
    totalAdded += added.length;

    if (WRITE) {
      await db
        .insert(userStats)
        .values({ userId: user.id, personalRecords: records })
        .onConflictDoUpdate({
          target: userStats.userId,
          set: { personalRecords: records },
        });
    }
  }

  console.log(
    `\n${WRITE ? 'Wrote' : 'Would write'} ${totalAdded} estimated-1RM record(s) across ${allUsers.length} user(s).`
  );

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
