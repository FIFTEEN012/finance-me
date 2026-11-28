import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
import * as resetRoute from "@/app/api/sync/reset/route";
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";
import { appDevicePool, createDevice, type DeviceNetwork, type Item } from "@/test/syncDevices";
import { APP_SYNC_KINDS } from "@/lib/sync/appKinds";
import { RECORD_KINDS, SYNC_CHANGES_PATH, SYNC_RESET_PATH, type PullResponse } from "@/lib/sync/contract";
import { resetUserData } from "@/lib/sync/reset";
import { clearLocalUserData } from "@/lib/localOwner";
import { defaultCategories } from "@/lib/defaultCategories";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useCategoryStore } from "@/store/useCategoryStore";
import { useSupplyStore } from "@/store/useSupplyStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import type { Transaction } from "@/types";

/**
 * Reset (GLOSSARY): one command wipes every kind of the signed-in user's User
 * Data on the server and on every device, then brings back the default
 * categories. Device Preferences stay. Other users are untouched.
 */

const ALICE = "user-alice";
/** Device clocks start a little before the server's clock, so edits made before a Reset are older than it. */
const START = Date.now() - 10 * 60_000;
const BOB = "user-bob";

const network: DeviceNetwork = {
  route: changesRoute,
  routes: { [SYNC_RESET_PATH]: resetRoute },
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

const STORES = [
  useTransactionStore,
  useCategoryStore,
  useSupplyStore,
  useGoalStore,
  useDashboardStore,
  useOnboardingStore,
];

/** A record every kind accepts (table kinds need their required fields). */
function sampleRecord(kind: string, n = 1): Item {
  const id = `${kind}-${n}`;
  switch (kind) {
    case "category":
      return { id, name: `หมวด ${n}`, type: "EXPENSE", icon: "Coffee", color: "#123456" };
    case "budget":
      return { id, name: "", categoryId: "cat-expense-1", amount: 5000, month: 11, year: 2026 };
    case "goal":
      return { id, name: "เที่ยวญี่ปุ่น", targetAmount: 50000, savedAmount: 0, targetDate: "2027-04-01" };
    case "debt":
      return { id, name: "", personName: "สมชาย", type: "I_OWE", totalAmount: 1000, paidAmount: 0, payments: [] };
    case "transaction":
      return {
        id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
        name: "",
        type: "EXPENSE",
        categoryId: "cat-expense-1",
        amount: 99,
        description: "ของเก่า",
        date: "2026-11-20",
      };
    default:
      return { id, name: `${kind} ${n}` };
  }
}

/** Puts one record of every User Data kind on the server for `userId`. */
async function seedEveryKind(userId: string) {
  for (const kind of RECORD_KINDS) {
    const d = createDevice(network, userId, { kind, items: [sampleRecord(kind)], startAt: START });
    await d.engine.sync();
  }
}

/** Live (not deleted) records the server holds for `userId`. */
async function liveOnServer(userId: string) {
  network.signInAs(userId);
  const res = await changesRoute.GET(new Request(`http://localhost${SYNC_CHANGES_PATH}`));
  const { records } = (await res.json()) as PullResponse;
  return records.filter((r) => r.deletedAt === null);
}

const defaultsAsLive = defaultCategories.map((c) => expect.objectContaining({ kind: "category", id: c.id }));

const lunch: Omit<Transaction, "id" | "createdAt"> = {
  type: "EXPENSE",
  categoryId: "cat-expense-1",
  amount: 120,
  description: "ข้าวมันไก่",
  date: "2026-11-25",
};

const txs = () => useTransactionStore.getState().transactions;
const categoryIds = () => useCategoryStore.getState().categories.map((c) => c.id).sort();
const defaultIds = defaultCategories.map((c) => c.id).sort();

describe.skipIf(!integrationDbUrl())("Reset across devices", () => {
  let t: TestDb | undefined;
  let pool: ReturnType<typeof appDevicePool>;

  beforeAll(() => {
    process.env.DATABASE_URL = integrationDbUrl();
  });

  beforeEach(async () => {
    if (t) await t.close();
    t = await createTestDb();
    holder.db = t.db;
    await insertUser(t.db, ALICE);
    await insertUser(t.db, BOB);
    pool = appDevicePool(network, STORES, APP_SYNC_KINDS);
  });

  afterEach(() => {
    pool.close();
  });

  afterAll(async () => {
    if (t) await t.close();
  });

  /** Runs Reset from `device` the way the settings page does. */
  const pressReset = (device: ReturnType<typeof pool.create>) =>
    resetUserData({ fetch: device.fetch, engine: device.engine, clearLocal: clearLocalUserData });

  it("wipes every kind on the server, brings back every default category, and leaves other users alone", async () => {
    await seedEveryKind(ALICE);
    await seedEveryKind(BOB);
    // Alice had deleted a default category before the Reset.
    const deleter = createDevice(network, ALICE, { kind: "category", items: [{ ...defaultCategories[0] }], startAt: START });
    await deleter.engine.sync();
    deleter.tick(1_000);
    deleter.remove(defaultCategories[0].id);
    await deleter.engine.sync();

    const a = pool.create(ALICE, { startAt: START });
    pool.use(a);
    expect(await pressReset(a)).toBe(true);

    const live = await liveOnServer(ALICE);
    expect(live).toHaveLength(defaultCategories.length);
    expect(live).toEqual(expect.arrayContaining(defaultsAsLive));
    expect(live.find((r) => r.id === defaultCategories[0].id)?.data).toMatchObject({
      name: defaultCategories[0].name,
      type: defaultCategories[0].type,
    });

    const bobs = await liveOnServer(BOB);
    expect(bobs.map((r) => r.kind).sort()).toEqual([...RECORD_KINDS].sort());
  });

  it("empties every device on its next sync, with default categories, keeping each device's own preferences", async () => {
    const a = pool.create(ALICE, { startAt: START });
    const b = pool.create(ALICE, { startAt: START });

    pool.use(a);
    useTransactionStore.getState().addTransaction(lunch);
    useSupplyStore.getState().addItem({ name: "ยาสีฟัน" } as never);
    useOnboardingStore.getState().complete();
    await a.engine.sync();

    pool.use(b);
    await b.engine.sync();
    expect(txs()).toHaveLength(1);
    useDashboardStore.getState().setVisible(useDashboardStore.getState().widgets[0].id, false);
    const bLayout = useDashboardStore.getState().widgets;

    pool.use(a);
    a.tick(60_000);
    expect(await pressReset(a)).toBe(true);
    expect(txs()).toEqual([]);
    expect(useSupplyStore.getState().items).toEqual([]);
    expect(categoryIds()).toEqual(defaultIds);
    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(a.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });

    pool.use(b);
    await b.engine.sync();
    expect(txs()).toEqual([]);
    expect(useSupplyStore.getState().items).toEqual([]);
    expect(categoryIds()).toEqual(defaultIds);
    expect(useDashboardStore.getState().widgets).toEqual(bLayout);
  });

  it("does not let a device upload edits it queued before the Reset", async () => {
    const a = pool.create(ALICE, { startAt: START });
    const b = pool.create(ALICE, { startAt: START });

    pool.use(b);
    const kept = useTransactionStore.getState().addTransaction(lunch);
    await b.engine.sync();
    // B goes offline and keeps working: an edit, a new record, a new category.
    b.offline = true;
    b.tick(1_000);
    useTransactionStore.getState().updateTransaction(kept, { amount: 500 });
    useTransactionStore.getState().addTransaction({ ...lunch, description: "ก่อนรีเซ็ต" });
    useCategoryStore.setState((s) => ({
      categories: [...s.categories, { id: "cat-offline", name: "ออฟไลน์", type: "EXPENSE", icon: "X", color: "#000000", isDefault: false }],
    }));
    useGoalStore.setState({
      goals: [{ id: "goal-offline", name: "ก่อนรีเซ็ต", targetAmount: 100, savedAmount: 0, targetDate: "2027-01-01" } as never],
    });
    await b.engine.sync();
    expect(b.engine.getStatus().pending).toBeGreaterThan(0);

    pool.use(a);
    a.tick(60_000);
    expect(await pressReset(a)).toBe(true);

    pool.use(b);
    b.offline = false;
    await b.engine.sync();
    expect(txs()).toEqual([]);
    expect(categoryIds()).toEqual(defaultIds);
    expect(useGoalStore.getState().goals).toEqual([]);
    expect(b.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });

    const live = await liveOnServer(ALICE);
    expect(live).toHaveLength(defaultCategories.length);

    // An edit made after the Reset is kept as usual.
    b.tick(20 * 60_000);
    const fresh = useTransactionStore.getState().addTransaction({ ...lunch, description: "หลังรีเซ็ต" });
    await b.engine.sync();
    expect((await liveOnServer(ALICE)).map((r) => r.id)).toContain(fresh);
  });

  it("clears nothing on the device when the Reset fails, and the server keeps everything", async () => {
    const a = pool.create(ALICE, { startAt: START });
    pool.use(a);
    useTransactionStore.getState().addTransaction(lunch);
    await a.engine.sync();
    useTransactionStore.getState().addTransaction({ ...lunch, description: "ยังไม่ซิงก์" });

    a.offline = true;
    expect(await pressReset(a)).toBe(false);
    expect(txs()).toHaveLength(2);
    expect(a.engine.getStatus().pending).toBe(1);

    a.offline = false;
    const realDb = holder.db;
    holder.db = {
      transaction: () => {
        throw new Error("relation finance_secret does not exist");
      },
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      network.signInAs(ALICE);
      const res = await resetRoute.POST();
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toMatch(/relation|finance_secret/);
      expect(await pressReset(a)).toBe(false);
    } finally {
      holder.db = realDb;
      consoleError.mockRestore();
    }
    expect(txs()).toHaveLength(2);
    expect(a.engine.getStatus().pending).toBe(1);
    expect((await liveOnServer(ALICE)).filter((r) => r.kind === "transaction")).toHaveLength(1);
  });

  it("refuses a Reset without a signed-in user", async () => {
    network.signInAs(null as unknown as string);
    const res = await resetRoute.POST();
    expect(res.status).toBe(401);
  });
});
