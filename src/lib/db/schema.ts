import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { WorkoutTemplateData, WorkoutSessionData, ActiveWorkoutSessionData } from '@/types/workout';
import type { UserPersonalRecords } from '@/types/personalRecords';
import type { UserAchievements } from '@/types/achievements';
import type { DashboardConfig } from '@/types/dashboard-config';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    age: integer('age'),
    gender: text('gender'),
    height: doublePrecision('height'),
    weight: doublePrecision('weight'),
    useMetric: boolean('use_metric').notNull().default(false),
    points: integer('points').notNull().default(0),
    dashboardConfig: jsonb('dashboard_config').$type<DashboardConfig>(),
    /**
     * Accent theme id (see types/theme.ts). Nullable rather than defaulted so
     * "never chose one" is distinguishable from "deliberately chose Forge" —
     * the provider needs that to decide whether to adopt this device's local
     * choice or the account's.
     */
    accentTheme: text('accent_theme'),
    weightGoal: doublePrecision('weight_goal'),
    /**
     * Picture URL from the OIDC `picture` claim, used when the user has not
     * uploaded their own. Refreshed on each sign-in.
     */
    image: text('image'),
    /**
     * Custom avatar, overriding `image`. Stored as bytes rather than on disk so
     * it survives container restarts, needs no extra volume, and is included in
     * an ordinary database dump. A 256px lossy WebP is ~10-20KB, so the row
     * stays small.
     */
    avatarData: text('avatar_data'),
    avatarUpdatedAt: timestamp('avatar_updated_at', { withTimezone: true }),
    /**
     * Weight recorded when the current goal was set — the baseline progress is
     * measured from. Without it, "progress toward goal" is not computable: a
     * bare current/goal ratio rises as a weight-loss user moves *away* from
     * target. Captured automatically when a goal is first set or changed.
     */
    startingWeight: doublePrecision('starting_weight'),
    /**
     * IANA timezone name (e.g. `America/New_York`), reported by the browser and
     * refreshed whenever it changes.
     *
     * Streaks, monthly totals and the activity grid are all "which calendar day
     * was this?" questions, and they are answered on the server — inside a
     * container that runs in UTC. Without this column the server had no choice
     * but to bucket by UTC, so an evening workout anywhere in the Americas
     * counted toward the *following* day, and one finished on the last evening
     * of a month landed in the next month's totals.
     *
     * Nullable because it can only be learned from a client: rows predating this
     * column, and any user who has not opened the app since, fall back to UTC —
     * exactly the behaviour they had before.
     */
    timeZone: text('time_zone'),
  },
);

export const workoutTemplates = pgTable(
  'workout_templates',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    name: text('name').notNull(),
    description: text('description'),
    favorite: boolean('favorite').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    workoutData: jsonb('workout_data').$type<WorkoutTemplateData>(),
    totalVolume: doublePrecision('total_volume').notNull().default(0),
    estimatedDuration: integer('estimated_duration').notNull().default(0),
    exerciseCount: integer('exercise_count').notNull().default(0),
    difficulty: text('difficulty').notNull().default('intermediate'),
    workoutType: text('workout_type').notNull().default('strength'),
    tags: text('tags').array().notNull().default([]),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('workout_templates_user_id_idx').on(table.userId),
    index('workout_templates_workout_type_idx').on(table.workoutType),
    index('workout_templates_difficulty_idx').on(table.difficulty),
    index('workout_templates_favorite_idx').on(table.favorite),
  ],
);

export const workoutSessions = pgTable(
  'workout_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    // NOTE: stored in SECONDS. Every writer must store seconds and every reader
    // must divide by 3600 for hours. See scripts/reset-training-hours.ts for the
    // historical units fix.
    duration: integer('duration'),
    notes: text('notes'),
    totalVolume: doublePrecision('total_volume').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    performanceData: jsonb('performance_data').$type<WorkoutSessionData>(),
    totalSets: integer('total_sets').notNull().default(0),
    totalExercises: integer('total_exercises').notNull().default(0),
    personalRecords: jsonb('personal_records'),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workoutTemplateId: text('workout_template_id').references(() => workoutTemplates.id),
  },
  (table) => [
    index('workout_sessions_user_id_idx').on(table.userId),
    index('workout_sessions_completed_at_idx').on(table.completedAt),
    index('workout_sessions_workout_template_id_idx').on(table.workoutTemplateId),
  ],
);

export const userStats = pgTable(
  'user_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique().references(() => users.id),
    totalWorkouts: integer('total_workouts').notNull().default(0),
    totalSets: integer('total_sets').notNull().default(0),
    totalExercises: integer('total_exercises').notNull().default(0),
    totalVolume: doublePrecision('total_volume').notNull().default(0),
    totalTrainingHours: doublePrecision('total_training_hours').notNull().default(0),
    currentStreak: integer('current_streak').notNull().default(0),
    longestStreak: integer('longest_streak').notNull().default(0),
    lastWorkoutAt: timestamp('last_workout_at', { withTimezone: true }),
    activeWeeks: integer('active_weeks').notNull().default(0),
    personalRecords: jsonb('personal_records').$type<UserPersonalRecords>(),
    achievements: jsonb('achievements').$type<UserAchievements>(),
    uniqueExercises: integer('unique_exercises').notNull().default(0),
    activeWorkoutId: text('active_workout_id'),
    activeWorkoutData: jsonb('active_workout_data').$type<ActiveWorkoutSessionData>(),
    activeWorkoutStartedAt: timestamp('active_workout_started_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
);

export const monthlyStats = pgTable(
  'monthly_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => users.id),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    workoutsCount: integer('workouts_count').notNull().default(0),
    volume: doublePrecision('volume').notNull().default(0),
    trainingHours: doublePrecision('training_hours').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    unique('monthly_stats_user_year_month').on(table.userId, table.year, table.month),
  ],
);

/**
 * Dedupe record for offline-replayed writes.
 *
 * A workout completed with no signal is queued in the client's outbox and
 * retried later; a request that timed out may also have succeeded server-side.
 * Both cases can deliver the same completion twice. The client sends a stable
 * Idempotency-Key, we record it here alongside the original response, and a
 * repeat replays that response instead of logging a second workout.
 */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    /** The original success payload, replayed verbatim on a repeat. */
    response: jsonb('response'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Scoped per user so one person's key cannot collide with another's.
    unique('idempotency_keys_user_key').on(table.userId, table.key),
    index('idempotency_keys_created_at_idx').on(table.createdAt),
  ],
);

/**
 * Web Push endpoints, one row per browser/device. Subscriptions expire and get
 * rotated by the browser, so rows are replaced on conflict and deleted when the
 * push service reports them gone (404/410).
 */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    /** Push service URL — unique per device, so it is the natural key. */
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [index('push_subscriptions_user_id_idx').on(table.userId)],
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  workoutTemplates: many(workoutTemplates),
  workoutSessions: many(workoutSessions),
  userStats: one(userStats),
  monthlyStats: many(monthlyStats),
  pushSubscriptions: many(pushSubscriptions),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export const workoutTemplatesRelations = relations(workoutTemplates, ({ one, many }) => ({
  user: one(users, { fields: [workoutTemplates.userId], references: [users.id] }),
  sessions: many(workoutSessions),
}));

export const workoutSessionsRelations = relations(workoutSessions, ({ one }) => ({
  user: one(users, { fields: [workoutSessions.userId], references: [users.id] }),
  workoutTemplate: one(workoutTemplates, { fields: [workoutSessions.workoutTemplateId], references: [workoutTemplates.id] }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, { fields: [userStats.userId], references: [users.id] }),
}));

export const monthlyStatsRelations = relations(monthlyStats, ({ one }) => ({
  user: one(users, { fields: [monthlyStats.userId], references: [users.id] }),
}));

// cuid generator
function createId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${randomPart}`;
}
