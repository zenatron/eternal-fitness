import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard-config';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dashboardConfig: true },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // If no config exists, return default
    const config = user.dashboardConfig as DashboardConfig || DEFAULT_DASHBOARD_CONFIG;

    return NextResponse.json(config);
  } catch (error) {
    console.error('Dashboard config GET error:', error);
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const config: DashboardConfig = await request.json();

    // Validate the config structure
    if (!config.tiles || !Array.isArray(config.tiles)) {
      return new NextResponse('Invalid configuration format', { status: 400 });
    }

    // Update user's dashboard configuration
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        dashboardConfig: config,
      },
      select: { dashboardConfig: true },
    });

    return NextResponse.json(updatedUser.dashboardConfig);
  } catch (error) {
    console.error('Dashboard config PUT error:', error);
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
