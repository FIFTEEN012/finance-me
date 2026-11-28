import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";

const OWNER = "upgrade-owner";

function migration0007Statements(): string[] {
  const file = path.resolve(process.cwd(), "drizzle", "0007_sync_transactions.sql");
  return readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

describe.skipIf(!integrationDbUrl())("migration 0007 on a database populated at 0006", () => {
  let t: TestDb | undefined;

  afterAll(async () => {
    if (t) await t.close();
  });

  it("keeps every existing transaction as it was, live, last edited at its last update", async () => {
    t = await createTestDb({ upToIdx: 6 });
    const { sql } = t;
    await insertUser(t.db, OWNER);
    const updated = "2026-09-01T10:00:00.000Z";

    await sql`INSERT INTO finance_transactions
        (id, owner_id, source, source_message_id, transaction_type, amount, description, category_id, date, updated_at)
      VALUES ('77777777-7777-4777-8777-777777777777', ${OWNER}, 'app', 'direct', 'EXPENSE', 120, 'ข้าว', 'cat-expense-1', '2026-09-01', ${updated})`;
    await sql`INSERT INTO finance_transactions
        (id, owner_id, source, source_message_id, transaction_type, amount, description, updated_at)
      VALUES ('88888888-8888-4888-8888-888888888888', ${OWNER}, 'hermes-discord', 'msg-1', 'EXPENSE', 50, 'กาแฟ', ${updated})`;
    const before = await sql`SELECT * FROM finance_transactions ORDER BY id`;

    await sql.begin(async (tx) => {
      for (const stmt of migration0007Statements()) await tx.unsafe(stmt);
    });

    const rows = await sql`SELECT * FROM finance_transactions ORDER BY id`;
    expect(rows).toHaveLength(2);
    rows.forEach((row, i) => {
      const { edited_at, deleted_at, ...rest } = row;
      expect(rest).toMatchObject(before[i]);
      expect(deleted_at).toBeNull();
      expect(new Date(edited_at).toISOString()).toBe(updated);
    });
  });
});
