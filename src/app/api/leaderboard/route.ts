import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userStats } from '@/lib/db/schema';
import { eq, desc, isNotNull } from 'drizzle-orm';
import { getLevel } from '@/utils/levels';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        points: users.points,
        totalWorkouts: userStats.totalWorkouts,
      })
      .from(users)
      .leftJoin(userStats, eq(users.id, userStats.userId))
      .where(isNotNull(userStats.totalWorkouts))
      .orderBy(desc(users.points))
      .limit(50);

    const leaderboard = allUsers.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      name: u.name || 'Anonymous',
      points: u.points || 0,
      level: getLevel(u.points || 0),
      totalWorkouts: u.totalWorkouts || 0,
      isCurrentUser: u.id === userId,
    }));

    const currentUser = leaderboard.find(u => u.isCurrentUser);
    const currentUserRank = currentUser?.rank ?? null;

    return NextResponse.json({ leaderboard, currentUserRank });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
