import { describe, expect, it } from "vitest";

import { createTestDb, insertUser, integrationDbUrl } from "./pgTestDb";

describe.skipIf(!integrationDbUrl())("createTestDb serialization (real Postgres)", () => {
  it("does not wipe the database until the previous holder closes", async () => {
    const first = await createTestDb();
    await insertUser(first.db, "lock-holder");

    let secondReady = false;
    const secondPromise = createTestDb().then((db) => {
      secondReady = true;
      return db;
    });

    // While `first` is open the second call must be parked on the lock,
    // so first's data survives.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(secondReady).toBe(false);
    const rows = await first.sql`SELECT id FROM "user" WHERE id = 'lock-holder'`;
    expect(rows).toHaveLength(1);

    await first.close();
    const second = await secondPromise;
    try {
      const after = await second.sql`SELECT id FROM "user"`;
      expect(after).toHaveLength(0);
    } finally {
      await second.close();
    }
  });

  it("close() is idempotent", async () => {
    const t = await createTestDb();
    await Promise.all([t.close(), t.close()]);
    await t.close();
  });
});
