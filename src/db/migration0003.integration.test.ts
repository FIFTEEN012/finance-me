import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { defaultCategories } from "@/lib/defaultCategories";
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

    const [kept] = await sql<{ name: string }[]>`
      SELECT name FROM finance_categories WHERE owner_id = ${OWNER} AND id = 'cat-1'`;
    expect(kept.name).toBe("Food");

    for (const table of TABLES) {
      const [{ n }] = await sql<{ n: number }[]>`
        SELECT count(*)::int AS n FROM ${sql(table)} WHERE owner_id = ${OWNER}`;
      // The backfill adds the 14 defaults for the owner on top of the one pre-existing category.
      expect(n, table).toBe(table === "finance_categories" ? 1 + defaultCategories.length : 1);

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

type CategoryRow = { id: string; name: string; type: string; icon: string; color: string };

describe.skipIf(!integrationDbUrl())("migration 0003 default-category backfill", () => {
  let t: TestDb | undefined;
  const expected: CategoryRow[] = defaultCategories
    .map(({ id, name, type, icon, color }) => ({ id, name, type, icon, color }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const CUSTOM_NAME = "อาหารของฉัน";
  // A holds every default (one customised), B/C hold nothing, D holds only a custom category.
  // Before 0003 the PK is (id) alone, so two owners cannot hold the same default id; this is
  // the production collision the backfill repairs.
  const USERS = { A: "bf-user-a", B: "bf-user-b", C: "bf-user-c", D: "bf-user-d" };

  async function snapshot(sql: TestDb["sql"]) {
    return sql<(CategoryRow & { owner_id: string; is_default: boolean })[]>`
      SELECT owner_id, id, name, type, icon, color, is_default
      FROM finance_categories ORDER BY owner_id, id`;
  }

  async function defaultsOf(sql: TestDb["sql"], owner: string): Promise<CategoryRow[]> {
    return sql<CategoryRow[]>`
      SELECT id, name, type, icon, color FROM finance_categories
      WHERE owner_id = ${owner} AND is_default ORDER BY id`;
  }

  beforeAll(async () => {
    t = await createTestDb({ upToIdx: 2 });
    const { db, sql } = t;
    for (const id of Object.values(USERS)) await insertUser(db, id);

    for (const c of defaultCategories) {
      const name = c.id === "cat-expense-1" ? CUSTOM_NAME : c.name;
      await sql`INSERT INTO finance_categories (id, owner_id, name, type, icon, color, is_default)
        VALUES (${c.id}, ${USERS.A}, ${name}, ${c.type}, ${c.icon}, ${c.color}, true)`;
    }
    await sql`INSERT INTO finance_categories (id, owner_id, name, type, icon, color)
      VALUES ('cat-d-custom', ${USERS.D}, 'ของฉัน', 'EXPENSE', 'Folder', '#123456')`;

    await sql.begin(async (tx) => {
      for (const stmt of migration0003Statements()) await tx.unsafe(stmt);
    });
  });

  afterAll(async () => {
    if (t) await t.close();
  });

  it("gives every existing user the 14 default categories", async () => {
    expect(defaultCategories).toHaveLength(14);
    const { sql } = t!;
    for (const [label, owner] of Object.entries(USERS)) {
      const rows = await defaultsOf(sql, owner);
      if (label === "A") {
        expect(rows.filter((r) => r.id !== "cat-expense-1"), label).toEqual(
          expected.filter((r) => r.id !== "cat-expense-1"),
        );
      } else {
        expect(rows, label).toEqual(expected);
      }
    }
    const [{ n }] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM finance_categories WHERE owner_id = ${USERS.D}`;
    expect(n).toBe(15);
  });

  it("keeps a customised default", async () => {
    const { sql } = t!;
    const [row] = await sql<{ name: string }[]>`
      SELECT name FROM finance_categories WHERE owner_id = ${USERS.A} AND id = 'cat-expense-1'`;
    expect(row.name).toBe(CUSTOM_NAME);
  });

  it("is idempotent", async () => {
    const { sql } = t!;
    const last = migration0003Statements().at(-1)!;
    expect(last.startsWith('INSERT INTO "finance_categories"')).toBe(true);

    const before = await snapshot(sql);
    await sql.unsafe(last);
    const after = await snapshot(sql);
    expect(after).toEqual(before);
    expect(after).toHaveLength(14 * 4 + 1);
  });
});
