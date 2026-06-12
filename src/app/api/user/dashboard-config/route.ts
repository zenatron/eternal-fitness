import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard-config';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const [user] = await db
      .select({ dashboardConfig: users.dashboardConfig })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return new NextResponse('User not found', { status: 404 });

    const config = (user.dashboardConfig as DashboardConfig) || DEFAULT_DASHBOARD_CONFIG;
    return NextResponse.json(config);
  } catch (error) {
    console.error('Dashboard config GET error:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const config: DashboardConfig = await request.json();

    if (!config.tiles || !Array.isArray(config.tiles)) {
      return new NextResponse('Invalid configuration format', { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ dashboardConfig: config })
      .where(eq(users.id, userId))
      .returning({ dashboardConfig: users.dashboardConfig });

    return NextResponse.json(updatedUser.dashboardConfig);
  } catch (error) {
    console.error('Dashboard config PUT error:', error);
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
