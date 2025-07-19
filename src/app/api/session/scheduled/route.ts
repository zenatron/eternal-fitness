import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { createApiHandler } from '@/lib/api-utils';

// GET function to fetch ONLY scheduled sessions
export const GET = createApiHandler(async (userId) => {

    const scheduledSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        // Only sessions that are scheduled AND not yet completed
        scheduledAt: {
          not: null,
        },
        completedAt: null, // Explicitly check for null instead of undefined
      },
      orderBy: { scheduledAt: 'asc' }, // Sort by upcoming date
      select: {
        id: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
        performanceData: true, // Include JSON performance data
        workoutTemplateId: true, // Include the template ID
        workoutTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return scheduledSessions;
});
