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
    weightGoal: doublePrecision('weight_goal'),
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
    workoutTemplateId: text('workout_template_id').notNull().references(() => workoutTemplates.id),
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

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  workoutTemplates: many(workoutTemplates),
  workoutSessions: many(workoutSessions),
  userStats: one(userStats),
  monthlyStats: many(monthlyStats),
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
