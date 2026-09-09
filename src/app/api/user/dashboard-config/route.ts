import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard-config';

/**
 * Validated before anything is persisted. This used to be a raw `request.json()`
 * cast straight into the user's row, so any malformed payload — wrong types,
 * surprise extra fields, tens of megabytes of junk — landed in the jsonb column
 * verbatim and came back to every dashboard load.
 */
const dashboardConfigSchema = z.object({
  tiles: z
    .array(
      z.object({
        id: z.string().max(64),
        name: z.string().max(128),
        description: z.string().max(256),
        enabled: z.boolean(),
        order: z.number().int(),
        component: z.string().max(64),
      })
    )
    .max(32),
  // Optional with defaults: configs saved before these fields existed are still
  // valid input.
  layout: z.enum(['grid', 'list']).default('grid'),
  theme: z.enum(['default', 'compact']).default('default'),
});

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

    const body = await request.json();
    const validationResult = dashboardConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({ error: { message: 'Invalid configuration format', details: validationResult.error.errors } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const config: DashboardConfig = validationResult.data;

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
