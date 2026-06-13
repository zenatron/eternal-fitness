import { ACHIEVEMENT_DEFINITIONS, UserAchievements, AchievementCategory, localizeAchievement, TIER_POINTS } from '@/types/achievements';
import { db } from '@/lib/db';
import { userStats, workoutSessions, users, monthlyStats, workoutTemplates } from '@/lib/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { WorkoutSessionData } from '@/types/workout';

/**
 * Calculate progress for time-of-day achievements (early bird / night owl)
 * and template mastery / monthly warrior from workout session data.
 */
async function calculateSessionBasedProgress(userId: string): Promise<{
  earlyBirdCount: number;
  nightOwlCount: number;
  maxTemplateSessions: number;
  bestMonthWorkouts: number;
  totalDistance: number;
  cardioSessionsCount: number;
  cardioDurationHours: number;
}> {
  // Early bird: completed before 8 AM, Night owl: completed after 10 PM
  const sessions = await db
    .select({
      completedAt: workoutSessions.completedAt,
      workoutTemplateId: workoutSessions.workoutTemplateId,
      performanceData: workoutSessions.performanceData,
      templateWorkoutType: workoutTemplates.workoutType,
    })
    .from(workoutSessions)
    .leftJoin(workoutTemplates, eq(workoutSessions.workoutTemplateId, workoutTemplates.id))
    .where(and(
      eq(workoutSessions.userId, userId),
      isNotNull(workoutSessions.completedAt),
    ));

  let earlyBirdCount = 0;
  let nightOwlCount = 0;
  const templateCounts: Record<string, number> = {};
  let totalDistance = 0;
  let cardioSessionsCount = 0;
  let cardioDurationSeconds = 0;

  for (const session of sessions) {
    if (session.completedAt) {
      const hour = session.completedAt.getHours();
      if (hour < 8) earlyBirdCount++;
      if (hour >= 22) nightOwlCount++;
    }
    if (session.workoutTemplateId) {
      templateCounts[session.workoutTemplateId] = (templateCounts[session.workoutTemplateId] || 0) + 1;
    }

    // Check if this is a cardio or hybrid session
    const workoutType = session.templateWorkoutType ||
      (session.performanceData as WorkoutSessionData)?.templateSnapshot?.metadata?.workoutType;
    const isCardio = workoutType === 'cardio' || workoutType === 'hybrid';

    if (isCardio) {
      cardioSessionsCount++;
    }

    // Sum distance and cardio duration from performance data
    const perfData = session.performanceData as WorkoutSessionData | null;
    if (perfData?.performance) {
      for (const exercisePerf of Object.values(perfData.performance)) {
        if (exercisePerf.sets) {
          for (const set of exercisePerf.sets) {
            if (set.completed) {
              // Sum actual distance, falling back to target distance from template
              if (set.actualDistance) {
                totalDistance += set.actualDistance;
              }
              // Sum cardio duration (actual or target) for cardio/hybrid sessions
              if (isCardio) {
                if (set.actualDuration) {
                  cardioDurationSeconds += set.actualDuration;
                }
              }
            }
          }
        }
      }
    }
  }

  const maxTemplateSessions = Object.values(templateCounts).reduce((max, c) => Math.max(max, c), 0);

  // Best month: query monthly_stats for highest workoutsCount
  const [bestMonth] = await db
    .select({ maxCount: sql<number>`COALESCE(MAX(${monthlyStats.workoutsCount}), 0)` })
    .from(monthlyStats)
    .where(eq(monthlyStats.userId, userId));

  const bestMonthWorkouts = bestMonth?.maxCount ?? 0;

  const cardioDurationHours = cardioDurationSeconds / 3600;

  return { earlyBirdCount, nightOwlCount, maxTemplateSessions, bestMonthWorkouts, totalDistance, cardioSessionsCount, cardioDurationHours };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateAchievementProgress(
  stats: Record<string, any>,
  sessionProgress?: { earlyBirdCount: number; nightOwlCount: number; maxTemplateSessions: number; bestMonthWorkouts: number; totalDistance: number; cardioSessionsCount: number; cardioDurationHours: number },
): Record<AchievementCategory, number> {
  const personalRecords = stats.personalRecords || {};
  const prCount = Object.keys(personalRecords).reduce((count, exerciseName) => {
    const exercisePR = personalRecords[exerciseName];
    let exerciseCount = 0;
    if (exercisePR.maxWeight) exerciseCount++;
    if (exercisePR.maxVolume) exerciseCount++;
    if (exercisePR.maxDuration) exerciseCount++;
    if (exercisePR.maxDistance) exerciseCount++;
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
    early_bird: sessionProgress?.earlyBirdCount || 0,
    night_owl: sessionProgress?.nightOwlCount || 0,
    template_mastery: sessionProgress?.maxTemplateSessions || 0,
    monthly_warrior: sessionProgress?.bestMonthWorkouts || 0,
    total_distance: sessionProgress?.totalDistance || 0,
    cardio_sessions: sessionProgress?.cardioSessionsCount || 0,
    cardio_duration: sessionProgress?.cardioDurationHours || 0,
  };
}

export function checkUnlockedAchievements(
  progress: Record<AchievementCategory, number>,
  currentAchievements: UserAchievements,
  useMetric: boolean = true,
): string[] {
  const newlyUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    const isAlreadyUnlocked = currentAchievements.unlockedAchievements.includes(achievement.id);
    const currentProgress = progress[achievement.category] || 0;
    const { requirement } = localizeAchievement(achievement, useMetric);

    if (!isAlreadyUnlocked && currentProgress >= requirement) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}

/**
 * Calculate total points to award for a list of newly unlocked achievement IDs.
 */
function calculatePointsForAchievements(achievementIds: string[]): number {
  return achievementIds.reduce((total, id) => {
    const def = ACHIEVEMENT_DEFINITIONS.find(a => a.id === id);
    return total + (TIER_POINTS[def?.tier as keyof typeof TIER_POINTS] || def?.points || 0);
  }, 0);
}

export async function updateUserAchievements(userId: string): Promise<{
  newAchievements: string[];
  totalAchievements: number;
  pointsAwarded: number;
  progress: Record<AchievementCategory, number>;
}> {
  try {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));

    if (!stats) throw new Error('User stats not found');

    const [user] = await db.select({ useMetric: users.useMetric }).from(users).where(eq(users.id, userId));
    const useMetric = user?.useMetric ?? true;

    const currentAchievements: UserAchievements = (stats.achievements as UserAchievements) || {
      unlockedAchievements: [],
      progress: {},
      lastUpdated: new Date().toISOString(),
    };

    // Calculate session-based progress for new categories
    const sessionProgress = await calculateSessionBasedProgress(userId);

    const progress = calculateAchievementProgress(stats, sessionProgress);
    const newlyUnlocked = checkUnlockedAchievements(progress, currentAchievements, useMetric);

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

    // Award points for newly unlocked achievements
    let pointsAwarded = 0;
    if (newlyUnlocked.length > 0) {
      pointsAwarded = calculatePointsForAchievements(newlyUnlocked);
      if (pointsAwarded > 0) {
        await db
          .update(users)
          .set({ points: sql`${users.points} + ${pointsAwarded}` })
          .where(eq(users.id, userId));
      }
    }

    return {
      newAchievements: newlyUnlocked,
      totalAchievements: updatedAchievements.unlockedAchievements.length,
      pointsAwarded,
      progress,
    };
  } catch (error) {
    console.error('Error updating user achievements:', error);
    return { newAchievements: [], totalAchievements: 0, pointsAwarded: 0, progress: {} as Record<AchievementCategory, number> };
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

    const [user] = await db.select({ useMetric: users.useMetric }).from(users).where(eq(users.id, userId));
    const useMetric = user?.useMetric ?? true;

    const achievements: UserAchievements = (stats.achievements as UserAchievements) || {
      unlockedAchievements: [],
      progress: {},
      lastUpdated: new Date().toISOString(),
    };

    // Calculate session-based progress for new categories
    const sessionProgress = await calculateSessionBasedProgress(userId);

    const currentProgress = calculateAchievementProgress(stats, sessionProgress);

    const achievementDetails = ACHIEVEMENT_DEFINITIONS.map(achievement => {
      const isUnlocked = achievements.unlockedAchievements.includes(achievement.id);
      const progress = currentProgress[achievement.category] || 0;
      const localized = localizeAchievement(achievement, useMetric);
      const progressPercentage = Math.min(100, (progress / localized.requirement) * 100);

      return {
        ...achievement,
        description: localized.description,
        requirement: localized.requirement,
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
