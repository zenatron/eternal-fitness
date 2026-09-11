-- Leaderboard and search-support indexes.
--
-- Hand-written and idempotent like 0006 (see its note about drizzle/meta).
--
-- users.points backs the leaderboard's ORDER BY points DESC LIMIT 50.
-- pg_trgm GIN indexes accelerate the ILIKE '%q%' patterns in /api/search
-- (template name/description, session notes); the JSONB exercise-name
-- predicates remain unindexed — see the note in 0006.

CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_points_idx"
  ON "users" USING btree ("points" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_templates_name_trgm_idx"
  ON "workout_templates" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_sessions_notes_trgm_idx"
  ON "workout_sessions" USING gin ("notes" gin_trgm_ops);
