import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { users, userStats } from '../src/lib/db/schema';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);

  console.log('Fixing inflated achievement points...');

  const allUsers = await db
    .select({
      id: users.id,
      achievements: userStats.achievements,
      totalWorkouts: userStats.totalWorkouts,
    })
    .from(users)
    .leftJoin(userStats, eq(users.id, userStats.userId));

  for (const user of allUsers) {
    let correctPoints = 0;

    const achievementsData = user.achievements as any;
    if (achievementsData?.unlockedAchievements) {
      for (const id of achievementsData.unlockedAchievements) {
        if (id.endsWith('bronze')) correctPoints += 500;
        else if (id.endsWith('silver')) correctPoints += 1000;
        else if (id.endsWith('gold')) correctPoints += 2500;
        else if (id.endsWith('platinum')) correctPoints += 5000;
        else if (id.endsWith('diamond')) correctPoints += 10000;
      }
    }

    if (user.totalWorkouts) {
      correctPoints += user.totalWorkouts * 100;
    }

    const oldPoints = (await db.select({ points: users.points }).from(users).where(eq(users.id, user.id)))?.[0]?.points ?? 0;

    await db
      .update(users)
      .set({ points: correctPoints })
      .where(eq(users.id, user.id));

    console.log(`User ${user.id}: ${oldPoints} → ${correctPoints} (${correctPoints - oldPoints >= 0 ? '+' : ''}${correctPoints - oldPoints})`);
  }

  await sql.end();
  console.log('Point fix complete!');
}

main().catch((err) => {
  console.error('Point fix failed:', err);
  process.exit(1);
});
