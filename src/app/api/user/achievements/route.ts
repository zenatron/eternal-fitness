import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserAchievements, updateUserAchievements } from '@/lib/achievements';
import { createApiHandler } from '@/lib/api-utils';

export const GET = createApiHandler(async (userId) => {
  const achievementData = await getUserAchievements(userId);

  if (!achievementData) {
    throw new Error('Failed to fetch achievements');
  }

  return achievementData;
});

export const POST = createApiHandler(async (userId) => {
  const result = await updateUserAchievements(userId);

  return {
    message: 'Achievements updated successfully',
    newAchievements: result.newAchievements,
    totalAchievements: result.totalAchievements
  };
});
