CREATE TABLE "agent_ingestion_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"source_message_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idempotency_key" text NOT NULL,
	"record_type" text NOT NULL,
	"record_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	CONSTRAINT "agent_ingestion_events_owner_id_idempotency_key_unique" UNIQUE("owner_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"source_message_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" text NOT NULL,
	"description" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "finance_transactions_amount_positive" CHECK ("finance_transactions"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"source_message_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meal_type" text NOT NULL,
	"food" text NOT NULL,
	"calories" integer,
	"protein_grams" numeric(10, 2),
	"carbs_grams" numeric(10, 2),
	"fat_grams" numeric(10, 2),
	"cost" numeric(18, 2),
	"logged_at" timestamp with time zone NOT NULL,
	CONSTRAINT "meal_logs_calories_positive" CHECK ("meal_logs"."calories" > 0),
	CONSTRAINT "meal_logs_protein_grams_positive" CHECK ("meal_logs"."protein_grams" > 0),
	CONSTRAINT "meal_logs_carbs_grams_positive" CHECK ("meal_logs"."carbs_grams" > 0),
	CONSTRAINT "meal_logs_fat_grams_positive" CHECK ("meal_logs"."fat_grams" > 0),
	CONSTRAINT "meal_logs_cost_positive" CHECK ("meal_logs"."cost" > 0)
);
--> statement-breakpoint
CREATE TABLE "running_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"source_message_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"distance_km" numeric(10, 3) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"run_type" text NOT NULL,
	"intensity" text,
	"logged_at" timestamp with time zone NOT NULL,
	CONSTRAINT "running_logs_distance_km_positive" CHECK ("running_logs"."distance_km" > 0),
	CONSTRAINT "running_logs_duration_minutes_positive" CHECK ("running_logs"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"source_message_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exercise" text NOT NULL,
	"sets" integer,
	"reps" integer,
	"duration_minutes" integer,
	"intensity" text,
	"logged_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workout_logs_sets_positive" CHECK ("workout_logs"."sets" > 0),
	CONSTRAINT "workout_logs_reps_positive" CHECK ("workout_logs"."reps" > 0),
	CONSTRAINT "workout_logs_duration_minutes_positive" CHECK ("workout_logs"."duration_minutes" > 0)
);
