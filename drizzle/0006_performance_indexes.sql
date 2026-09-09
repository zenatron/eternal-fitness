-- Performance indexes for workout_sessions.
--
-- NOTE: `drizzle/meta/` is not tracked in this repo, so `drizzle-kit generate`
-- cannot produce incremental migrations from a clean checkout — this file is
-- hand-written (and idempotent, so it is safe to re-run). The same indexes are
-- declared in src/lib/db/schema.ts for `db:push` environments. Apply with:
--   psql "$DATABASE_URL" -f drizzle/0006_performance_indexes.sql
--
-- A GIN index on performance_data was considered and deliberately skipped:
-- every JSONB predicate in the app uses jsonb_path_exists(... like_regex ...),
-- which no GIN operator class accelerates (only `@>` containment is
-- index-backed, and nothing queries that way today). It would add write
-- amplification for zero read benefit.

CREATE INDEX IF NOT EXISTS "workout_sessions_user_completed_idx"
  ON "workout_sessions" USING btree ("user_id", "completed_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_sessions_user_scheduled_idx"
  ON "workout_sessions" USING btree ("user_id", "scheduled_at")
  WHERE "completed_at" IS NULL;
