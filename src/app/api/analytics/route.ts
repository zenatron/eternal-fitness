import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { userStats, workoutSessions, workoutTemplates } from '@/lib/db/schema';
import { eq, and, isNotNull, desc, gte, sql } from 'drizzle-orm';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [analytics/]:`, message, details ? JSON.stringify(details) : '');
  const errorBody: { message: string; details?: unknown } = { message };
  if (details) errorBody.details = details;
  return NextResponse.json({ error: errorBody }, { status });
};

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const exerciseKey = searchParams.get('exerciseKey');
    const muscleGroup = searchParams.get('muscleGroup');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    switch (type) {
      case 'overview':
        return await getOverviewAnalytics(userId);
      case 'exercise-progression':
        if (!exerciseKey) return errorResponse('exerciseKey required for exercise progression', 400);
        return await getExerciseProgression(userId, exerciseKey, startDate, endDate);
      case 'muscle-group-volume':
        return await getMuscleGroupVolumeAnalytics(userId, muscleGroup, startDate, endDate);
      case 'workout-frequency':
        return await getWorkoutFrequencyAnalytics(userId, startDate, endDate);
      case 'personal-records':
        return await getPersonalRecords(userId, exerciseKey);
      case 'template-performance':
        return await getTemplatePerformanceAnalytics(userId);
      default:
        return errorResponse('Invalid analytics type', 400);
    }
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

async function getOverviewAnalytics(userId: string) {
  const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));

  const recentSessions = await db
    .select({
      id: workoutSessions.id,
      completedAt: workoutSessions.completedAt,
      totalVolume: workoutSessions.totalVolume,
      totalSets: workoutSessions.totalSets,
      performanceData: workoutSessions.performanceData,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.completedAt)))
    .orderBy(desc(workoutSessions.completedAt))
    .limit(10);

  const exerciseFrequency = await db.execute(sql`
    SELECT
      exercise_key,
      exercise_name,
      COUNT(*) as frequency,
      SUM(total_volume) as total_volume
    FROM (
      SELECT
        jsonb_array_elements(jsonb_path_query_array(performance_data, '$.performance.*.exerciseKey')) #>> '{}' as exercise_key,
        jsonb_array_elements(jsonb_path_query_array(performance_data, '$.templateSnapshot.exercises[*].name')) #>> '{}' as exercise_name,
        total_volume
      FROM workout_sessions
      WHERE user_id = ${userId}
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '30 days'
    ) exercise_data
    GROUP BY exercise_key, exercise_name
    ORDER BY frequency DESC
    LIMIT 10
  `);

  const muscleGroupVolume = await db.execute(sql`
    SELECT
      muscle_group,
      SUM(volume) as total_volume,
      COUNT(*) as session_count
    FROM (
      SELECT
        jsonb_array_elements_text(jsonb_path_query_array(performance_data, '$.templateSnapshot.exercises[*].muscles[*]')) as muscle_group,
        total_volume as volume
      FROM workout_sessions
      WHERE user_id = ${userId}
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '30 days'
    ) muscle_data
    GROUP BY muscle_group
    ORDER BY total_volume DESC
  `);

  return successResponse({
    userStats: stats,
    recentSessions,
    exerciseFrequency,
    muscleGroupVolume,
    period: '30 days',
  });
}

async function getExerciseProgression(userId: string, exerciseKey: string, startDate?: string | null, endDate?: string | null) {
  const dateCondition = startDate && endDate
    ? sql`AND completed_at BETWEEN ${startDate}::timestamptz AND ${endDate}::timestamptz`
    : sql`AND completed_at >= NOW() - INTERVAL '90 days'`;

  const progression = await db.execute(sql`
    SELECT
      DATE(completed_at) as workout_date,
      MAX(max_weight) as max_weight,
      MAX(max_reps) as max_reps,
      SUM(total_volume) as total_volume,
      AVG(avg_rpe) as avg_rpe,
      COUNT(*) as set_count
    FROM (
      SELECT
        completed_at,
        (jsonb_path_query(performance_data, '$.performance.* ? (@.exerciseKey == $exercise_key).sets[*].actualWeight', jsonb_build_object('exercise_key', ${exerciseKey})) #>> '{}')::numeric as max_weight,
        (jsonb_path_query(performance_data, '$.performance.* ? (@.exerciseKey == $exercise_key).sets[*].actualReps', jsonb_build_object('exercise_key', ${exerciseKey})) #>> '{}')::numeric as max_reps,
        (jsonb_path_query(performance_data, '$.performance.* ? (@.exerciseKey == $exercise_key).totalVolume', jsonb_build_object('exercise_key', ${exerciseKey})) #>> '{}')::numeric as total_volume,
        (jsonb_path_query(performance_data, '$.performance.* ? (@.exerciseKey == $exercise_key).sets[*].actualRpe', jsonb_build_object('exercise_key', ${exerciseKey})) #>> '{}')::numeric as avg_rpe
      FROM workout_sessions
      WHERE user_id = ${userId}
        AND completed_at IS NOT NULL
        ${dateCondition}
        AND jsonb_path_exists(performance_data, '$.performance.* ? (@.exerciseKey == $exercise_key)', jsonb_build_object('exercise_key', ${exerciseKey}))
    ) exercise_sessions
    GROUP BY DATE(completed_at)
    ORDER BY workout_date ASC
  `);

  return successResponse({
    exerciseKey,
    progression,
    period: startDate && endDate ? `${startDate} to ${endDate}` : '90 days',
  });
}

async function getMuscleGroupVolumeAnalytics(userId: string, muscleGroup?: string | null, startDate?: string | null, endDate?: string | null) {
  const dateCondition = startDate && endDate
    ? sql`AND completed_at BETWEEN ${startDate}::timestamptz AND ${endDate}::timestamptz`
    : sql`AND completed_at >= NOW() - INTERVAL '30 days'`;

  const muscleCondition = muscleGroup
    ? sql`WHERE muscle_group = ${muscleGroup}`
    : sql`WHERE 1=1`;

  const volumeTrends = await db.execute(sql`
    SELECT
      DATE(completed_at) as workout_date,
      muscle_group,
      SUM(volume) as daily_volume,
      COUNT(*) as exercise_count
    FROM (
      SELECT
        completed_at,
        jsonb_array_elements_text(jsonb_path_query_array(performance_data, '$.templateSnapshot.exercises[*].muscles[*]')) as muscle_group,
        total_volume as volume
      FROM workout_sessions
      WHERE user_id = ${userId}
        AND completed_at IS NOT NULL
        ${dateCondition}
    ) muscle_sessions
    ${muscleCondition}
    GROUP BY DATE(completed_at), muscle_group
    ORDER BY workout_date ASC, muscle_group
  `);

  return successResponse({
    muscleGroup: muscleGroup || 'all',
    volumeTrends,
    period: startDate && endDate ? `${startDate} to ${endDate}` : '30 days',
  });
}

async function getWorkoutFrequencyAnalytics(userId: string, startDate?: string | null, endDate?: string | null) {
  const dateCondition = startDate && endDate
    ? sql`AND completed_at BETWEEN ${startDate}::timestamptz AND ${endDate}::timestamptz`
    : sql`AND completed_at >= NOW() - INTERVAL '90 days'`;

  const frequencyByDay = await db.execute(sql`
    SELECT
      EXTRACT(DOW FROM completed_at) as day_of_week,
      TO_CHAR(completed_at, 'Day') as day_name,
      COUNT(*) as workout_count,
      AVG(total_volume) as avg_volume,
      AVG(duration) as avg_duration
    FROM workout_sessions
    WHERE user_id = ${userId}
      AND completed_at IS NOT NULL
      ${dateCondition}
    GROUP BY EXTRACT(DOW FROM completed_at), TO_CHAR(completed_at, 'Day')
    ORDER BY day_of_week
  `);

  const weeklyTrends = await db.execute(sql`
    SELECT
      DATE_TRUNC('week', completed_at) as week_start,
      COUNT(*) as workout_count,
      SUM(total_volume) as total_volume,
      AVG(duration) as avg_duration
    FROM workout_sessions
    WHERE user_id = ${userId}
      AND completed_at IS NOT NULL
      ${dateCondition}
    GROUP BY DATE_TRUNC('week', completed_at)
    ORDER BY week_start ASC
  `);

  return successResponse({
    frequencyByDay,
    weeklyTrends,
    period: startDate && endDate ? `${startDate} to ${endDate}` : '90 days',
  });
}

async function getPersonalRecords(userId: string, exerciseKey?: string | null) {
  const [stats] = await db
    .select({ personalRecords: userStats.personalRecords })
    .from(userStats)
    .where(eq(userStats.userId, userId));

  if (!stats?.personalRecords) {
    return successResponse({ exerciseKey: exerciseKey || 'all', personalRecords: [], period: '365 days' });
  }

  const personalRecords = stats.personalRecords as any;
  const analyticsRecords: Array<{
    exercise_key: string;
    exercise_name: string;
    best_weight: number;
    best_reps: number;
    best_volume: number;
    latest_pr_date: string;
  }> = [];

  Object.entries(personalRecords).forEach(([exerciseName, exercisePR]: [string, any]) => {
    if (exerciseKey && exerciseName.toLowerCase() !== exerciseKey.toLowerCase()) return;

    const exerciseKeyFormatted = exerciseName.toLowerCase().replace(/\s+/g, '_');
    const maxWeightDate = exercisePR.maxWeight?.achievedAt;
    const maxVolumeDate = exercisePR.maxVolume?.achievedAt;
    const latestDate = [maxWeightDate, maxVolumeDate]
      .filter(Boolean)
      .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0];

    analyticsRecords.push({
      exercise_key: exerciseKeyFormatted,
      exercise_name: exerciseName,
      best_weight: exercisePR.maxWeight?.value || 0,
      best_reps: exercisePR.maxWeight?.reps || 0,
      best_volume: exercisePR.maxVolume?.value || 0,
      latest_pr_date: latestDate || new Date().toISOString(),
    });
  });

  analyticsRecords.sort((a, b) => b.best_volume - a.best_volume);

  return successResponse({ exerciseKey: exerciseKey || 'all', personalRecords: analyticsRecords, period: '365 days' });
}

async function getTemplatePerformanceAnalytics(userId: string) {
  const templatePerformance = await db.execute(sql`
    SELECT
      wt.id as template_id,
      wt.name as template_name,
      wt.workout_type,
      wt.difficulty,
      COUNT(ws.id) as usage_count,
      AVG(ws.total_volume) as avg_volume,
      AVG(ws.duration) as avg_duration,
      MAX(ws.completed_at) as last_used
    FROM workout_templates wt
    LEFT JOIN workout_sessions ws ON wt.id = ws.workout_template_id
      AND ws.completed_at IS NOT NULL
    WHERE wt.user_id = ${userId}
    GROUP BY wt.id, wt.name, wt.workout_type, wt.difficulty
    ORDER BY usage_count DESC, avg_volume DESC
  `);

  return successResponse({ templatePerformance });
}
