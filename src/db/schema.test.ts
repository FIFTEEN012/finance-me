import { getTableName } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  agentIngestionEvents,
  financeTransactions,
  mealLogs,
  runningLogs,
  workoutLogs,
} from "./schema";

const tables = [
  financeTransactions,
  mealLogs,
  workoutLogs,
  runningLogs,
  agentIngestionEvents,
];

const expectedTableNames = [
  "finance_transactions",
  "meal_logs",
  "workout_logs",
  "running_logs",
  "agent_ingestion_events",
];

function columnNames(table: (typeof tables)[number]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

describe("local PostgreSQL schema contract", () => {
  it("defines all normalized ingestion tables", () => {
    expect(tables.map(getTableName)).toEqual(expectedTableNames);
  });

  it.each(tables)("gives $name a UUID primary key and audit columns", (table) => {
    const config = getTableConfig(table);
    const id = config.columns.find((column) => column.name === "id");

    expect(id?.getSQLType()).toBe("uuid");
    expect(id?.primary).toBe(true);
    expect(id?.hasDefault).toBe(true);
    expect(columnNames(table)).toEqual(
      expect.arrayContaining([
        "owner_id",
        "source",
        "source_message_id",
        "created_at",
        "updated_at",
      ]),
    );
  });

  it("enforces owner-scoped ingestion idempotency", () => {
    const config = getTableConfig(agentIngestionEvents);
    const unique = config.uniqueConstraints.find(
      (constraint) => constraint.name === "agent_ingestion_events_owner_id_idempotency_key_unique",
    );

    expect(unique?.columns.map((column) => column.name)).toEqual([
      "owner_id",
      "idempotency_key",
    ]);
  });

  it("defines positive-value checks for applicable measurements", () => {
    const checks = tables.flatMap((table) =>
      getTableConfig(table).checks.map((check) => check.name),
    );

    expect(checks).toEqual(
      expect.arrayContaining([
        "finance_transactions_amount_positive",
        "meal_logs_calories_nonnegative",
        "meal_logs_protein_grams_nonnegative",
        "meal_logs_carbs_grams_nonnegative",
        "meal_logs_fat_grams_nonnegative",
        "meal_logs_cost_nonnegative",
        "workout_logs_sets_positive",
        "workout_logs_reps_positive",
        "workout_logs_duration_minutes_positive",
        "running_logs_distance_km_positive",
        "running_logs_duration_minutes_positive",
      ]),
    );
  });

  it("allows zero meal measurements while rejecting negative values", () => {
    const dialect = new PgDialect();
    const mealCheckSql = getTableConfig(mealLogs).checks.map((constraint) =>
      dialect.sqlToQuery(constraint.value).sql,
    );

    expect(mealCheckSql).toHaveLength(5);
    mealCheckSql.forEach((constraintSql) => {
      expect(constraintSql).toContain(">= 0");
      expect(constraintSql).not.toMatch(/(^|[^>])> 0/);
    });
  });
});
