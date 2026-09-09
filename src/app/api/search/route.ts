import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { parseLimitParam } from '@/lib/api/response';

const successResponse = (data: unknown, status = 200) => {
  return NextResponse.json({ data }, { status });
};

const errorResponse = (message: string, status = 500, details?: unknown) => {
  console.error(`API Error (${status}) [search/]:`, message, details ? JSON.stringify(details) : '');
  return NextResponse.json({ error: Object.assign({ message }, details ? { details } : {}) }, { status });
};

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return errorResponse('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const muscleGroup = searchParams.get('muscleGroup');
    const equipment = searchParams.get('equipment');
    const difficulty = searchParams.get('difficulty');
    const workoutType = searchParams.get('workoutType');
    const limit = parseLimitParam(searchParams.get('limit'), 20);

    if (!query && !muscleGroup && !equipment && !difficulty && !workoutType) {
      return errorResponse('At least one search parameter is required', 400);
    }

    const results: Record<string, unknown> = {
      templates: [],
      sessions: [],
      exercises: [],
      analytics: {},
    };

    if (type === 'all' || type === 'templates') {
      results.templates = await searchTemplates(userId, { query, muscleGroup, equipment, difficulty, workoutType, limit });
    }
    if (type === 'all' || type === 'sessions') {
      results.sessions = await searchSessions(userId, { query, muscleGroup, equipment, limit });
    }
    if (type === 'analytics') {
      results.analytics = await getSearchAnalytics(userId, { query, muscleGroup, equipment });
    }

    return successResponse(results);
  } catch (error) {
    return errorResponse('Internal Server Error', 500, error instanceof Error ? error.message : String(error));
  }
}

async function searchTemplates(userId: string, filters: {
  query?: string | null; muscleGroup?: string | null; equipment?: string | null;
  difficulty?: string | null; workoutType?: string | null; limit: number;
}) {
  const { query, muscleGroup, equipment, difficulty, workoutType, limit: lim } = filters;
  const searchPattern = query ? `%${query}%` : null;

  /*
   * JSON-path values are matched with EXISTS + ILIKE rather than
   * `jsonb_path_exists(... ? (@ like_regex $var ...))`: Postgres rejects
   * variables inside the like_regex operand ("syntax error at or near"),
   * so every query that used one failed outright. jsonb_path_query's *paths*
   * contain no variables, which is why they work.
   */
  const templates = await db.execute(sql`
    SELECT
      id, name, favorite, workout_data, total_volume,
      estimated_duration, exercise_count, difficulty,
      workout_type, created_at, updated_at
    FROM workout_templates
    WHERE user_id = ${userId}
      ${searchPattern ? sql`AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})` : sql``}
      ${difficulty ? sql`AND difficulty = ${difficulty}` : sql``}
      ${workoutType ? sql`AND workout_type = ${workoutType}` : sql``}
      ${muscleGroup ? sql`AND EXISTS (
        SELECT 1 FROM jsonb_path_query(workout_data, '$.exercises[*].muscles[*]') AS j
        WHERE j #>> '{}' ILIKE ${'%' + muscleGroup + '%'}
      )` : sql``}
      ${equipment ? sql`AND EXISTS (
        SELECT 1 FROM jsonb_path_query(workout_data, '$.exercises[*].equipment[*]') AS j
        WHERE j #>> '{}' ILIKE ${'%' + equipment + '%'}
      )` : sql``}
    ORDER BY
      favorite DESC,
      total_volume DESC
    LIMIT ${lim}
  `);

  return templates;
}

async function searchSessions(userId: string, filters: {
  query?: string | null; muscleGroup?: string | null; equipment?: string | null; limit: number;
}) {
  const { query, muscleGroup, equipment, limit: lim } = filters;
  const searchPattern = query ? `%${query}%` : null;

  const sessions = await db.execute(sql`
    SELECT
      id, completed_at, duration, notes, total_volume,
      total_sets, total_exercises, personal_records,
      performance_data->'templateSnapshot'->'metadata'->>'name' as template_name
    FROM workout_sessions
    WHERE user_id = ${userId}
      AND completed_at IS NOT NULL
      ${query ? sql`AND (
        EXISTS (
          SELECT 1 FROM jsonb_path_query(
            performance_data, '$.templateSnapshot.exercises[*].name'
          ) AS j
          WHERE j #>> '{}' ILIKE ${'%' + query + '%'}
        )
        OR notes ILIKE ${searchPattern}
      )` : sql``}
      ${muscleGroup ? sql`AND EXISTS (
        SELECT 1 FROM jsonb_path_query(
          performance_data, '$.templateSnapshot.exercises[*].muscles[*]'
        ) AS j
        WHERE j #>> '{}' ILIKE ${'%' + muscleGroup + '%'}
      )` : sql``}
      ${equipment ? sql`AND EXISTS (
        SELECT 1 FROM jsonb_path_query(
          performance_data, '$.templateSnapshot.exercises[*].equipment[*]'
        ) AS j
        WHERE j #>> '{}' ILIKE ${'%' + equipment + '%'}
      )` : sql``}
    ORDER BY completed_at DESC
    LIMIT ${lim}
  `);

  return sessions;
}

async function getSearchAnalytics(userId: string, filters: {
  query?: string | null; muscleGroup?: string | null; equipment?: string | null;
}) {
  const { query, muscleGroup, equipment } = filters;

  const analytics = await db.execute(sql`
    SELECT
      'search_insights' as type,
      COUNT(DISTINCT ws.id) as total_sessions,
      COUNT(DISTINCT DATE(ws.completed_at)) as active_days,
      AVG(ws.total_volume) as avg_volume,
      SUM(ws.total_volume) as total_volume
    FROM workout_sessions ws
    WHERE ws.user_id = ${userId}
      AND ws.completed_at IS NOT NULL
      AND ws.completed_at >= NOW() - INTERVAL '90 days'
      ${query ? sql`AND (
        EXISTS (
          SELECT 1 FROM jsonb_path_query(
            ws.performance_data, '$.templateSnapshot.exercises[*].name'
          ) AS j
          WHERE j #>> '{}' ILIKE ${'%' + query + '%'}
        )
        OR ws.notes ILIKE ${'%' + query + '%'}
      )` : sql``}
      ${muscleGroup ? sql`AND EXISTS (
        SELECT 1 FROM jsonb_path_query(
          ws.performance_data, '$.templateSnapshot.exercises[*].muscles[*]'
        ) AS j
        WHERE j #>> '{}' ILIKE ${'%' + muscleGroup + '%'}
      )` : sql``}
      ${equipment ? sql`AND EXISTS (
        SELECT 1 FROM jsonb_path_query(
          ws.performance_data, '$.templateSnapshot.exercises[*].equipment[*]'
        ) AS j
        WHERE j #>> '{}' ILIKE ${'%' + equipment + '%'}
      )` : sql``}
  `);

  return analytics[0] || {};
}
