import prisma from '@/lib/prisma';
import { createApiHandler } from '@/lib/api-utils';

// 🚀 GET function to fetch all JSON-based templates for the user
export const GET = createApiHandler(async (userId) => {
  const templates = await prisma.workoutTemplate.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      description: true,
      favorite: true,
      createdAt: true,
      updatedAt: true,
      workoutData: true, // JSON workout data
      totalVolume: true,
      estimatedDuration: true,
      exerciseCount: true,
      difficulty: true,
      workoutType: true,
      tags: true,
      userId: true,
    },
    orderBy: [{ favorite: 'desc' }, { name: 'asc' }],
  });

  console.log(`✅ Fetched ${templates.length} JSON-based templates for user ${userId}`);
  return templates;
});
