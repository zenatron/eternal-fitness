import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserAchievements, updateUserAchievements } from '@/lib/achievements';

const errorResponse = (message: string, status = 400, details?: any) => {
  return NextResponse.json({ error: { message, details } }, { status });
};

const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ success: true, data }, { status });
};

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const achievementData = await getUserAchievements(userId);
    
    if (!achievementData) {
      return errorResponse('Failed to fetch achievements', 500);
    }

    return successResponse(achievementData);

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const result = await updateUserAchievements(userId);
    
    return successResponse({
      message: 'Achievements updated successfully',
      newAchievements: result.newAchievements,
      totalAchievements: result.totalAchievements
    });

  } catch (error) {
    console.error('Error updating achievements:', error);
    return errorResponse('Internal server error', 500);
  }
}
