CREATE TABLE "monthly_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"workouts_count" integer DEFAULT 0 NOT NULL,
	"volume" double precision DEFAULT 0 NOT NULL,
	"training_hours" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_stats_user_year_month" UNIQUE("user_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "user_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"total_workouts" integer DEFAULT 0 NOT NULL,
	"total_sets" integer DEFAULT 0 NOT NULL,
	"total_exercises" integer DEFAULT 0 NOT NULL,
	"total_volume" double precision DEFAULT 0 NOT NULL,
	"total_training_hours" double precision DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_workout_at" timestamp with time zone,
	"active_weeks" integer DEFAULT 0 NOT NULL,
	"personal_records" jsonb,
	"achievements" jsonb,
	"unique_exercises" integer DEFAULT 0 NOT NULL,
	"active_workout_id" text,
	"active_workout_data" jsonb,
	"active_workout_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"age" integer,
	"gender" text,
	"height" double precision,
	"weight" double precision,
	"use_metric" boolean DEFAULT false NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"dashboard_config" jsonb,
	"weight_goal" double precision,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"completed_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"duration" integer,
	"notes" text,
	"total_volume" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"performance_data" jsonb,
	"total_sets" integer DEFAULT 0 NOT NULL,
	"total_exercises" integer DEFAULT 0 NOT NULL,
	"personal_records" jsonb,
	"user_id" text NOT NULL,
	"workout_template_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workout_data" jsonb,
	"total_volume" double precision DEFAULT 0 NOT NULL,
	"estimated_duration" integer DEFAULT 0 NOT NULL,
	"exercise_count" integer DEFAULT 0 NOT NULL,
	"difficulty" text DEFAULT 'intermediate' NOT NULL,
	"workout_type" text DEFAULT 'strength' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monthly_stats" ADD CONSTRAINT "monthly_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_sessions_user_id_idx" ON "workout_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_completed_at_idx" ON "workout_sessions" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "workout_sessions_workout_template_id_idx" ON "workout_sessions" USING btree ("workout_template_id");--> statement-breakpoint
CREATE INDEX "workout_templates_user_id_idx" ON "workout_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_templates_workout_type_idx" ON "workout_templates" USING btree ("workout_type");--> statement-breakpoint
CREATE INDEX "workout_templates_difficulty_idx" ON "workout_templates" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "workout_templates_favorite_idx" ON "workout_templates" USING btree ("favorite");