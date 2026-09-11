import { ACHIEVEMENT_DEFINITIONS, UserAchievements, AchievementCategory, localizeAchievement, TIER_POINTS } from '@/types/achievements';
import { db } from '@/lib/db';
import { userStats, workoutSessions, users, monthlyStats, workoutTemplates } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { PR_TYPES } from '@/types/personalRecords';
import { getUserTimeZone } from '@/lib/userTimeZone';

/*
 * Calculate progress for time-of-day achievements (early bird / night owl)
 * and template mastery / monthly warrior from workout session data.
 *
 * Aggregated in Postgres rather than loading every session's `performance`
 * JSONB into Node — this runs on each workout completion, and the old
 * row-by-row scan shipped megabytes for a long training history. Hour
 * extraction goes through the user's zone: the old `completedAt.getHours()`
 * read the process zone, which is UTC in the container, so an early-bird
 * workout at 6am in New York was counted as a noon workout.
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
  const timeZone = await getUserTimeZone(userId);

  const sessionRows = await db.execute<{
    early_bird: number;
    night_owl: number;
    max_template_sessions: number;
    cardio_sessions: number;
  }>(sql`
    SELECT
      COUNT(*) FILTER (
        WHERE EXTRACT(hour FROM ws.completed_at AT TIME ZONE ${timeZone}) < 8
      )::int AS early_bird,
      COUNT(*) FILTER (
        WHERE EXTRACT(hour FROM ws.completed_at AT TIME ZONE ${timeZone}) >= 22
      )::int AS night_owl,
      COALESCE((
        SELECT MAX(n) FROM (
          SELECT COUNT(*) AS n
          FROM ${workoutSessions}
          WHERE user_id = ${userId}
            AND completed_at IS NOT NULL
            AND workout_template_id IS NOT NULL
          GROUP BY workout_template_id
        ) t
      ), 0)::int AS max_template_sessions,
      COUNT(*) FILTER (
        WHERE COALESCE(
          t.workout_type,
          ws.performance_data #>> '{templateSnapshot,metadata,workoutType}'
        ) IN ('cardio', 'hybrid')
      )::int AS cardio_sessions
    FROM ${workoutSessions} ws
    LEFT JOIN ${workoutTemplates} t ON t.id = ws.workout_template_id
    WHERE ws.user_id = ${userId} AND ws.completed_at IS NOT NULL
  `);

  const [sessionAgg] = sessionRows;

  const [setAgg] = await db.execute<{ total_distance: string | number; cardio_seconds: string | number }>(sql`
    SELECT
      COALESCE(SUM((s.value->>'actualDistance')::numeric), 0) AS total_distance,
      COALESCE(SUM((s.value->>'actualDuration')::numeric) FILTER (
        WHERE COALESCE(t.workout_type, ws.performance_data #>> '{templateSnapshot,metadata,workoutType}') IN ('cardio', 'hybrid')
      ), 0) AS cardio_seconds
    FROM ${workoutSessions} ws
    LEFT JOIN ${workoutTemplates} t ON t.id = ws.workout_template_id
    CROSS JOIN LATERAL jsonb_each(ws.performance_data->'performance') p
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(p.value->'sets') = 'array' THEN p.value->'sets' ELSE '[]'::jsonb END
    ) s
    WHERE ws.user_id = ${userId}
      AND ws.completed_at IS NOT NULL
      AND (s.value->>'completed')::boolean IS TRUE
  `);

  // Best month: query monthly_stats for highest workoutsCount
  const [bestMonth] = await db
    .select({ maxCount: sql<number>`COALESCE(MAX(${monthlyStats.workoutsCount}), 0)` })
    .from(monthlyStats)
    .where(eq(monthlyStats.userId, userId));

  return {
    earlyBirdCount: Number(sessionAgg?.early_bird ?? 0),
    nightOwlCount: Number(sessionAgg?.night_owl ?? 0),
    maxTemplateSessions: Number(sessionAgg?.max_template_sessions ?? 0),
    bestMonthWorkouts: bestMonth?.maxCount ?? 0,
    totalDistance: Number(setAgg?.total_distance ?? 0),
    cardioSessionsCount: Number(sessionAgg?.cardio_sessions ?? 0),
    cardioDurationHours: Number(setAgg?.cardio_seconds ?? 0) / 3600,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateAchievementProgress(
  stats: Record<string, any>,
  sessionProgress?: { earlyBirdCount: number; nightOwlCount: number; maxTemplateSessions: number; bestMonthWorkouts: number; totalDistance: number; cardioSessionsCount: number; cardioDurationHours: number },
): Record<AchievementCategory, number> {
  /*
   * Every record on every exercise counts as one towards the personal_records
   * achievements. Driven off PR_TYPES rather than a hand-written list of `if`s:
   * that list silently missed maxOneRepMax when it was added, so estimated-1RM
   * records were being stored but not counted.
   */
  const personalRecords = stats.personalRecords || {};
  const prCount = Object.values(personalRecords).reduce((count: number, exercisePR) => {
    if (!exercisePR || typeof exercisePR !== 'object') return count;
    const record = exercisePR as Record<string, unknown>;
    return count + PR_TYPES.filter((type) => record[type]).length;
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
 * Total points for a list of newly unlocked achievement IDs.
 *
 * Exported for testing: this is the only place the tier-points table is applied,
 * and getting it wrong inflates a user's level permanently.
 */
export function calculatePointsForAchievements(achievementIds: string[]): number {
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

/**
 * Reads the materialized achievement state.
 *
 * `progress` is computed and persisted by `updateUserAchievements`, which every
 * write path (all completion routes and session edits) already runs — so this
 * never re-derives anything from session history. It used to rescan the user's
 * entire completed history on every profile/achievements load; the route above
 * `updateUserAchievements` made that scan run *twice* per GET.
 *
 * Categories missing from an older stored blob read as 0, matching a fresh
 * user; `POST /api/user/achievements` forces a full recompute when needed.
 */
export async function getUserAchievements(userId: string) {
  try {
    const [stats] = await db
      .select({
        achievements: userStats.achievements,
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

    const storedProgress = achievements.progress || {};
    const currentProgress = Object.fromEntries(
      (Object.keys(calculateAchievementProgress({})) as AchievementCategory[]).map((category) => [
        category,
        storedProgress[category] || 0,
      ])
    ) as Record<AchievementCategory, number>;

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

/**
 * Recomputes `uniqueExercises` and `activeWeeks` for a user.
 *
 * Both are aggregated in Postgres rather than by loading every session's
 * `performanceData` blob into Node and iterating. That old approach ran on
 * every single workout completion and grew linearly with the user's entire
 * training history — the JSONB payload for a year of lifting is megabytes.
 *
 * `activeWeeks` was additionally never written by anything, which left the
 * "dedication" achievement permanently at 0 and the Active Weeks stat showing
 * zero on the dashboard and profile.
 */
export async function updateUniqueExercisesCount(userId: string, _exerciseKeys?: string[]) {
  try {
    // `jsonb_each` expands the performance object so distinct exercise keys can
    // be counted by the database.
    const [exerciseRow] = await db.execute<{ count: number }>(sql`
      SELECT COUNT(DISTINCT perf.value->>'exerciseKey')::int AS count
      FROM ${workoutSessions} ws,
           LATERAL jsonb_each(ws.performance_data->'performance') AS perf
      WHERE ws.user_id = ${userId}
        AND ws.completed_at IS NOT NULL
        AND ws.performance_data IS NOT NULL
        AND jsonb_typeof(ws.performance_data->'performance') = 'object'
    `);

    // A week counts as active if it contains at least one completed session.
    const [weekRow] = await db.execute<{ count: number }>(sql`
      SELECT COUNT(DISTINCT date_trunc('week', completed_at))::int AS count
      FROM ${workoutSessions}
      WHERE user_id = ${userId}
        AND completed_at IS NOT NULL
    `);

    const uniqueExercises = Number(exerciseRow?.count ?? 0);
    const activeWeeks = Number(weekRow?.count ?? 0);

    await db
      .update(userStats)
      .set({ uniqueExercises, activeWeeks })
      .where(eq(userStats.userId, userId));

    return uniqueExercises;
  } catch (error) {
    console.error('Error updating unique exercises count:', error);
    return 0;
  }
}
