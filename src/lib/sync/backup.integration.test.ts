import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const holder = vi.hoisted(() => ({
  db: undefined as unknown,
  currentUserId: null as string | null,
}));

vi.mock("@/db/client", () => ({
  getDatabase: () => holder.db,
}));

vi.mock("@/lib/server-auth", () => ({
  getCurrentUser: async () =>
    holder.currentUserId
      ? {
          id: holder.currentUserId,
          email: `${holder.currentUserId}@example.test`,
          name: holder.currentUserId,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : null,
}));

import * as changesRoute from "@/app/api/sync/changes/route";
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";
import { createDevice, type Device, type DeviceNetwork } from "@/test/syncDevices";
import { readBackupStores, restoreBackup } from "@/lib/sync/backup";

const ALICE = "user-alice";
const KEY = "finance-supplies";

const network: DeviceNetwork = {
  route: changesRoute,
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

const soap = { id: "11111111-1111-4111-8111-111111111111", name: "สบู่", startDate: "2026-11-01" };
const rice = { id: "22222222-2222-4222-8222-222222222222", name: "ข้าวสาร", startDate: "2026-11-02" };
const tea = { id: "33333333-3333-4333-8333-333333333333", name: "ชา", startDate: "2026-11-03" };

/** Imports a backup on `device` the way the app does: write the store keys, rehydrate. */
function importOn(device: Device, stores: Record<string, unknown>) {
  return restoreBackup(stores, {
    storage: device.storage,
    keys: [KEY],
    rehydrate: async () => {
      await (device.store as unknown as { persist: { rehydrate: () => Promise<void> } }).persist.rehydrate();
    },
    engine: device.engine,
    adapters: [device.adapter],
  });
}

const ids = (device: Device) => new Set(device.items().map((i) => i.id));

describe.skipIf(!integrationDbUrl())("Backup export and import", () => {
  let t: TestDb | undefined;

  beforeAll(() => {
    process.env.DATABASE_URL = integrationDbUrl();
  });

  beforeEach(async () => {
    if (t) await t.close();
    t = await createTestDb();
    holder.db = t.db;
    await insertUser(t.db, ALICE);
  });

  afterAll(async () => {
    if (t) await t.close();
  });

  it("a backup imported on another device reaches every device, replacing what was there", async () => {
    const a = createDevice(network, ALICE, { persistKey: KEY });
    a.add(soap);
    a.add(rice);
    await a.engine.sync();
    const backup = readBackupStores(a.storage, [KEY]);

    // After the backup, device B deletes, edits and adds.
    const b = createDevice(network, ALICE, { persistKey: KEY });
    await b.engine.sync();
    b.tick(60_000);
    b.remove(soap.id);
    b.edit(rice.id, { name: "ข้าวเหนียว" });
    b.add(tea);
    await b.engine.sync();

    // Device C imports the backup.
    const c = createDevice(network, ALICE, { persistKey: KEY });
    await c.engine.sync();
    c.tick(120_000);
    await importOn(c, backup);
    expect(c.items()).toEqual([soap, rice]);
    await c.engine.sync();

    await b.engine.sync();
    expect(ids(b)).toEqual(new Set([soap.id, rice.id]));
    expect(b.items().find((i) => i.id === rice.id)?.name).toBe("ข้าวสาร");

    const d = createDevice(network, ALICE, { persistKey: KEY });
    await d.engine.sync();
    expect(ids(d)).toEqual(new Set([soap.id, rice.id]));
  });

  it("importing the data a device already has queues nothing", async () => {
    const a = createDevice(network, ALICE, { persistKey: KEY });
    a.add(soap);
    await a.engine.sync();
    const backup = readBackupStores(a.storage, [KEY]);

    await importOn(a, backup);

    expect(a.engine.getStatus().pending).toBe(0);
  });
});
