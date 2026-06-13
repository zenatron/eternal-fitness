import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { users } from '@/lib/db/schema';

export async function awardWorkoutXP(
  userId: string,
  options: { newPRs: number },
): Promise<number> {
  let xp = 100; // base workout completion
  xp += options.newPRs * 50;

  if (xp > 0) {
    await db
      .update(users)
      .set({ points: sql`${users.points} + ${xp}` })
      .where(sql`${users.id} = ${userId}`);
  }

  return xp;
}
