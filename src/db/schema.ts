import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const identityAndAuditColumns = {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  source: text("source").notNull(),
  sourceMessageId: text("source_message_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const financeTransactions = pgTable(
  "finance_transactions",
  {
    ...identityAndAuditColumns,
    transactionType: text("transaction_type").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    description: text("description").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("finance_transactions_amount_positive", sql`${table.amount} > 0`),
  ],
);

export const mealLogs = pgTable(
  "meal_logs",
  {
    ...identityAndAuditColumns,
    mealType: text("meal_type").notNull(),
    food: text("food").notNull(),
    calories: integer("calories"),
    proteinGrams: numeric("protein_grams", { precision: 10, scale: 2 }),
    carbsGrams: numeric("carbs_grams", { precision: 10, scale: 2 }),
    fatGrams: numeric("fat_grams", { precision: 10, scale: 2 }),
    cost: numeric("cost", { precision: 18, scale: 2 }),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("meal_logs_calories_nonnegative", sql`${table.calories} >= 0`),
    check("meal_logs_protein_grams_nonnegative", sql`${table.proteinGrams} >= 0`),
    check("meal_logs_carbs_grams_nonnegative", sql`${table.carbsGrams} >= 0`),
    check("meal_logs_fat_grams_nonnegative", sql`${table.fatGrams} >= 0`),
    check("meal_logs_cost_nonnegative", sql`${table.cost} >= 0`),
  ],
);

export const workoutLogs = pgTable(
  "workout_logs",
  {
    ...identityAndAuditColumns,
    exercise: text("exercise").notNull(),
    sets: integer("sets"),
    reps: integer("reps"),
    durationMinutes: integer("duration_minutes"),
    intensity: text("intensity"),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("workout_logs_sets_positive", sql`${table.sets} > 0`),
    check("workout_logs_reps_positive", sql`${table.reps} > 0`),
    check(
      "workout_logs_duration_minutes_positive",
      sql`${table.durationMinutes} > 0`,
    ),
  ],
);

export const runningLogs = pgTable(
  "running_logs",
  {
    ...identityAndAuditColumns,
    distanceKm: numeric("distance_km", { precision: 10, scale: 3 }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    runType: text("run_type").notNull(),
    intensity: text("intensity"),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("running_logs_distance_km_positive", sql`${table.distanceKm} > 0`),
    check(
      "running_logs_duration_minutes_positive",
      sql`${table.durationMinutes} > 0`,
    ),
  ],
);

export const agentIngestionEvents = pgTable(
  "agent_ingestion_events",
  {
    ...identityAndAuditColumns,
    idempotencyKey: text("idempotency_key").notNull(),
    recordType: text("record_type").notNull(),
    recordId: uuid("record_id").notNull(),
    payload: jsonb("payload").notNull(),
  },
  (table) => [
    unique("agent_ingestion_events_owner_id_idempotency_key_unique").on(
      table.ownerId,
      table.idempotencyKey,
    ),
  ],
);

export const schema = {
  financeTransactions,
  mealLogs,
  workoutLogs,
  runningLogs,
  agentIngestionEvents,
};
