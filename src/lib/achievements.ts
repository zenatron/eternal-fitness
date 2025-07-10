import { ACHIEVEMENT_DEFINITIONS, UserAchievements, AchievementCategory } from '@/types/achievements';
import prisma from '@/lib/prisma';

/**
 * Calculate current progress for all achievement categories based on user stats
 */
export function calculateAchievementProgress(userStats: any): Record<AchievementCategory, number> {
  const personalRecords = userStats.personalRecords || {};
  const prCount = Object.keys(personalRecords).reduce((count, exerciseName) => {
    const exercisePR = personalRecords[exerciseName];
    let exerciseCount = 0;
    if (exercisePR.maxWeight) exerciseCount++;
    if (exercisePR.maxVolume) exerciseCount++;
    return count + exerciseCount;
  }, 0);

  return {
    volume_lifted: userStats.totalVolume || 0,
    workouts_completed: userStats.totalWorkouts || 0,
    unique_exercises: userStats.uniqueExercises || 0,
    workout_hours: userStats.totalTrainingHours || 0,
    consistency_streak: userStats.longestStreak || 0,
    personal_records: prCount,
    heavy_lifter: 0, // TODO: Implement based on max single lift
    endurance: 0, // TODO: Implement based on longest workout
    dedication: userStats.activeWeeks || 0
  };
}

/**
 * Check which achievements should be unlocked based on current progress
 */
export function checkUnlockedAchievements(
  progress: Record<AchievementCategory, number>,
  currentAchievements: UserAchievements
): string[] {
  const newlyUnlocked: string[] = [];
  
  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    const isAlreadyUnlocked = currentAchievements.unlockedAchievements.includes(achievement.id);
    const currentProgress = progress[achievement.category] || 0;
    
    if (!isAlreadyUnlocked && currentProgress >= achievement.requirement) {
      newlyUnlocked.push(achievement.id);
    }
  }
  
  return newlyUnlocked;
}

/**
 * Update user achievements in the database
 */
export async function updateUserAchievements(userId: string): Promise<{
  newAchievements: string[];
  totalAchievements: number;
}> {
  try {
    // Get current user stats
    const userStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (!userStats) {
      throw new Error('User stats not found');
    }

    // Get current achievements or initialize
    const currentAchievements: UserAchievements = userStats.achievements as UserAchievements || {
      unlockedAchievements: [],
      progress: {},
      lastUpdated: new Date().toISOString()
    };

    // Calculate current progress
    const progress = calculateAchievementProgress(userStats);

    // Check for newly unlocked achievements
    const newlyUnlocked = checkUnlockedAchievements(progress, currentAchievements);

    // Update achievements if there are new ones
    if (newlyUnlocked.length > 0) {
      const updatedAchievements: UserAchievements = {
        unlockedAchievements: [...currentAchievements.unlockedAchievements, ...newlyUnlocked],
        progress,
        lastUpdated: new Date().toISOString()
      };

      await prisma.userStats.update({
        where: { userId },
        data: {
          achievements: updatedAchievements as any
        }
      });

      return {
        newAchievements: newlyUnlocked,
        totalAchievements: updatedAchievements.unlockedAchievements.length
      };
    }

    // Update progress even if no new achievements
    const updatedAchievements: UserAchievements = {
      ...currentAchievements,
      progress,
      lastUpdated: new Date().toISOString()
    };

    await prisma.userStats.update({
      where: { userId },
      data: {
        achievements: updatedAchievements as any
      }
    });

    return {
      newAchievements: [],
      totalAchievements: currentAchievements.unlockedAchievements.length
    };

  } catch (error) {
    console.error('Error updating user achievements:', error);
    return {
      newAchievements: [],
      totalAchievements: 0
    };
  }
}

/**
 * Get user's achievement data with progress information
 */
export async function getUserAchievements(userId: string) {
  try {
    // First try with achievements field
    let userStats;
    try {
      userStats = await prisma.userStats.findUnique({
        where: { userId },
        select: {
          achievements: true,
          totalVolume: true,
          totalWorkouts: true,
          uniqueExercises: true,
          totalTrainingHours: true,
          longestStreak: true,
          personalRecords: true,
          activeWeeks: true
        }
      });
    } catch (prismaError: any) {
      // If achievements field doesn't exist, try without it and create default
      console.log('Achievements field not available, creating default...');
      userStats = await prisma.userStats.findUnique({
        where: { userId },
        select: {
          totalVolume: true,
          totalWorkouts: true,
          totalTrainingHours: true,
          longestStreak: true,
          personalRecords: true,
          activeWeeks: true
        }
      });

      if (userStats) {
        // Add default values for missing fields
        (userStats as any).achievements = null;
        (userStats as any).uniqueExercises = 0;
      }
    }

    if (!userStats) {
      return null;
    }

    const achievements: UserAchievements = userStats.achievements as UserAchievements || {
      unlockedAchievements: [],
      progress: {},
      lastUpdated: new Date().toISOString()
    };

    const currentProgress = calculateAchievementProgress(userStats);

    // Get achievement details with progress
    const achievementDetails = ACHIEVEMENT_DEFINITIONS.map(achievement => {
      const isUnlocked = achievements.unlockedAchievements.includes(achievement.id);
      const progress = currentProgress[achievement.category] || 0;
      const progressPercentage = Math.min(100, (progress / achievement.requirement) * 100);

      return {
        ...achievement,
        isUnlocked,
        progress,
        progressPercentage,
        unlockedAt: isUnlocked ? achievements.lastUpdated : undefined
      };
    });

    // Group by category
    const achievementsByCategory = achievementDetails.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {} as Record<AchievementCategory, typeof achievementDetails>);

    return {
      achievements: achievementsByCategory,
      unlockedCount: achievements.unlockedAchievements.length,
      totalCount: ACHIEVEMENT_DEFINITIONS.length,
      currentProgress
    };

  } catch (error) {
    console.error('Error getting user achievements:', error);
    return null;
  }
}

/**
 * Update unique exercises count when a workout is completed
 */
export async function updateUniqueExercisesCount(userId: string, exerciseKeys: string[]) {
  try {
    // Get all completed sessions to calculate unique exercises
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        completedAt: { not: null },
        performanceData: { not: null }
      },
      select: {
        performanceData: true
      }
    });

    const uniqueExercises = new Set<string>();

    // Extract all unique exercise keys from all sessions
    sessions.forEach(session => {
      if (session.performanceData && typeof session.performanceData === 'object') {
        const data = session.performanceData as any;
        if (data.performance) {
          Object.values(data.performance).forEach((exercisePerf: any) => {
            if (exercisePerf.exerciseKey) {
              uniqueExercises.add(exercisePerf.exerciseKey);
            }
          });
        }
      }
    });

    // Update the count in UserStats
    await prisma.userStats.update({
      where: { userId },
      data: {
        uniqueExercises: uniqueExercises.size
      }
    });

    return uniqueExercises.size;

  } catch (error) {
    console.error('Error updating unique exercises count:', error);
    return 0;
  }
}
