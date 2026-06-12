import { ACHIEVEMENT_DEFINITIONS, UserAchievements, AchievementCategory } from '@/types/achievements';
import { db } from '@/lib/db';
import { userStats, workoutSessions } from '@/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateAchievementProgress(stats: Record<string, any>): Record<AchievementCategory, number> {
  const personalRecords = stats.personalRecords || {};
  const prCount = Object.keys(personalRecords).reduce((count, exerciseName) => {
    const exercisePR = personalRecords[exerciseName];
    let exerciseCount = 0;
    if (exercisePR.maxWeight) exerciseCount++;
    if (exercisePR.maxVolume) exerciseCount++;
    return count + exerciseCount;
  }, 0);

  return {
    volume_lifted: stats.totalVolume || 0,
    workouts_completed: stats.totalWorkouts || 0,
    unique_exercises: stats.uniqueExercises || 0,
    workout_hours: stats.totalTrainingHours || 0,
    consistency_streak: stats.longestStreak || 0,
    personal_records: prCount,
    heavy_lifter: 0,
    endurance: 0,
    dedication: stats.activeWeeks || 0,
  };
}

export function checkUnlockedAchievements(
  progress: Record<AchievementCategory, number>,
  currentAchievements: UserAchievements,
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

export async function updateUserAchievements(userId: string): Promise<{
  newAchievements: string[];
  totalAchievements: number;
}> {
  try {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));

    if (!stats) throw new Error('User stats not found');

    const currentAchievements: UserAchievements = (stats.achievements as UserAchievements) || {
      unlockedAchievements: [],
      progress: {},
      lastUpdated: new Date().toISOString(),
    };

    const progress = calculateAchievementProgress(stats);
    const newlyUnlocked = checkUnlockedAchievements(progress, currentAchievements);

    const updatedAchievements: UserAchievements = {
      unlockedAchievements: newlyUnlocked.length > 0
        ? [...currentAchievements.unlockedAchievements, ...newlyUnlocked]
        : currentAchievements.unlockedAchievements,
      progress,
      lastUpdated: new Date().toISOString(),
    };

    await db
      .update(userStats)
      .set({ achievements: updatedAchievements })
      .where(eq(userStats.userId, userId));

    return {
      newAchievements: newlyUnlocked,
      totalAchievements: updatedAchievements.unlockedAchievements.length,
    };
  } catch (error) {
    console.error('Error updating user achievements:', error);
    return { newAchievements: [], totalAchievements: 0 };
  }
}

export async function getUserAchievements(userId: string) {
  try {
    const [stats] = await db
      .select({
        achievements: userStats.achievements,
        totalVolume: userStats.totalVolume,
        totalWorkouts: userStats.totalWorkouts,
        uniqueExercises: userStats.uniqueExercises,
        totalTrainingHours: userStats.totalTrainingHours,
        longestStreak: userStats.longestStreak,
        personalRecords: userStats.personalRecords,
        activeWeeks: userStats.activeWeeks,
      })
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (!stats) return null;

    const achievements: UserAchievements = (stats.achievements as UserAchievements) || {
      unlockedAchievements: [],
      progress: {},
      lastUpdated: new Date().toISOString(),
    };

    const currentProgress = calculateAchievementProgress(stats);

    const achievementDetails = ACHIEVEMENT_DEFINITIONS.map(achievement => {
      const isUnlocked = achievements.unlockedAchievements.includes(achievement.id);
      const progress = currentProgress[achievement.category] || 0;
      const progressPercentage = Math.min(100, (progress / achievement.requirement) * 100);

      return {
        ...achievement,
        isUnlocked,
        progress,
        progressPercentage,
        unlockedAt: isUnlocked ? achievements.lastUpdated : undefined,
      };
    });

    const achievementsByCategory = achievementDetails.reduce((acc, achievement) => {
      if (!acc[achievement.category]) acc[achievement.category] = [];
      acc[achievement.category].push(achievement);
      return acc;
    }, {} as Record<AchievementCategory, typeof achievementDetails>);

    return {
      achievements: achievementsByCategory,
      unlockedCount: achievements.unlockedAchievements.length,
      totalCount: ACHIEVEMENT_DEFINITIONS.length,
      currentProgress,
    };
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return null;
  }
}

export async function updateUniqueExercisesCount(userId: string, _exerciseKeys?: string[]) {
  try {
    const sessions = await db
      .select({ performanceData: workoutSessions.performanceData })
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        isNotNull(workoutSessions.completedAt),
        isNotNull(workoutSessions.performanceData),
      ));

    const uniqueExercises = new Set<string>();
    sessions.forEach(session => {
      const performance = session.performanceData?.performance;
      if (performance) {
        Object.values(performance).forEach(exercisePerf => {
          if (exercisePerf.exerciseKey) uniqueExercises.add(exercisePerf.exerciseKey);
        });
      }
    });

    await db
      .update(userStats)
      .set({ uniqueExercises: uniqueExercises.size })
      .where(eq(userStats.userId, userId));

    return uniqueExercises.size;
  } catch (error) {
    console.error('Error updating unique exercises count:', error);
    return 0;
  }
}
