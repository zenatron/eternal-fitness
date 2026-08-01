import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { users } from '@/lib/db/schema';

/** Flat award for finishing a workout at all. */
export const XP_PER_WORKOUT = 100;
/** Additional award per personal record set during it. */
export const XP_PER_PR = 50;

/**
 * XP for one completed workout.
 *
 * Split out from the database write below so it can be tested directly — this
 * feeds the level shown on the profile, and an error here is not self-correcting:
 * points accumulate, so a wrong award stays wrong until someone runs a repair
 * script over the whole table.
 */
export function calculateWorkoutXP(options: { newPRs: number }): number {
  // Guards against a negative or non-finite PR count reaching the SQL update and
  // silently *removing* points.
  const prs = Number.isFinite(options.newPRs) ? Math.max(0, Math.floor(options.newPRs)) : 0;
  return XP_PER_WORKOUT + prs * XP_PER_PR;
}

export async function awardWorkoutXP(
  userId: string,
  options: { newPRs: number },
): Promise<number> {
  const xp = calculateWorkoutXP(options);

  if (xp > 0) {
    await db
      .update(users)
      .set({ points: sql`${users.points} + ${xp}` })
      .where(sql`${users.id} = ${userId}`);
  }

  return xp;
}
