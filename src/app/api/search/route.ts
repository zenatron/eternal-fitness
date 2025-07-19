import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { createApiHandler } from '@/lib/api-utils';

// 🔍 ADVANCED JSON SEARCH CAPABILITIES
export const GET = createApiHandler(async (userId, request) => {

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // templates, sessions, exercises
    const muscleGroup = searchParams.get('muscleGroup');
    const equipment = searchParams.get('equipment');
    const difficulty = searchParams.get('difficulty');
    const workoutType = searchParams.get('workoutType');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query && !muscleGroup && !equipment && !difficulty && !workoutType) {
      throw new Error('At least one search parameter is required');
    }

    const results: {
      templates: any[];
      sessions: any[];
      exercises: any[];
      analytics: any;
    } = {
      templates: [],
      sessions: [],
      exercises: [],
      analytics: {},
    };

    if (type === 'all' || type === 'templates') {
      results.templates = await searchTemplates(userId, {
        query,
        muscleGroup,
        equipment,
        difficulty,
        workoutType,
        limit,
      }) as any[];
    }

    if (type === 'all' || type === 'sessions') {
      results.sessions = await searchSessions(userId, {
        query,
        muscleGroup,
        equipment,
        limit,
      }) as any[];
    }

    if (type === 'all' || type === 'exercises') {
      results.exercises = await searchExercises(userId, {
        query,
        muscleGroup,
        equipment,
        limit,
      }) as any[];
    }

    if (type === 'analytics') {
      results.analytics = await getSearchAnalytics(userId, {
        query,
        muscleGroup,
        equipment,
      });
    }

    return results;
});

// 🎯 SEARCH WORKOUT TEMPLATES WITH JSONB
async function searchTemplates(userId: string, filters: any) {
  const { query, muscleGroup, equipment, difficulty, workoutType, limit } = filters;

  let whereConditions = [`user_id = '${userId}'`];
  let jsonbConditions = [];

  // Text search in name and description
  if (query) {
    whereConditions.push(`(
      name ILIKE '%${query}%' OR 
      (workout_data->>'metadata'->>'description') ILIKE '%${query}%'
    )`);
  }

  // Difficulty filter
  if (difficulty) {
    whereConditions.push(`difficulty = '${difficulty}'`);
  }

  // Workout type filter
  if (workoutType) {
    whereConditions.push(`workout_type = '${workoutType}'`);
  }

  // 🚀 ADVANCED JSONB QUERIES
  // Muscle group search
  if (muscleGroup) {
    jsonbConditions.push(`
      jsonb_path_exists(
        workout_data, 
        '$.exercises[*].muscles[*] ? (@ like_regex "${muscleGroup}" flag "i")'
      )
    `);
  }

  // Equipment search
  if (equipment) {
    jsonbConditions.push(`
      jsonb_path_exists(
        workout_data, 
        '$.exercises[*].equipment[*] ? (@ like_regex "${equipment}" flag "i")'
      )
    `);
  }

  // Exercise name search within JSON
  if (query) {
    jsonbConditions.push(`
      jsonb_path_exists(
        workout_data, 
        '$.exercises[*].name ? (@ like_regex "${query}" flag "i")'
      )
    `);
  }

  const allConditions = [...whereConditions, ...jsonbConditions];
  const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

  const templates = await prisma.$queryRaw`
    SELECT 
      id,
      name,
      favorite,
      workout_data,
      total_volume,
      estimated_duration,
      exercise_count,
      difficulty,
      workout_type,
      created_at,
      updated_at,
      -- Extract matching exercises for highlighting
      jsonb_path_query_array(
        workout_data, 
        '$.exercises[*] ? (@.name like_regex $1 flag "i")',
        ${query || '.*'}
      ) as matching_exercises
    FROM workout_templates
    ${whereClause}
    ORDER BY 
      favorite DESC,
      CASE WHEN name ILIKE '%${query || ''}%' THEN 1 ELSE 2 END,
      total_volume DESC
    LIMIT ${limit}
  `;

  return templates;
}

// 🎯 SEARCH WORKOUT SESSIONS WITH JSONB
async function searchSessions(userId: string, filters: any) {
  const { query, muscleGroup, equipment, limit } = filters;

  let whereConditions = [`user_id = '${userId}'`, `completed_at IS NOT NULL`];
  let jsonbConditions = [];

  // 🚀 SEARCH WITHIN SESSION PERFORMANCE DATA
  if (query) {
    jsonbConditions.push(`
      (
        jsonb_path_exists(
          performance_data, 
          '$.templateSnapshot.exercises[*].name ? (@ like_regex "${query}" flag "i")'
        ) OR
        jsonb_path_exists(
          performance_data, 
          '$.performance.*.exerciseNotes ? (@ like_regex "${query}" flag "i")'
        ) OR
        notes ILIKE '%${query}%'
      )
    `);
  }

  if (muscleGroup) {
    jsonbConditions.push(`
      jsonb_path_exists(
        performance_data, 
        '$.templateSnapshot.exercises[*].muscles[*] ? (@ like_regex "${muscleGroup}" flag "i")'
      )
    `);
  }

  if (equipment) {
    jsonbConditions.push(`
      jsonb_path_exists(
        performance_data, 
        '$.templateSnapshot.exercises[*].equipment[*] ? (@ like_regex "${equipment}" flag "i")'
      )
    `);
  }

  const allConditions = [...whereConditions, ...jsonbConditions];
  const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

  const sessions = await prisma.$queryRaw`
    SELECT 
      id,
      completed_at,
      duration,
      notes,
      total_volume,
      total_sets,
      total_exercises,
      average_rpe,
      personal_records,
      -- Extract template name from JSON
      performance_data->'templateSnapshot'->'metadata'->>'name' as template_name,
      -- Extract matching exercises
      jsonb_path_query_array(
        performance_data, 
        '$.templateSnapshot.exercises[*] ? (@.name like_regex $1 flag "i")',
        ${query || '.*'}
      ) as matching_exercises
    FROM workout_sessions
    ${whereClause}
    ORDER BY completed_at DESC
    LIMIT ${limit}
  `;

  return sessions;
}

// 🎯 SEARCH EXERCISES WITH PERFORMANCE DATA
async function searchExercises(userId: string, filters: any) {
  const { query, muscleGroup, equipment, limit } = filters;

  let conditions = [];

  if (query) {
    conditions.push(`name ILIKE '%${query}%'`);
  }

  if (muscleGroup) {
    conditions.push(`'${muscleGroup}' = ANY(muscles)`);
  }

  if (equipment) {
    conditions.push(`'${equipment}' = ANY(equipment)`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 🚀 GET EXERCISES WITH PERFORMANCE STATS
  const exercises = await prisma.$queryRaw`
    SELECT 
      e.id,
      e.name,
      e.muscles,
      e.equipment,
      e.category,
      e.difficulty,
      -- Get usage stats from sessions
      COALESCE(usage_stats.usage_count, 0) as usage_count,
      COALESCE(usage_stats.avg_volume, 0) as avg_volume,
      COALESCE(usage_stats.max_weight, 0) as max_weight,
      COALESCE(usage_stats.last_used, NULL) as last_used
    FROM exercises e
    LEFT JOIN (
      SELECT 
        jsonb_path_query(
          performance_data, 
          '$.performance.*.exerciseKey'
        ) #>> '{}' as exercise_key,
        COUNT(*) as usage_count,
        AVG((jsonb_path_query(
          performance_data, 
          '$.performance.*.totalVolume'
        ) #>> '{}')::numeric) as avg_volume,
        MAX((jsonb_path_query(
          performance_data, 
          '$.performance.*.sets[*].actualWeight'
        ) #>> '{}')::numeric) as max_weight,
        MAX(completed_at) as last_used
      FROM workout_sessions 
      WHERE user_id = ${userId} 
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '365 days'
      GROUP BY exercise_key
    ) usage_stats ON e.id = usage_stats.exercise_key
    ${whereClause}
    ORDER BY usage_stats.usage_count DESC NULLS LAST, e.name
    LIMIT ${limit}
  `;

  return exercises;
}

// 📊 SEARCH ANALYTICS
async function getSearchAnalytics(userId: string, filters: any) {
  const { query, muscleGroup, equipment } = filters;

  // 🎯 ANALYZE SEARCH PATTERNS AND TRENDS
  const analyticsData = await prisma.$queryRaw`
    SELECT 
      'search_insights' as type,
      COUNT(DISTINCT ws.id) as total_sessions,
      COUNT(DISTINCT DATE(ws.completed_at)) as active_days,
      AVG(ws.total_volume) as avg_volume,
      SUM(ws.total_volume) as total_volume,
      -- Most common exercises matching search
      jsonb_agg(DISTINCT 
        jsonb_path_query(
          ws.performance_data, 
          '$.performance.*.exerciseKey'
        ) #>> '{}'
      ) FILTER (WHERE jsonb_path_query(ws.performance_data, '$.performance.*.exerciseKey') IS NOT NULL) as common_exercises
    FROM workout_sessions ws
    WHERE ws.user_id = ${userId}
      AND ws.completed_at IS NOT NULL
      AND ws.completed_at >= NOW() - INTERVAL '90 days'
      ${query ? `AND (
        jsonb_path_exists(
          ws.performance_data, 
          '$.templateSnapshot.exercises[*].name ? (@ like_regex "${query}" flag "i")'
        ) OR
        ws.notes ILIKE '%${query}%'
      )` : ''}
      ${muscleGroup ? `AND jsonb_path_exists(
        ws.performance_data, 
        '$.templateSnapshot.exercises[*].muscles[*] ? (@ like_regex "${muscleGroup}" flag "i")'
      )` : ''}
      ${equipment ? `AND jsonb_path_exists(
        ws.performance_data, 
        '$.templateSnapshot.exercises[*].equipment[*] ? (@ like_regex "${equipment}" flag "i")'
      )` : ''}
  `;

  return (analyticsData as any[])[0] || {};
}

console.log('🔍 Advanced JSON Search API loaded with JSONB search superpowers!');
