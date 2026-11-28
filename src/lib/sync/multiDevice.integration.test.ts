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
import { createAppDevice, createDevice, type DeviceNetwork } from "@/test/syncDevices";
import { APP_SYNC_KINDS } from "@/lib/sync/appKinds";
import { useSupplyStore } from "@/store/useSupplyStore";
import { startAutoSync } from "@/lib/sync/autoSync";
import { MAX_CHANGE_DATA_BYTES, MAX_PUSH_BODY_BYTES, type PullResponse } from "@/lib/sync/contract";

const ALICE = "user-alice";
const BOB = "user-bob";

const network: DeviceNetwork = {
  route: changesRoute,
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

const soap = { id: "11111111-1111-4111-8111-111111111111", name: "สบู่", startDate: "2026-11-01" };

describe.skipIf(!integrationDbUrl())("Supplies sync across devices", () => {
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

  it("shows a supply added on device A on device B after B syncs", async () => {
    const a = createDevice(network, ALICE);
    const b = createDevice(network, ALICE);

    a.add(soap);
    await a.engine.sync();
    await b.engine.sync();

    expect(b.items()).toEqual([soap]);
  });

  it("removes a supply deleted on A from B, and B never uploads it back", async () => {
    const a = createDevice(network, ALICE);
    const b = createDevice(network, ALICE);
    a.add(soap);
    await a.engine.sync();
    await b.engine.sync();

    a.tick(1_000);
    a.remove(soap.id);
    await a.engine.sync();
    await b.engine.sync();
    await b.engine.sync();
    await a.engine.sync();

    expect(b.items()).toEqual([]);
    expect(a.items()).toEqual([]);
    expect(b.requests).not.toContain("POST");
    expect(b.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });
  });

  it("keeps a supply deleted when an offline device with an older edit comes back", async () => {
    const a = createDevice(network, ALICE);
    const b = createDevice(network, ALICE);
    a.add(soap);
    await a.engine.sync();
    await b.engine.sync();

    b.offline = true;
    b.tick(500);
    b.edit(soap.id, { name: "สบู่เหลว" });
    await b.engine.sync();
    expect(b.engine.getStatus()).toMatchObject({ state: "pending", pending: 1 });

    a.tick(1_000);
    a.remove(soap.id);
    await a.engine.sync();

    b.offline = false;
    await b.engine.sync();
    await a.engine.sync();

    expect(b.items()).toEqual([]);
    expect(a.items()).toEqual([]);
    expect(b.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });
  });

  it.each([
    ["the earlier editor pushes first", ["a", "b"] as const],
    ["the later editor pushes first", ["b", "a"] as const],
  ])("settles concurrent edits on the latest edit on both devices (%s)", async (_label, order) => {
    const devices = { a: createDevice(network, ALICE), b: createDevice(network, ALICE) };
    devices.a.add(soap);
    await devices.a.engine.sync();
    await devices.b.engine.sync();

    devices.a.tick(1_000);
    devices.a.edit(soap.id, { name: "A's edit" });
    devices.b.tick(2_000);
    devices.b.edit(soap.id, { name: "B's edit" });
    for (const d of order) await devices[d].engine.sync();
    for (const d of order) await devices[d].engine.sync();

    expect(devices.a.items()).toEqual([{ ...soap, name: "B's edit" }]);
    expect(devices.b.items()).toEqual([{ ...soap, name: "B's edit" }]);
    expect(devices.a.engine.getStatus().pending).toBe(0);
  });

  it("saves offline as not-yet-synced and sends by itself when the network returns", async () => {
    const a = createDevice(network, ALICE);
    const b = createDevice(network, ALICE);
    const browser = new EventTarget();
    const stop = startAutoSync(a.engine, { events: browser, debounceMs: 0, intervalMs: 60_000 });
    try {
      a.offline = true;
      a.add(soap);
      // Give the save-triggered sync its (failed, offline) try.
      await new Promise((resolve) => setTimeout(resolve, 20));
      await vi.waitFor(() => expect(a.engine.getStatus().syncing).toBe(false));
      expect(a.engine.getStatus()).toMatchObject({ state: "pending", pending: 1 });

      a.offline = false;
      browser.dispatchEvent(new Event("online"));
      await vi.waitFor(() => expect(a.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 }));
    } finally {
      stop();
    }

    await b.engine.sync();
    expect(b.items()).toEqual([soap]);
  });

  it("shows a failed sync when the server refuses the changes, and keeps them queued", async () => {
    const a = createDevice(network, ALICE);
    a.add({ ...soap, id: "x".repeat(500) }); // the server refuses ids this long

    await a.engine.sync();

    expect(a.engine.getStatus()).toMatchObject({ state: "error", pending: 1 });
  });

  it("keeps two users' supplies apart, even under the same record id", async () => {
    const alice = createDevice(network, ALICE);
    const bob = createDevice(network, BOB);
    alice.add(soap);
    bob.add({ ...soap, name: "Bob's soap" });
    await alice.engine.sync();
    await bob.engine.sync();
    await alice.engine.sync();

    expect(alice.items()).toEqual([soap]);
    expect(bob.items()).toEqual([{ ...soap, name: "Bob's soap" }]);

    bob.tick(1_000);
    bob.remove(soap.id);
    await bob.engine.sync();
    await alice.engine.sync();
    expect(alice.items()).toEqual([soap]);
  });

  it("answers failures with a generic message and no database details", async () => {
    holder.currentUserId = "user-without-account-row"; // owner FK fails inside the database
    const res = await changesRoute.POST(
      new Request("http://localhost/api/sync/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: [{ kind: "supply", id: soap.id, editedAt: new Date().toISOString(), data: soap }],
        }),
      }),
    );
    const bad = await changesRoute.POST(
      new Request("http://localhost/api/sync/changes", { method: "POST", body: "{not json" }),
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "ซิงก์ข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง" });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "คำขอซิงก์ไม่ถูกต้อง" });
  });

  it("keeps supplies saved before the upgrade and merges them from two browsers", async () => {
    const shampoo = { id: "22222222-2222-4222-8222-222222222222", name: "แชมพู", startDate: "2026-10-01" };
    const laptop = createDevice(network, ALICE, { items: [soap] });
    const phone = createDevice(network, ALICE, { items: [shampoo] });

    await laptop.engine.sync();
    await phone.engine.sync();
    await laptop.engine.sync();

    const byName = (items: { name: string }[]) => [...items].sort((x, y) => x.name.localeCompare(y.name));
    expect(byName(laptop.items())).toEqual(byName([soap, shampoo]));
    expect(byName(phone.items())).toEqual(byName([soap, shampoo]));

    // Uploaded once: a supply deleted later is not re-uploaded by the next sync.
    phone.tick(1_000);
    phone.remove(soap.id);
    await phone.engine.sync();
    await laptop.engine.sync();
    await laptop.engine.sync();
    expect(laptop.items()).toEqual([shampoo]);
  });

  describe("the app's supplies store", () => {
    beforeEach(() => {
      useSupplyStore.setState({ items: [] });
    });

    it("records every change made through its actions, and a pull does not push again", async () => {
      const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
      const other = createDevice(network, ALICE);
      try {
        const { addItem, markFinished, markInUse } = useSupplyStore.getState();
        addItem({ name: "ยาสีฟัน", startDate: "2026-11-02" });
        const id = useSupplyStore.getState().items[0].id;
        markFinished(id, "2026-11-20");
        markInUse(id); // finishedDate removed, not kept from the older version
        await app.engine.sync();
        await other.engine.sync();

        expect(other.items()).toEqual([
          expect.objectContaining({ id, name: "ยาสีฟัน", startDate: "2026-11-02" }),
        ]);
        expect(other.items()[0]).not.toHaveProperty("finishedDate");

        other.tick(1_000);
        other.edit(id, { name: "ยาสีฟันสมุนไพร" });
        await other.engine.sync();
        const postsBefore = app.requests.filter((m) => m === "POST").length;
        await app.engine.sync();
        await app.engine.sync();

        expect(useSupplyStore.getState().items).toEqual([
          expect.objectContaining({ id, name: "ยาสีฟันสมุนไพร" }),
        ]);
        expect(app.requests.filter((m) => m === "POST").length).toBe(postsBefore);
        expect(app.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });

        app.tick(2_000);
        useSupplyStore.getState().deleteItem(id);
        await app.engine.sync();
        await other.engine.sync();
        expect(other.items()).toEqual([]);
      } finally {
        app.unregister();
      }
    });
  });

  it("shows a record the server refused as a sync error, keeps it on the device, and clears the error once an edit is accepted", async () => {
    const a = createDevice(network, ALICE, { kind: "category" });
    a.add({ id: "cat-half", name: "" });
    await a.engine.sync();

    expect(a.engine.getStatus()).toMatchObject({ state: "error", pending: 0, refused: 1 });
    expect(a.items()).toEqual([{ id: "cat-half", name: "" }]);
    const posts = a.requests.filter((m) => m === "POST").length;
    await a.engine.sync();
    expect(a.requests.filter((m) => m === "POST").length).toBe(posts);
    expect(a.engine.getStatus()).toMatchObject({ state: "error", refused: 1 });
    expect(await a.signOut()).toEqual({ ok: false, unsynced: 1 });

    a.tick(1_000);
    a.edit("cat-half", { name: "ของใช้", type: "EXPENSE", icon: "Box", color: "#123456" });
    await a.engine.sync();
    expect(a.engine.getStatus()).toMatchObject({ state: "synced", pending: 0, refused: 0 });

    const b = createDevice(network, ALICE, { kind: "category" });
    await b.engine.sync();
    expect(b.items()).toEqual([expect.objectContaining({ id: "cat-half", name: "ของใช้" })]);
  });

  describe("size limits", () => {
    const post = (body: string) =>
      changesRoute.POST(
        new Request("http://localhost/api/sync/changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }),
      );
    const change = (data: Record<string, unknown>) => ({
      kind: "supply",
      id: soap.id,
      editedAt: new Date().toISOString(),
      data,
    });

    it("refuses a record or a request that is too large with a generic 413, and stores nothing", async () => {
      holder.currentUserId = ALICE;
      const bigRecord = await post(
        JSON.stringify({ changes: [change({ ...soap, note: "x".repeat(MAX_CHANGE_DATA_BYTES) })] }),
      );
      const bigBody = await post(
        JSON.stringify({ changes: [change(soap)], padding: "x".repeat(MAX_PUSH_BODY_BYTES) }),
      );

      expect(bigRecord.status).toBe(413);
      expect(await bigRecord.json()).toEqual({ error: "ข้อมูลที่ซิงก์ใหญ่เกินไป" });
      expect(bigBody.status).toBe(413);
      const other = createDevice(network, ALICE);
      await other.engine.sync();
      expect(other.items()).toEqual([]);
    });

    it("accepts a settings-sized cover image (a 2 MB file as base64)", async () => {
      const a = createDevice(network, ALICE);
      const cover = "data:image/jpeg;base64," + "A".repeat(Math.ceil((2 * 1024 * 1024 * 4) / 3));
      a.add({ ...soap, cover });
      await a.engine.sync();
      expect(a.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });
      const b = createDevice(network, ALICE);
      await b.engine.sync();
      expect(b.items()).toEqual([{ ...soap, cover }]);
    });

    it("keeps a too-large record on the device as refused, without resending it, and syncs the rest", async () => {
      const a = createDevice(network, ALICE);
      const huge = { id: "huge", name: "ใหญ่", note: "x".repeat(MAX_CHANGE_DATA_BYTES) };
      a.add(huge);
      a.add(soap);
      await a.engine.sync();
      await a.engine.sync();

      expect(a.engine.getStatus()).toMatchObject({ state: "error", pending: 0, refused: 1 });
      expect(a.items()).toEqual([huge, soap]);
      const b = createDevice(network, ALICE);
      await b.engine.sync();
      expect(b.items()).toEqual([soap]);

      a.tick(1_000);
      a.edit("huge", { note: "เล็กลงแล้ว" });
      await a.engine.sync();
      expect(a.engine.getStatus()).toMatchObject({ state: "synced", refused: 0 });
    });

    it("sends a queue larger than one request allows in several requests", async () => {
      const a = createDevice(network, ALICE);
      const note = "x".repeat(MAX_CHANGE_DATA_BYTES - 1_000);
      const items = [1, 2, 3].map((n) => ({ id: `big-${n}`, name: `ใหญ่ ${n}`, note }));
      items.forEach((item) => a.add(item));
      await a.engine.sync();
      expect(a.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });
      expect(a.requests.filter((m) => m === "POST").length).toBeGreaterThanOrEqual(2);
      const b = createDevice(network, ALICE);
      await b.engine.sync();
      expect(b.items().map((i) => i.id).sort()).toEqual(["big-1", "big-2", "big-3"]);
    });
  });

  describe("pulling in pages", () => {
    it("brings every record across several pages, including many saved in one request", async () => {
      const a = createDevice(network, ALICE);
      const items = Array.from({ length: 7 }, (_, n) => ({ id: `item-${n}`, name: `ของ ${n}` }));
      items.forEach((item) => a.add(item));
      await a.engine.sync(); // one push: every row gets the same server time

      const b = createDevice(network, ALICE, { pullLimit: 3 });
      await b.engine.sync();
      expect(b.items().map((i) => i.id).sort()).toEqual(items.map((i) => i.id));
      expect(b.requests.filter((m) => m === "GET").length).toBeGreaterThanOrEqual(3);

      a.tick(1_000);
      a.edit("item-4", { name: "แก้แล้ว" });
      await a.engine.sync();
      await b.engine.sync();
      expect(b.items().find((i) => i.id === "item-4")?.name).toBe("แก้แล้ว");
    });

    it("refuses a malformed page token or limit", async () => {
      holder.currentUserId = ALICE;
      const badPage = await changesRoute.GET(new Request("http://localhost/api/sync/changes?page=nonsense"));
      const badLimit = await changesRoute.GET(new Request("http://localhost/api/sync/changes?limit=0"));
      expect(badPage.status).toBe(400);
      expect(badLimit.status).toBe(400);
      const ok = await changesRoute.GET(new Request("http://localhost/api/sync/changes?limit=1"));
      expect(((await ok.json()) as PullResponse).records).toEqual([]);
    });
  });
});
