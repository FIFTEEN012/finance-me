import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export * from "./auth-schema";
import { user } from "./auth-schema";

const identityAndAuditColumns = {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  source: text("source").notNull(),
  sourceMessageId: text("source_message_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

/**
 * Sync columns of the tables synced as record kinds (ADR-0003), same meaning
 * as in `user_records`: `edited_at` is the editing device's clock and decides
 * last-edit-wins; `deleted_at` marks a tombstone (the row stays, so no device
 * can upload the record again). Each table's `updated_at` is the server's
 * receive time, bumped on every write, and is what pulls page by.
 */
const syncColumns = {
  editedAt: timestamp("edited_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
};

/* ─── Household Sharing (Couple / Family) ─── */
export const households = pgTable("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const householdMembers = pgTable("household_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─── Financial Transactions ─── */
export const financeTransactions = pgTable(
  "finance_transactions",
  {
    ...identityAndAuditColumns,
    // Keyed by (owner_id, id) below, so the shared id column is not the PK here.
    id: uuid("id").defaultRandom().notNull(),
    transactionType: text("transaction_type").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    currency: text("currency").default("THB").notNull(),
    description: text("description").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    // Extended fields for frontend app
    categoryId: text("category_id"),
    note: text("note"),
    tags: jsonb("tags"),
    transferKind: text("transfer_kind"),
    linkedInvestmentOrderId: text("linked_investment_order_id"),
    householdId: uuid("household_id"),
    date: text("date"),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.id] }),
    check("finance_transactions_amount_positive", sql`${table.amount} > 0`),
  ],
);

/* ─── Categories ─── */
export const financeCategories = pgTable(
  "finance_categories",
  {
    id: text("id").notNull(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    householdId: uuid("household_id"),
    name: text("name").notNull(),
    type: text("type").notNull(),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    // Food Category flag; NULL = never set (default "อาหาร" then counts as food).
    isFood: boolean("is_food"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ...syncColumns,
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.id] }),
    index("finance_categories_owner_id_updated_at_idx").on(table.ownerId, table.updatedAt),
  ],
);

/* ─── Budgets ─── */
export const financeBudgets = pgTable(
  "finance_budgets",
  {
    id: text("id").notNull(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    householdId: uuid("household_id"),
    categoryId: text("category_id").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    month: integer("month").notNull(),
    year: integer("year").notNull(),
    allowRollover: boolean("allow_rollover").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ...syncColumns,
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.id] }),
    index("finance_budgets_owner_id_updated_at_idx").on(table.ownerId, table.updatedAt),
  ],
);

/* ─── Goals ─── */
export const financeGoals = pgTable(
  "finance_goals",
  {
    id: text("id").notNull(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    householdId: uuid("household_id"),
    name: text("name").notNull(),
    targetAmount: numeric("target_amount", { precision: 18, scale: 2 }).notNull(),
    savedAmount: numeric("saved_amount", { precision: 18, scale: 2 }).default("0").notNull(),
    targetDate: text("target_date").notNull(),
    description: text("description"),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    // Percentages whose celebration was already shown, e.g. [25, 50].
    milestonesCelebrated: jsonb("milestones_celebrated"),
    // Saved amount follows the investment portfolio value.
    linkedPortfolio: boolean("linked_portfolio"),
    // The goal's own createdAt (taken from the synced record).
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ...syncColumns,
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.id] }),
    index("finance_goals_owner_id_updated_at_idx").on(table.ownerId, table.updatedAt),
  ],
);

/* ─── Debts ─── */
export const financeDebts = pgTable(
  "finance_debts",
  {
    id: text("id").notNull(),
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    householdId: uuid("household_id"),
    person: text("person").notNull(),
    type: text("type").notNull(),
    originalAmount: numeric("original_amount", { precision: 18, scale: 2 }).notNull(),
    remainingAmount: numeric("remaining_amount", { precision: 18, scale: 2 }).notNull(),
    dueDate: text("due_date"),
    note: text("note"),
    status: text("status").default("ACTIVE").notNull(),
    payments: jsonb("payments").default([]).notNull(),
    // App-only fields; NULL on rows saved before sync (the app falls back).
    category: text("category"),
    color: text("color"),
    startDate: text("start_date"),
    initialTransactionId: text("initial_transaction_id"),
    // The debt's own createdAt (taken from the synced record).
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ...syncColumns,
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.id] }),
    index("finance_debts_owner_id_updated_at_idx").on(table.ownerId, table.updatedAt),
  ],
);

/* ─── Settings ─── */
export const financeSettings = pgTable("finance_settings", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  paydayDate: integer("payday_date").default(25).notNull(),
  cycleStartDay: integer("cycle_start_day").default(1).notNull(),
  currency: text("currency").default("THB").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─── Legacy / Agent Ingestion Tables (preserves existing tests) ─── */
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

/* ─── User Records (ADR-0003) ───
 * One row per record of every User Data kind that has no table of its own
 * (supply, food-entry, …). `data` is the whole client record; a delete keeps
 * the row as a tombstone (`deleted_at` set, `data` null). `edited_at` is the
 * editing device's clock and decides last-edit-wins; `updated_at` is the
 * server's receive time and is what pulls page by. */
export const userRecords = pgTable(
  "user_records",
  {
    ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    data: jsonb("data"),
    editedAt: timestamp("edited_at", { withTimezone: true, mode: "date" }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.kind, table.id] }),
    index("user_records_owner_id_updated_at_idx").on(table.ownerId, table.updatedAt),
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
  user,
  households,
  householdMembers,
  financeTransactions,
  financeCategories,
  financeBudgets,
  financeGoals,
  financeDebts,
  financeSettings,
  mealLogs,
  workoutLogs,
  runningLogs,
  agentIngestionEvents,
  userRecords,
};
