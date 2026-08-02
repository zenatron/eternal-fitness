import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { resolveTimeZone, UTC } from '@/utils/datetime';
import type { Tx } from '@/lib/workout/completion';

/**
 * The timezone whose calendar a user's days are counted in.
 *
 * Every server-side "which day / which month was this?" question has to go
 * through here. Falls back to UTC, which is what the whole app used to assume
 * unconditionally, so a user who has not reported a zone yet is no worse off
 * than before.
 */
export async function getUserTimeZone(userId: string, tx?: Tx): Promise<string> {
  const client = tx ?? db;
  const [row] = await client
    .select({ timeZone: users.timeZone })
    .from(users)
    .where(eq(users.id, userId));

  return resolveTimeZone(row?.timeZone ?? UTC);
}
