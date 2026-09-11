import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userStats, monthlyStats, workoutSessions, workoutTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { errorResponse } from '@/lib/api/response';

/**
 * Full JSON export of the caller's own data. `Content-Disposition` makes the
 * browser download it; sessions are included in full (performanceData and all)
 * because the point is a lossless copy the user can re-import or archive.
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const [[user], stats, sessions, templates, monthly] = await Promise.all([
      db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        timeZone: users.timeZone,
        useMetric: users.useMetric,
        points: users.points,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.id, userId)),
      db.select().from(userStats).where(eq(userStats.userId, userId)),
      db.select().from(workoutSessions).where(eq(workoutSessions.userId, userId)),
      db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, userId)),
      db.select().from(monthlyStats).where(eq(monthlyStats.userId, userId)),
    ]);

    if (!user) return errorResponse('User not found', 404);

    const payload = {
      exportedAt: new Date().toISOString(),
      format: 'eternal-fitness-export/1',
      user,
      stats: stats[0] ?? null,
      sessions,
      templates,
      monthlyStats: monthly,
    };

    const body = JSON.stringify(payload, null, 2);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="eternal-fitness-export-${new Date().toISOString().slice(0, 10)}.json"`,
        // The export contains the user's entire training history.
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return errorResponse('Internal Server Error exporting data', 500);
  }
}
