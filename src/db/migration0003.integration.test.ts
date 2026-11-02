import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";

const TABLES = [
  "finance_categories",
  "finance_budgets",
  "finance_goals",
  "finance_debts",
  "finance_transactions",
] as const;

const OWNER = "upgrade-owner";
const TX_ID = "22222222-2222-4222-8222-222222222222";

function migration0003Statements(): string[] {
  const file = path.resolve(process.cwd(), "drizzle", "0003_multi_user_composite_pk.sql");
  return readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

describe.skipIf(!integrationDbUrl())("migration 0003 on a database populated at 0002", () => {
  let t: TestDb | undefined;

  afterAll(async () => {
    if (t) await t.close();
  });

  it("keeps existing rows and re-keys all five tables by (owner_id, id)", async () => {
    t = await createTestDb({ upToIdx: 2 });
    const { sql } = t;
    await insertUser(t.db, OWNER);

    await sql`INSERT INTO finance_categories (id, owner_id, name, type, icon, color)
      VALUES ('cat-1', ${OWNER}, 'Food', 'EXPENSE', 'Folder', '#000000')`;
    await sql`INSERT INTO finance_budgets (id, owner_id, category_id, amount, month, year)
      VALUES ('bud-1', ${OWNER}, 'cat-1', 100, 1, 2026)`;
    await sql`INSERT INTO finance_goals (id, owner_id, name, target_amount, target_date, icon, color)
      VALUES ('goal-1', ${OWNER}, 'Trip', 5000, '2026-12-31', 'Folder', '#000000')`;
    await sql`INSERT INTO finance_debts (id, owner_id, person, type, original_amount, remaining_amount)
      VALUES ('debt-1', ${OWNER}, 'Somchai', 'LEND', 300, 300)`;
    await sql`INSERT INTO finance_transactions
        (id, owner_id, source, source_message_id, transaction_type, amount, description)
      VALUES (${TX_ID}, ${OWNER}, 'app', 'm-1', 'EXPENSE', 50, 'Lunch')`;

    await sql.begin(async (tx) => {
      for (const stmt of migration0003Statements()) await tx.unsafe(stmt);
    });

    for (const table of TABLES) {
      const [{ n }] = await sql<{ n: number }[]>`
        SELECT count(*)::int AS n FROM ${sql(table)} WHERE owner_id = ${OWNER}`;
      expect(n, table).toBe(1);

      const pk = await sql<{ name: string; columns: string[] }[]>`
        SELECT c.conname AS name,
               array_agg(a.attname::text ORDER BY k.ord) AS columns
        FROM pg_constraint c
        CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
        WHERE c.conrelid = ${`public.${table}`}::regclass AND c.contype = 'p'
        GROUP BY c.conname`;
      expect(pk, table).toEqual([{ name: `${table}_owner_id_id_pk`, columns: ["owner_id", "id"] }]);
    }
  });
});
