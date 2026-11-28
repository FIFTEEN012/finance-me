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
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";
import { appDevicePool, createDevice, type DeviceNetwork } from "@/test/syncDevices";
import { APP_SYNC_KINDS } from "@/lib/sync/appKinds";
import { AgentIngestionRepository, type IngestionDatabase } from "@/lib/agentIngestion/repository";
import { saveNewTransaction } from "@/lib/saveTransaction";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useNutritionStore, type FoodInput } from "@/store/useNutritionStore";
import { useRecurringStore } from "@/store/useRecurringStore";
import type { Transaction } from "@/types";

/**
 * Transactions keep their own table (ADR-0003) and sync through the engine
 * like every other record kind: every way the app creates, edits or deletes
 * one goes through the transaction store, and the engine carries it.
 */

const ALICE = "user-alice";

const network: DeviceNetwork = {
  route: changesRoute,
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

const STORES = [useTransactionStore, useNutritionStore, useRecurringStore];

const lunch: Omit<Transaction, "id" | "createdAt"> = {
  type: "EXPENSE",
  categoryId: "cat-expense-1",
  amount: 120,
  description: "ข้าวมันไก่",
  date: "2026-11-25",
};

const txs = () => useTransactionStore.getState().transactions;
const food = () => useNutritionStore.getState().food;

describe.skipIf(!integrationDbUrl())("Transactions across devices", () => {
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
    pool = appDevicePool(network, STORES, APP_SYNC_KINDS);
  });

  afterEach(() => {
    pool.close();
  });

  afterAll(async () => {
    if (t) await t.close();
  });

  it("shows a transaction added, edited and deleted on one device on the other, and it never comes back", async () => {
    const a = pool.create(ALICE);
    const b = pool.create(ALICE);

    pool.use(a);
    const id = useTransactionStore.getState().addTransaction(lunch);
    await a.engine.sync();
    pool.use(b);
    await b.engine.sync();
    expect(txs()).toEqual([expect.objectContaining({ id, ...lunch })]);

    b.tick(1_000);
    useTransactionStore.getState().updateTransaction(id, { amount: 150, note: "เพิ่มไข่" });
    await b.engine.sync();
    pool.use(a);
    await a.engine.sync();
    expect(txs()).toEqual([expect.objectContaining({ id, amount: 150, note: "เพิ่มไข่" })]);

    a.tick(2_000);
    useTransactionStore.getState().deleteTransaction(id);
    await a.engine.sync();
    pool.use(b);
    await b.engine.sync();
    expect(txs()).toEqual([]);

    // A device that still holds it from before sync cannot bring it back.
    const stale = createDevice(network, ALICE, {
      kind: "transaction",
      items: [{ id, name: "", ...lunch, createdAt: "2026-11-25T05:00:00.000Z" }],
    });
    await stale.engine.sync();
    expect(stale.items()).toEqual([]);
  });

  it("deletes many transactions on every device even when the network drops midway", async () => {
    const a = pool.create(ALICE);
    const b = pool.create(ALICE);

    pool.use(a);
    const ids = Array.from({ length: 250 }, (_, i) =>
      useTransactionStore.getState().addTransaction({ ...lunch, amount: i + 1 }),
    );
    await a.engine.sync();
    pool.use(b);
    await b.engine.sync();
    expect(txs()).toHaveLength(250);

    pool.use(a);
    a.tick(1_000);
    useTransactionStore.getState().deleteTransactions(ids);
    // The first batch of deletes gets through, then the connection drops.
    let posts = 0;
    const realPost = changesRoute.POST;
    const flaky: DeviceNetwork = {
      ...network,
      route: {
        GET: changesRoute.GET,
        POST: async (req) => {
          posts++;
          if (posts > 1) a.offline = true;
          if (a.offline) throw new TypeError("Failed to fetch");
          return realPost(req);
        },
      },
    };
    Object.assign(network, { route: flaky.route });
    try {
      await a.engine.sync();
    } finally {
      Object.assign(network, { route: changesRoute });
    }
    expect(a.engine.getStatus().state).toBe("pending");

    pool.use(b);
    await b.engine.sync();
    expect(txs().length).toBeGreaterThan(0); // only part of the deletes are on the server yet

    pool.use(a);
    a.offline = false;
    await a.engine.sync();
    expect(a.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });
    pool.use(b);
    await b.engine.sync();
    expect(txs()).toEqual([]);
  });

  it("keeps the Food Entry link on the first row after a split, and removes the original everywhere", async () => {
    const a = pool.create(ALICE);
    const b = pool.create(ALICE);

    pool.use(a);
    const { id: original, foodIds } = saveNewTransaction(lunch, [
      { date: lunch.date, meal: "lunch", name: "ข้าวมันไก่", kcal: 600 },
    ]);
    await a.engine.sync();
    pool.use(b);
    await b.engine.sync();

    b.tick(1_000);
    const parts = useTransactionStore.getState().splitTransaction(original, [
      { categoryId: "cat-expense-1", amount: 80, description: "ข้าวมันไก่" },
      { categoryId: "cat-expense-2", amount: 40, description: "ค่าส่ง" },
    ]);
    await b.engine.sync();

    pool.use(a);
    await a.engine.sync();
    expect(txs().map((tx) => tx.id).sort()).toEqual([...parts].sort());
    expect(food()).toEqual([expect.objectContaining({ id: foodIds[0], foodExpenseId: parts[0] })]);
  });

  it("carries category and tag changes made to many transactions at once", async () => {
    const a = pool.create(ALICE);
    const b = pool.create(ALICE);

    pool.use(a);
    const one = useTransactionStore.getState().addTransaction(lunch);
    const two = useTransactionStore.getState().addTransaction({ ...lunch, tags: ["งาน"] });
    await a.engine.sync();

    a.tick(1_000);
    useTransactionStore.getState().recategorizeTransactions([one, two], "cat-expense-3");
    useTransactionStore.getState().bulkAddTag([one, two], "ทริป");
    useTransactionStore.getState().bulkRemoveTag([two], "งาน");
    await a.engine.sync();

    pool.use(b);
    await b.engine.sync();
    expect(txs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: one, categoryId: "cat-expense-3", tags: ["ทริป"] }),
        expect.objectContaining({ id: two, categoryId: "cat-expense-3", tags: ["ทริป"] }),
      ]),
    );
  });

  describe("saving a Food Expense with its Food Entries", () => {
    const meal: FoodInput[] = [
      { date: lunch.date, meal: "lunch", name: "ข้าวมันไก่", kcal: 600 },
      { date: lunch.date, meal: "lunch", name: "ชาเย็น", kcal: 250 },
    ];

    it("reaches the other device as one expense with every Food Entry linked to it, even if saved offline", async () => {
      const a = pool.create(ALICE);
      const b = pool.create(ALICE);

      pool.use(a);
      a.offline = true;
      const { id, foodIds } = saveNewTransaction(lunch, meal);
      await a.engine.sync();
      expect(a.engine.getStatus().state).toBe("pending");
      a.offline = false;
      await a.engine.sync();

      pool.use(b);
      await b.engine.sync();
      expect(txs()).toEqual([expect.objectContaining({ id, ...lunch })]);
      // Records saved together arrive in no particular order.
      expect(food().map((e) => [e.id, e.foodExpenseId])).toEqual(
        expect.arrayContaining(foodIds.map((foodId) => [foodId, id])),
      );
      expect(food()).toHaveLength(foodIds.length);
    });

    it.each([
      ["a zero amount", { amount: 0 }],
      ["a negative amount", { amount: -5 }],
      ["no category", { categoryId: "" }],
      ["no date", { date: "" }],
    ])("refuses %s and creates nothing, neither expense nor Food Entries", (_label, bad) => {
      const a = pool.create(ALICE);
      pool.use(a);

      expect(() => saveNewTransaction({ ...lunch, ...bad }, meal)).toThrow();
      expect(txs()).toEqual([]);
      expect(food()).toEqual([]);
      expect(a.engine.getStatus().pending).toBe(0);
    });
  });

  it("shows transactions recorded by the bot in the app, once per message", async () => {
    const repo = new AgentIngestionRepository(t!.db as unknown as IngestionDatabase);
    const request = {
      idempotencyKey: "discord-msg-0001",
      source: "hermes-discord",
      sourceMessageId: "msg-0001",
      kind: "transaction" as const,
      data: {
        transactionType: "EXPENSE" as const,
        amount: "85.00",
        currency: "THB",
        description: "กาแฟ",
        // 06:30 in Bangkok on the 26th.
        occurredAt: "2026-11-25T23:30:00.000Z",
      },
    };
    const first = await repo.ingestWithStatus(ALICE, request);
    const again = await repo.ingestWithStatus(ALICE, request);
    expect(first.status).toBe("created");
    expect(again.status).toBe("deduplicated");

    // The bot stamps its rows with the server's clock; this device's clock is in step.
    const a = pool.create(ALICE, { startAt: Date.now() });
    pool.use(a);
    await a.engine.sync();
    expect(txs()).toEqual([
      expect.objectContaining({
        id: first.record.id,
        type: "EXPENSE",
        amount: 85,
        description: "กาแฟ",
        categoryId: "uncategorized",
        date: "2026-11-26",
      }),
    ]);

    // Edited in the app, it is still the bot's message: a retry stays deduplicated.
    a.tick(1_000);
    useTransactionStore.getState().updateTransaction(first.record.id, { categoryId: "cat-expense-1" });
    await a.engine.sync();
    const retry = await repo.ingestWithStatus(ALICE, request);
    expect(retry.status).toBe("deduplicated");
    expect(retry.record).toMatchObject({ id: first.record.id, source: "hermes-discord", categoryId: "cat-expense-1" });
  });

  describe("recurring transactions", () => {
    const internet = {
      categoryId: "cat-expense-1",
      type: "EXPENSE" as const,
      amount: 500,
      description: "ค่าเน็ต",
      frequency: "monthly" as const,
      startDate: "2026-12-15",
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-12-20T09:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("stays deleted when a device that has not synced yet records the same occurrence", async () => {
      const a = pool.create(ALICE);
      const b = pool.create(ALICE);
      pool.use(a);
      useRecurringStore.getState().addRecurring(internet);
      await a.engine.sync();
      pool.use(b);
      await b.engine.sync();

      // A records the occurrence and the user deletes it there.
      pool.use(a);
      a.tick(1_000);
      expect(useRecurringStore.getState().generateDue()).toBe(1);
      await a.engine.sync();
      a.tick(1_000);
      useTransactionStore.getState().deleteTransaction(txs()[0].id);
      await a.engine.sync();

      // B, offline since before, records the same occurrence later by its own clock.
      pool.use(b);
      b.tick(60_000);
      expect(useRecurringStore.getState().generateDue()).toBe(1);
      await b.engine.sync();
      expect(txs()).toEqual([]);

      pool.use(a);
      await a.engine.sync();
      expect(txs()).toEqual([]);
    });

    it("keeps one transaction when two devices record the same occurrence before syncing", async () => {
      const a = pool.create(ALICE);
      const b = pool.create(ALICE);
      pool.use(a);
      useRecurringStore.getState().addRecurring(internet);
      await a.engine.sync();
      pool.use(b);
      await b.engine.sync();

      pool.use(a);
      expect(useRecurringStore.getState().generateDue()).toBe(1);
      pool.use(b);
      expect(useRecurringStore.getState().generateDue()).toBe(1);
      await b.engine.sync();
      pool.use(a);
      await a.engine.sync();
      expect(txs()).toEqual([expect.objectContaining({ date: "2026-12-15", amount: 500 })]);
      pool.use(b);
      await b.engine.sync();
      expect(txs()).toEqual([expect.objectContaining({ date: "2026-12-15", amount: 500 })]);
    });

    it("lets a real edit of a recorded occurrence win over another device recording it", async () => {
      const a = pool.create(ALICE);
      const b = pool.create(ALICE);
      pool.use(a);
      useRecurringStore.getState().addRecurring(internet);
      await a.engine.sync();
      pool.use(b);
      await b.engine.sync();

      pool.use(a);
      a.tick(1_000);
      useRecurringStore.getState().generateDue();
      a.tick(1_000);
      useTransactionStore.getState().updateTransaction(txs()[0].id, { amount: 650 });
      await a.engine.sync();

      pool.use(b);
      b.tick(60_000);
      useRecurringStore.getState().generateDue();
      await b.engine.sync();
      expect(txs()).toEqual([expect.objectContaining({ amount: 650 })]);
    });
  });
});
