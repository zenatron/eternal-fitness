/**
 * DB integration tests for the completion bookkeeping invariants.
 *
 * These need a real Postgres. Set TEST_DATABASE_URL to a throwaway database —
 * every test run truncates the user rows it creates:
 *   TEST_DATABASE_URL=postgresql://eternal:eternal@localhost:5433/eternal_fitness_test bun test src/tests/integration
 *
 * They skip (rather than fail) when the variable is unset, so `bun test` in a
 * checkout without a database keeps working.
 */
import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import postgres from 'postgres';
import { and, eq } from 'drizzle-orm';
import { db as appDb } from '@/lib/db';
import { users, userStats, monthlyStats, workoutSessions, workoutTemplates } from '@/lib/db/schema';
import {
  computeStreakFromHistory,
  getStreakBaseline,
  recordWorkoutCompletion,
  unwindWorkoutCompletion,
} from '@/lib/workout/completion';

const RUN = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!RUN)('completion bookkeeping (integration)', () => {

const sql = RUN ? postgres(process.env.TEST_DATABASE_URL!, { max: 1 }) : null;

const USER_A = 'it-test-user-a';
const USER_B = 'it-test-user-b';

async function insertUser(id: string) {
  await appDb.insert(users).values({ id, email: `${id}@example.com`, name: id }).onConflictDoNothing();
}

async function resetUser(id: string) {
  // monthlyStats and userStats are the user FKs without onDelete: cascade (a
  // known schema gap — see user_deletion.ts), so they have to go first. The
  // other child tables cascade with the user row.
  await appDb.delete(monthlyStats).where(eq(monthlyStats.userId, id));
  await appDb.delete(userStats).where(eq(userStats.userId, id));
  await appDb.delete(users).where(eq(users.id, id));
}

async function getStats(userId: string) {
  const [s] = await appDb.select().from(userStats).where(eq(userStats.userId, userId));
  return s;
}

const totals = (totalVolume: number, totalSets: number, totalExercises: number) => ({
  totalVolume, totalSets, totalExercises,
});

beforeAll(async () => {
  if (!RUN) return;
  await resetUser(USER_A);
  await resetUser(USER_B);
  await insertUser(USER_A);
  await insertUser(USER_B);
  // The app always has a stats row before completion bookkeeping runs (the
  // active-workout start and the completion upsert both create it).
  for (const id of [USER_A, USER_B]) {
    await appDb.insert(userStats).values({ userId: id }).onConflictDoNothing();
  }
});

afterAll(async () => {
  if (!RUN) return;
  await resetUser(USER_A);
  await resetUser(USER_B);
  await sql!.end();
});

test('record then unwind leaves totals exactly where they started', async () => {
  const timeZone = 'UTC';
  const at = new Date('2026-07-10T18:00:00Z');

  await appDb.transaction(async (tx) => {
    const streak = await computeStreakFromHistory(tx, USER_A, timeZone, await getStreakBaseline(tx, USER_A));
    await recordWorkoutCompletion(tx, {
      userId: USER_A, timeZone,
      totals: totals(1000, 10, 3),
      durationSeconds: 3600,
      completionTime: at, streak,
    });
  });

  const afterRecord = await getStats(USER_A);
  expect(afterRecord.totalWorkouts).toBeGreaterThanOrEqual(1);

  await appDb.transaction(async (tx) => {
    await unwindWorkoutCompletion(tx, {
      userId: USER_A, timeZone,
      totals: totals(1000, 10, 3),
      durationSeconds: 3600,
      completionTime: at,
    });
  });

  const afterUnwind = await getStats(USER_A);
  expect(afterUnwind.totalWorkouts).toBe(afterRecord.totalWorkouts - 1);
  expect(afterUnwind.totalVolume).toBe(afterRecord.totalVolume - 1000);
  expect(afterUnwind.totalSets).toBe(afterRecord.totalSets - 10);
  expect(afterUnwind.totalExercises).toBe(afterRecord.totalExercises - 3);

  // The monthly bucket the workout was filed in is unwound too.
  const [bucket] = await appDb
    .select()
    .from(monthlyStats)
    .where(eq(monthlyStats.userId, USER_A));
  expect(bucket?.workoutsCount ?? 0).toBe(0);
});

test('deleting a session row via template unwind recomputes the streak', async () => {
  const timeZone = 'UTC';

  // Today and the two days before it, in the user's calendar — recent enough
  // that the streak has not lapsed. dayKeyOf buckets by UTC here.
  const today = new Date();
  const dayKey = (offset: number) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const days = [dayKey(-2), dayKey(-1), dayKey(0)];

  // Three consecutive days of history, inserted directly.
  for (const day of days) {
    await appDb.insert(workoutSessions).values({
      userId: USER_B,
      completedAt: new Date(`${day}T17:00:00Z`),
      totalVolume: 100, totalSets: 5, totalExercises: 1,
      duration: 1800,
      performanceData: { performance: {}, metrics: {} } as never,
    });
  }

  const streakBefore = await appDb.transaction(async (tx) =>
    computeStreakFromHistory(tx, USER_B, timeZone, await getStreakBaseline(tx, USER_B))
  );
  expect(streakBefore.currentStreak).toBe(3);

  // Persist what completion would have written, so the longest-streak floor
  // has a recorded value — in the app the workouts were completed before any
  // deletion, and userStats.longestStreak already said 3.
  await appDb.update(userStats).set({
    currentStreak: streakBefore.currentStreak,
    longestStreak: streakBefore.longestStreak,
  }).where(eq(userStats.userId, USER_B));

  // Unwind the middle day and delete its row, mirroring what template deletion
  // now does, then recompute — the chain is broken, only today remains.
  await appDb.transaction(async (tx) => {
    await unwindWorkoutCompletion(tx, {
      userId: USER_B, timeZone,
      totals: totals(100, 5, 1),
      durationSeconds: 1800,
      completionTime: new Date(`${days[1]}T17:00:00Z`),
    });
    await tx.delete(workoutSessions).where(and(
      eq(workoutSessions.userId, USER_B),
      eq(workoutSessions.completedAt, new Date(`${days[1]}T17:00:00Z`)),
    ));
    const streak = await computeStreakFromHistory(tx, USER_B, timeZone, await getStreakBaseline(tx, USER_B));
    await tx.update(userStats).set({
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    }).where(eq(userStats.userId, USER_B));
  });

  const stats = await getStats(USER_B);
  expect(stats.currentStreak).toBe(1);
  // The two-day run still happened — the longest is floored at the recorded
  // value from when the workouts were completed.
  expect(stats.longestStreak).toBe(3);
});

test('template rows cascade cleanly for the template-delete path', async () => {
  const [tpl] = await appDb
    .insert(workoutTemplates)
    .values({
      userId: USER_A,
      name: 'IT Test Template',
      workoutData: { exercises: [] } as never,
    })
    .returning();

  await appDb.insert(workoutSessions).values({
    userId: USER_A,
    workoutTemplateId: tpl.id,
    completedAt: new Date('2026-09-01T17:00:00Z'),
    totalVolume: 500, totalSets: 8, totalExercises: 2,
    duration: 2400,
    performanceData: { performance: {}, metrics: {} } as never,
  });

  const before = await getStats(USER_A);

  // The same sequence DELETE /api/template/[templateId] now runs.
  await appDb.transaction(async (tx) => {
    const completed = await tx.select().from(workoutSessions).where(and(
      eq(workoutSessions.workoutTemplateId, tpl.id),
      eq(workoutSessions.userId, USER_A),
    ));
    for (const s of completed) {
      await unwindWorkoutCompletion(tx, {
        userId: USER_A, timeZone: 'UTC',
        totals: totals(s.totalVolume ?? 0, s.totalSets ?? 0, s.totalExercises ?? 0),
        durationSeconds: s.duration ?? 0,
        completionTime: s.completedAt!,
      });
    }
    await tx.delete(workoutSessions).where(eq(workoutSessions.workoutTemplateId, tpl.id));
    await tx.delete(workoutTemplates).where(eq(workoutTemplates.id, tpl.id));
  });

  const after = await getStats(USER_A);
  // A fresh user sits at zero, so the unwind clamps there rather than going
  // negative — the same GREATEST(0, …) guard session deletion uses.
  expect(after.totalWorkouts).toBe(Math.max(0, (before?.totalWorkouts ?? 0) - 1));
  expect(after.totalVolume).toBe(Math.max(0, (before?.totalVolume ?? 0) - 500));
  expect(after.totalSets).toBe(Math.max(0, (before?.totalSets ?? 0) - 8));
});
});
