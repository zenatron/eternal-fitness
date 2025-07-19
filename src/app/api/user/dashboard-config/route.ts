import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { DashboardConfig, DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard-config';
import { createApiHandler, createValidatedApiHandler } from '@/lib/api-utils';
import { z } from 'zod';

export const GET = createApiHandler(async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dashboardConfig: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // If no config exists, return default
  const config = (user.dashboardConfig as unknown as DashboardConfig) || DEFAULT_DASHBOARD_CONFIG;

  return config;
});

const dashboardConfigSchema = z.object({
  tiles: z.array(z.object({
    id: z.string(),
    type: z.string(),
    enabled: z.boolean(),
    order: z.number(),
    size: z.string().optional(),
    settings: z.record(z.any()).optional(),
  })),
});

export const PUT = createValidatedApiHandler(
  dashboardConfigSchema,
  async (userId, config) => {
    // Update user's dashboard configuration
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        dashboardConfig: config as any,
      },
      select: { dashboardConfig: true },
    });

    return updatedUser.dashboardConfig;
  }
);
