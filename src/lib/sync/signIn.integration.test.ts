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
import { createDevice, type DeviceNetwork, type Item } from "@/test/syncDevices";

const ALICE = "user-alice";
const BOB = "user-bob";

const network: DeviceNetwork = {
  route: changesRoute,
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

const soap = { id: "11111111-1111-4111-8111-111111111111", name: "สบู่", startDate: "2026-11-01" };
const shampoo = { id: "22222222-2222-4222-8222-222222222222", name: "แชมพู", startDate: "2026-10-01" };
const towel = { id: "33333333-3333-4333-8333-333333333333", name: "ผ้าเช็ดตัว", startDate: "2026-09-01" };

const byName = (items: Item[]) => [...items].sort((x, y) => x.name.localeCompare(y.name));

describe.skipIf(!integrationDbUrl())("Signing in and out with Guest Data", () => {
  let t: TestDb | undefined;

  beforeAll(() => {
    process.env.DATABASE_URL = integrationDbUrl();
  });

  beforeEach(async () => {
    if (t) await t.close();
    t = await createTestDb();
    holder.db = t.db;
    await insertUser(t.db, ALICE);
    await insertUser(t.db, BOB);
  });

  afterAll(async () => {
    if (t) await t.close();
  });

  it("uploads Guest Data once at the first sign-in, and a later sign-in does not upload it again", async () => {
    const laptop = createDevice(network, null);
    laptop.add(soap);
    laptop.add(shampoo);

    await laptop.signIn(ALICE);

    const phone = createDevice(network, ALICE);
    await phone.engine.sync();
    expect(byName(phone.items())).toEqual(byName([soap, shampoo]));

    // Alice deletes one on her phone; the laptop's session ends and she signs in again.
    phone.tick(1_000);
    phone.remove(soap.id);
    await phone.engine.sync();

    laptop.requests.length = 0;
    await laptop.signIn(ALICE);
    await phone.engine.sync();

    expect(laptop.requests).not.toContain("POST");
    expect(laptop.items()).toEqual([shampoo]);
    expect(phone.items()).toEqual([shampoo]);
  });

  it("leaves no User Data behind after signing out, keeps Device Preferences, and the next person sees none of it", async () => {
    const laptop = createDevice(network, null);
    laptop.storage.setItem("finance-dashboard-layout", '{"state":{"order":["a"]}}');
    await laptop.signIn(ALICE);
    laptop.tick(1_000);
    laptop.add(soap);

    expect(await laptop.signOut()).toEqual({ ok: true });

    expect(laptop.items()).toEqual([]);
    expect(laptop.storage.dump()).toEqual({ "finance-dashboard-layout": '{"state":{"order":["a"]}}' });

    // Alice's change was sent before her session ended.
    const phone = createDevice(network, ALICE);
    await phone.engine.sync();
    expect(phone.items()).toEqual([soap]);

    // Bob, next on the laptop, gets only his own (empty) data.
    laptop.add(towel);
    await laptop.signIn(BOB);
    expect(laptop.items()).toEqual([towel]);
    const bobsPhone = createDevice(network, BOB);
    await bobsPhone.engine.sync();
    expect(bobsPhone.items()).toEqual([towel]);
  });

  it("does not sign out while changes cannot be sent, unless the user discards them", async () => {
    const laptop = createDevice(network, null);
    await laptop.signIn(ALICE);
    laptop.offline = true;
    laptop.tick(1_000);
    laptop.add(soap);

    expect(await laptop.signOut()).toEqual({ ok: false, unsynced: 1 });
    expect(laptop.userId).toBe(ALICE);
    expect(laptop.items()).toEqual([soap]);

    expect(await laptop.signOut({ discardUnsynced: true })).toEqual({ ok: true });
    expect(laptop.userId).toBeNull();
    expect(laptop.items()).toEqual([]);
  });

  it("never mixes two accounts on one browser, even when the first session ended without signing out", async () => {
    const laptop = createDevice(network, null);
    await laptop.signIn(ALICE);
    laptop.tick(1_000);
    laptop.add(soap);
    await laptop.engine.sync();
    // Alice's session expires with an unsent change still queued.
    laptop.offline = true;
    laptop.tick(1_000);
    laptop.add(shampoo);
    await laptop.engine.sync();
    laptop.offline = false;

    const bobsPhone = createDevice(network, BOB, { startAt: Date.parse("2026-11-27T00:00:00Z") });
    bobsPhone.add(towel);
    await bobsPhone.engine.sync();

    await laptop.signIn(BOB);
    await bobsPhone.engine.sync();

    expect(laptop.items()).toEqual([towel]);
    expect(bobsPhone.items()).toEqual([towel]);
    const alicesPhone = createDevice(network, ALICE);
    await alicesPhone.engine.sync();
    expect(alicesPhone.items()).toEqual([soap]);
  });

  it("does not bring back an item deleted on A when B, still holding its old copy, signs in again", async () => {
    const a = createDevice(network, ALICE);
    const b = createDevice(network, null);
    b.add(soap);
    b.add(shampoo);
    await b.signIn(ALICE);
    await a.engine.sync();

    a.tick(1_000);
    a.remove(soap.id);
    await a.engine.sync();

    // B's session ended without signing out; its local copy still has the soap.
    b.userId = null;
    await b.engine.sync();
    expect(byName(b.items())).toEqual(byName([soap, shampoo]));

    await b.signIn(ALICE);
    await a.engine.sync();

    expect(b.items()).toEqual([shampoo]);
    expect(a.items()).toEqual([shampoo]);
  });

  it("does not bring back an item deleted on A when another browser's never-uploaded copy has it", async () => {
    const a = createDevice(network, ALICE);
    a.add(soap);
    await a.engine.sync();
    a.tick(1_000);
    a.remove(soap.id);
    await a.engine.sync();

    // A browser with local data from before sync (e.g. an old copy of the same item).
    const old = createDevice(network, null, { items: [soap, towel], startAt: Date.parse("2026-11-28T00:00:00Z") });
    await old.signIn(ALICE);
    await a.engine.sync();

    expect(old.items()).toEqual([towel]);
    expect(a.items()).toEqual([towel]);
  });

  it("merges two browsers' local-only data when each signs in, dropping nothing", async () => {
    const laptop = createDevice(network, null, { items: [soap] });
    const phone = createDevice(network, null, { items: [shampoo, towel] });

    await laptop.signIn(ALICE);
    await phone.signIn(ALICE);
    await laptop.engine.sync();

    expect(byName(laptop.items())).toEqual(byName([soap, shampoo, towel]));
    expect(byName(phone.items())).toEqual(byName([soap, shampoo, towel]));
  });
});
