import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";

const OWNER = "upgrade-owner";
const TABLES = ["finance_categories", "finance_budgets", "finance_goals", "finance_debts"] as const;

function migration0006Statements(): string[] {
  const file = path.resolve(process.cwd(), "drizzle", "0006_sync_existing_tables.sql");
  return readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

describe.skipIf(!integrationDbUrl())("migration 0006 on a database populated at 0005", () => {
  let t: TestDb | undefined;

  afterAll(async () => {
    if (t) await t.close();
  });

  it("keeps every existing row as it was, live, last edited at its last update", async () => {
    t = await createTestDb({ upToIdx: 5 });
    const { sql } = t;
    await insertUser(t.db, OWNER);
    const updated = "2026-09-01T10:00:00.000Z";

    await sql`INSERT INTO finance_categories (id, owner_id, name, type, icon, color, is_food, updated_at)
      VALUES ('cat-1', ${OWNER}, 'Food', 'EXPENSE', 'Folder', '#000000', true, ${updated})`;
    await sql`INSERT INTO finance_budgets (id, owner_id, category_id, amount, month, year, updated_at)
      VALUES ('bud-1', ${OWNER}, 'cat-1', 100, 1, 2026, ${updated})`;
    await sql`INSERT INTO finance_goals (id, owner_id, name, target_amount, saved_amount, target_date, icon, color, updated_at)
      VALUES ('goal-1', ${OWNER}, 'Trip', 5000, 1200, '2026-12-31', 'Plane', '#000000', ${updated})`;
    await sql`INSERT INTO finance_debts (id, owner_id, person, type, original_amount, remaining_amount, payments, updated_at)
      VALUES ('debt-1', ${OWNER}, 'Somchai', 'I_OWE', 300, 200, '[{"id":"p1","amount":100}]', ${updated})`;
    const before = Object.fromEntries(
      await Promise.all(TABLES.map(async (table) => [table, await sql`SELECT * FROM ${sql(table)}`] as const)),
    );

    await sql.begin(async (tx) => {
      for (const stmt of migration0006Statements()) await tx.unsafe(stmt);
    });

    for (const table of TABLES) {
      const rows = await sql`SELECT * FROM ${sql(table)}`;
      expect(rows).toHaveLength(1);
      const { edited_at, deleted_at, ...rest } = rows[0];
      expect(rest).toMatchObject(before[table][0]);
      expect(deleted_at).toBeNull();
      expect(new Date(edited_at).toISOString()).toBe(updated);
    }
  });
});
