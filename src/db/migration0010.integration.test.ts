import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";

const RESET_USER = "user-who-reset";

function migration0010Statements(): string[] {
  const file = path.resolve(process.cwd(), "drizzle", "0010_sync_reset_generation.sql");
  return readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

describe.skipIf(!integrationDbUrl())("migration 0010 on a database populated at 0009", () => {
  let t: TestDb | undefined;

  afterAll(async () => {
    if (t) await t.close();
  });

  it("counts a user's earlier Reset as generation 1 and keeps when it ran", async () => {
    t = await createTestDb({ upToIdx: 9 });
    const { sql } = t;
    await insertUser(t.db, RESET_USER);
    const resetAt = "2026-11-20T08:00:00.000Z";
    await sql`INSERT INTO sync_resets (owner_id, reset_at) VALUES (${RESET_USER}, ${resetAt})`;

    await sql.begin(async (tx) => {
      for (const stmt of migration0010Statements()) await tx.unsafe(stmt);
    });

    const rows = await sql`SELECT * FROM sync_resets`;
    expect(rows).toHaveLength(1);
    expect(rows[0].generation).toBe(1);
    expect(new Date(rows[0].reset_at).toISOString()).toBe(resetAt);
  });
});
