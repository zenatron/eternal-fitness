import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// --- Standard Response Helpers ---
const successResponse = (data: any, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: any) => {
  console.error(
    `API Error (${status}) [analytics/]:`,
    message,
    details ? JSON.stringify(details) : '',
  );
  return NextResponse.json(
    { error: { message, ...(details && { details }) } },
    { status },
  );
};

// 🚀 ADVANCED JSON ANALYTICS QUERIES
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

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
        if (!exerciseKey) {
          return errorResponse('exerciseKey required for exercise progression', 400);
        }
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
    console.error('Error in GET /api/analytics:', error);
    return errorResponse('Internal Server Error', 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// 📊 OVERVIEW ANALYTICS
async function getOverviewAnalytics(userId: string) {
  // Get basic stats
  const userStats = await prisma.userStats.findUnique({
    where: { userId },
  });

  // Get recent sessions with JSON queries
  const recentSessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      completedAt: { not: null },
    },
    orderBy: { completedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      completedAt: true,
      totalVolume: true,
      totalSets: true,
      performanceData: true,
    },
  });

  // 🎯 ADVANCED JSONB QUERIES - Get exercise frequency
  const exerciseFrequency = await prisma.$queryRaw`
    SELECT 
      exercise_key,
      exercise_name,
      COUNT(*) as frequency,
      SUM(total_volume) as total_volume,
      AVG(avg_rpe) as avg_rpe
    FROM (
      SELECT 
        jsonb_array_elements(
          jsonb_path_query_array(
            performance_data, 
            '$.performance.*.exerciseKey'
          )
        ) #>> '{}' as exercise_key,
        jsonb_array_elements(
          jsonb_path_query_array(
            performance_data, 
            '$.templateSnapshot.exercises[*].name'
          )
        ) #>> '{}' as exercise_name,
        total_volume
      FROM workout_sessions 
      WHERE user_id = ${userId} 
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '30 days'
    ) exercise_data
    GROUP BY exercise_key, exercise_name
    ORDER BY frequency DESC
    LIMIT 10
  `;

  // 🎯 MUSCLE GROUP VOLUME ANALYSIS
  const muscleGroupVolume = await prisma.$queryRaw`
    SELECT 
      muscle_group,
      SUM(volume) as total_volume,
      COUNT(*) as session_count
    FROM (
      SELECT 
        jsonb_array_elements_text(
          jsonb_path_query_array(
            performance_data, 
            '$.templateSnapshot.exercises[*].muscles[*]'
          )
        ) as muscle_group,
        total_volume as volume
      FROM workout_sessions 
      WHERE user_id = ${userId} 
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '30 days'
    ) muscle_data
    GROUP BY muscle_group
    ORDER BY total_volume DESC
  `;

  return successResponse({
    userStats,
    recentSessions,
    exerciseFrequency,
    muscleGroupVolume,
    period: '30 days',
  });
}

// 📈 EXERCISE PROGRESSION ANALYTICS
async function getExerciseProgression(userId: string, exerciseKey: string, startDate?: string | null, endDate?: string | null) {
  const dateFilter = startDate && endDate 
    ? `AND completed_at BETWEEN '${startDate}' AND '${endDate}'`
    : 'AND completed_at >= NOW() - INTERVAL \'90 days\'';

  // 🎯 COMPLEX JSONB QUERY - Exercise progression over time
  const progression = await prisma.$queryRaw`
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
        (jsonb_path_query(
          performance_data, 
          '$.performance.* ? (@.exerciseKey == $exercise_key).sets[*].actualWeight',
          jsonb_build_object('exercise_key', ${exerciseKey})
        ) #>> '{}')::numeric as max_weight,
        (jsonb_path_query(
          performance_data, 
          '$.performance.* ? (@.exerciseKey == $exercise_key).sets[*].actualReps',
          jsonb_build_object('exercise_key', ${exerciseKey})
        ) #>> '{}')::numeric as max_reps,
        (jsonb_path_query(
          performance_data, 
          '$.performance.* ? (@.exerciseKey == $exercise_key).totalVolume',
          jsonb_build_object('exercise_key', ${exerciseKey})
        ) #>> '{}')::numeric as total_volume,
        (jsonb_path_query(
          performance_data, 
          '$.performance.* ? (@.exerciseKey == $exercise_key).sets[*].actualRpe',
          jsonb_build_object('exercise_key', ${exerciseKey})
        ) #>> '{}')::numeric as avg_rpe
      FROM workout_sessions 
      WHERE user_id = ${userId} 
        AND completed_at IS NOT NULL
        ${dateFilter}
        AND jsonb_path_exists(
          performance_data, 
          '$.performance.* ? (@.exerciseKey == $exercise_key)',
          jsonb_build_object('exercise_key', ${exerciseKey})
        )
    ) exercise_sessions
    GROUP BY DATE(completed_at)
    ORDER BY workout_date ASC
  `;

  return successResponse({
    exerciseKey,
    progression,
    period: startDate && endDate ? `${startDate} to ${endDate}` : '90 days',
  });
}

// 💪 MUSCLE GROUP VOLUME ANALYTICS
async function getMuscleGroupVolumeAnalytics(userId: string, muscleGroup?: string | null, startDate?: string | null, endDate?: string | null) {
  const dateFilter = startDate && endDate 
    ? `AND completed_at BETWEEN '${startDate}' AND '${endDate}'`
    : 'AND completed_at >= NOW() - INTERVAL \'30 days\'';

  const muscleFilter = muscleGroup 
    ? `AND muscle_group = '${muscleGroup}'`
    : '';

  // 🎯 MUSCLE GROUP VOLUME TRENDS
  const volumeTrends = await prisma.$queryRaw`
    SELECT 
      DATE(completed_at) as workout_date,
      muscle_group,
      SUM(volume) as daily_volume,
      COUNT(*) as exercise_count
    FROM (
      SELECT 
        completed_at,
        jsonb_array_elements_text(
          jsonb_path_query_array(
            performance_data, 
            '$.templateSnapshot.exercises[*].muscles[*]'
          )
        ) as muscle_group,
        total_volume as volume
      FROM workout_sessions 
      WHERE user_id = ${userId} 
        AND completed_at IS NOT NULL
        ${dateFilter}
    ) muscle_sessions
    WHERE 1=1 ${muscleFilter}
    GROUP BY DATE(completed_at), muscle_group
    ORDER BY workout_date ASC, muscle_group
  `;

  return successResponse({
    muscleGroup: muscleGroup || 'all',
    volumeTrends,
    period: startDate && endDate ? `${startDate} to ${endDate}` : '30 days',
  });
}

// 📅 WORKOUT FREQUENCY ANALYTICS
async function getWorkoutFrequencyAnalytics(userId: string, startDate?: string | null, endDate?: string | null) {
  const dateFilter = startDate && endDate 
    ? `AND completed_at BETWEEN '${startDate}' AND '${endDate}'`
    : 'AND completed_at >= NOW() - INTERVAL \'90 days\'';

  // 🎯 WORKOUT FREQUENCY BY DAY OF WEEK
  const frequencyByDay = await prisma.$queryRaw`
    SELECT 
      EXTRACT(DOW FROM completed_at) as day_of_week,
      TO_CHAR(completed_at, 'Day') as day_name,
      COUNT(*) as workout_count,
      AVG(total_volume) as avg_volume,
      AVG(duration) as avg_duration
    FROM workout_sessions 
    WHERE user_id = ${userId} 
      AND completed_at IS NOT NULL
      ${dateFilter}
    GROUP BY EXTRACT(DOW FROM completed_at), TO_CHAR(completed_at, 'Day')
    ORDER BY day_of_week
  `;

  // 🎯 WEEKLY WORKOUT TRENDS
  const weeklyTrends = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('week', completed_at) as week_start,
      COUNT(*) as workout_count,
      SUM(total_volume) as total_volume,
      AVG(duration) as avg_duration
    FROM workout_sessions 
    WHERE user_id = ${userId} 
      AND completed_at IS NOT NULL
      ${dateFilter}
    GROUP BY DATE_TRUNC('week', completed_at)
    ORDER BY week_start ASC
  `;

  return successResponse({
    frequencyByDay,
    weeklyTrends,
    period: startDate && endDate ? `${startDate} to ${endDate}` : '90 days',
  });
}

// 🏆 PERSONAL RECORDS
async function getPersonalRecords(userId: string, exerciseKey?: string | null) {
  const exerciseFilter = exerciseKey 
    ? `AND exercise_key = '${exerciseKey}'`
    : '';

  // 🎯 EXTRACT PERSONAL RECORDS FROM JSON
  const personalRecords = await prisma.$queryRaw`
    SELECT 
      exercise_key,
      exercise_name,
      MAX(max_weight) as best_weight,
      MAX(max_reps) as best_reps,
      MAX(total_volume) as best_volume,
      MAX(completed_at) as latest_pr_date
    FROM (
      SELECT 
        jsonb_path_query(
          performance_data, 
          '$.performance.*.exerciseKey'
        ) #>> '{}' as exercise_key,
        jsonb_path_query(
          performance_data, 
          '$.templateSnapshot.exercises[*] ? (@.exerciseKey == $key).name',
          jsonb_build_object('key', jsonb_path_query(performance_data, '$.performance.*.exerciseKey') #>> '{}')
        ) #>> '{}' as exercise_name,
        (jsonb_path_query(
          performance_data, 
          '$.performance.*.sets[*].actualWeight'
        ) #>> '{}')::numeric as max_weight,
        (jsonb_path_query(
          performance_data, 
          '$.performance.*.sets[*].actualReps'
        ) #>> '{}')::numeric as max_reps,
        (jsonb_path_query(
          performance_data, 
          '$.performance.*.totalVolume'
        ) #>> '{}')::numeric as total_volume,
        completed_at
      FROM workout_sessions 
      WHERE user_id = ${userId} 
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '365 days'
    ) pr_data
    WHERE exercise_key IS NOT NULL ${exerciseFilter}
    GROUP BY exercise_key, exercise_name
    ORDER BY best_volume DESC
  `;

  return successResponse({
    exerciseKey: exerciseKey || 'all',
    personalRecords,
    period: '365 days',
  });
}

// 📋 TEMPLATE PERFORMANCE ANALYTICS
async function getTemplatePerformanceAnalytics(userId: string) {
  // 🎯 TEMPLATE USAGE AND PERFORMANCE
  const templatePerformance = await prisma.$queryRaw`
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
  `;

  return successResponse({
    templatePerformance,
  });
}

console.log('✅ Advanced JSON Analytics API loaded with JSONB superpowers!');
