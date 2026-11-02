import { getTableName } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  agentIngestionEvents,
  financeBudgets,
  financeCategories,
  financeDebts,
  financeGoals,
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

const ownerScopedTables = [
  financeCategories,
  financeBudgets,
  financeGoals,
  financeDebts,
  financeTransactions,
];

const singleIdKeyTables = [mealLogs, workoutLogs, runningLogs, agentIngestionEvents];

function columnNames(table: (typeof tables)[number]) {
  return getTableConfig(table).columns.map((column) => column.name);
}

describe("local PostgreSQL schema contract", () => {
  it("defines all normalized ingestion tables", () => {
    expect(tables.map(getTableName)).toEqual(expectedTableNames);
  });

  it.each(tables.map((table) => [getTableName(table), table] as const))(
    "gives %s a defaulted UUID id and audit columns",
    (_name, table) => {
      const config = getTableConfig(table);
      const id = config.columns.find((column) => column.name === "id");

      expect(id?.getSQLType()).toBe("uuid");
      expect(id?.notNull).toBe(true);
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
    },
  );

  it.each(ownerScopedTables.map((table) => [getTableName(table), table] as const))(
    "keys %s by (owner_id, id)",
    (_name, table) => {
      const config = getTableConfig(table);

      expect(config.primaryKeys).toHaveLength(1);
      expect(config.primaryKeys[0].columns.map((c) => c.name)).toEqual(["owner_id", "id"]);
      expect(config.columns.find((column) => column.name === "id")?.primary).toBe(false);
    },
  );

  it.each(singleIdKeyTables.map((table) => [getTableName(table), table] as const))(
    "keeps a single-column id primary key on %s",
    (_name, table) => {
      const config = getTableConfig(table);

      expect(config.primaryKeys).toHaveLength(0);
      expect(config.columns.filter((column) => column.primary).map((c) => c.name)).toEqual(["id"]);
    },
  );

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
