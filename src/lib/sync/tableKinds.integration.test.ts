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
import * as oldSyncRoute from "@/app/api/sync/route";
import * as categoriesRoute from "@/app/api/categories/route";
import * as categoryRoute from "@/app/api/categories/[id]/route";
import * as budgetsRoute from "@/app/api/budgets/route";
import * as budgetRoute from "@/app/api/budgets/[id]/route";
import * as goalsRoute from "@/app/api/goals/route";
import * as goalRoute from "@/app/api/goals/[id]/route";
import * as debtsRoute from "@/app/api/debts/route";
import * as debtRoute from "@/app/api/debts/[id]/route";
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";
import { createAppDevice, createDevice, type DeviceNetwork, type Item } from "@/test/syncDevices";
import { APP_SYNC_KINDS } from "@/lib/sync/appKinds";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useCategoryStore } from "@/store/useCategoryStore";
import { useBudgetStore } from "@/store/useBudgetStore";
import { useGoalStore } from "@/store/useGoalStore";
import { useDebtStore } from "@/store/useDebtStore";

/**
 * Categories, budgets, goals and debts keep their own tables (ADR-0003) but
 * sync through the same contract as every other record kind.
 */

const ALICE = "user-alice";

const network: DeviceNetwork = {
  route: changesRoute,
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

/** A synced record; not every kind has a `name`. */
const asItem = (r: { id: string } & Record<string, unknown>) => r as Item;

const category: Item = {
  id: "cat-custom-1",
  name: "ค่ากาแฟ",
  type: "EXPENSE",
  icon: "Coffee",
  color: "#7c3aed",
  isDefault: false,
  isFood: true,
};
const budget = asItem({
  id: "11111111-1111-4111-8111-111111111111",
  categoryId: "cat-expense-1",
  amount: 5000,
  month: 11,
  year: 2026,
  allowRollover: true,
});
const goal: Item = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "เที่ยวญี่ปุ่น",
  targetAmount: 60000,
  savedAmount: 15000,
  targetDate: "2027-04-01",
  description: "ทริปสงกรานต์",
  icon: "Plane",
  color: "#10b981",
  createdAt: "2026-10-01T03:04:05.000Z",
  milestonesCelebrated: [25],
  linkedPortfolio: true,
};
const debt = asItem({
  id: "33333333-3333-4333-8333-333333333333",
  personName: "สมชาย",
  type: "OWED_TO_ME",
  category: "family",
  totalAmount: 3000,
  paidAmount: 1000,
  startDate: "2026-10-15",
  dueDate: "2026-12-31",
  note: "ค่าตั๋ว",
  color: "#10b981",
  isSettled: false,
  payments: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      debtId: "33333333-3333-4333-8333-333333333333",
      amount: 1000,
      date: "2026-11-01",
      transactionId: "55555555-5555-4555-8555-555555555555",
      createdAt: "2026-11-01T01:00:00.000Z",
    },
  ],
  initialTransactionId: "66666666-6666-4666-8666-666666666666",
  createdAt: "2026-10-15T02:00:00.000Z",
  // A debt's updatedAt is its last edit; devices in these tests start at this time.
  updatedAt: "2026-11-26T00:00:00.000Z",
});

type EntityRoute = {
  GET: () => Promise<Response>;
};
type EntityItemRoute = {
  PUT: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
  DELETE: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
};

const KINDS = [
  {
    kind: "category",
    record: category,
    rename: { name: "ค่ากาแฟและขนม" },
    api: { list: categoriesRoute, item: categoryRoute, key: "categories", put: { name: "ค่ากาแฟและขนม" } },
  },
  {
    kind: "budget",
    record: budget,
    rename: { amount: 6500 },
    api: { list: budgetsRoute, item: budgetRoute, key: "budgets", put: { amount: 6500 } },
  },
  {
    kind: "goal",
    record: goal,
    rename: { name: "เที่ยวฮอกไกโด" },
    api: { list: goalsRoute, item: goalRoute, key: "goals", put: { name: "เที่ยวฮอกไกโด" } },
  },
  {
    kind: "debt",
    record: debt,
    rename: { personName: "สมชาย ใจดี" },
    api: { list: debtsRoute, item: debtRoute, key: "debts", put: { person: "สมชาย ใจดี" } },
  },
] as const satisfies readonly {
  kind: string;
  record: Item;
  rename: Partial<Item>;
  api: { list: EntityRoute; item: EntityItemRoute; key: string; put: Record<string, unknown> };
}[];

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (method: string, body?: unknown) =>
  new Request("http://localhost/api", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe.skipIf(!integrationDbUrl())("Table-backed kinds sync across devices", () => {
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

  it("refuses a record its table cannot hold without holding up the others", async () => {
    const a = createDevice(network, ALICE, { kind: "goal" });
    const b = createDevice(network, ALICE, { kind: "goal" });
    a.add(asItem({ id: "goal-without-name", targetAmount: 100 }));
    a.add(goal);
    await a.engine.sync();
    await b.engine.sync();

    expect(b.items()).toEqual([goal]);
    expect(a.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });
  });

  describe("the app's stores", () => {
    beforeEach(() => {
      useTransactionStore.setState({ transactions: [] });
      useCategoryStore.setState({ categories: [] });
      useBudgetStore.setState({ budgets: [] });
      useGoalStore.setState({ goals: [] });
      useDebtStore.setState({ debts: [] });
    });

    it("syncs a debt and its repayment, each linked to the transaction it created", async () => {
      const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
      const other = createDevice(network, ALICE, { kind: "debt" });
      try {
        useTransactionStore.setState({
          transactions: [
            { id: "older-tx", type: "EXPENSE", amount: 50, categoryId: "c", description: "ข้าว", date: "2026-11-01", createdAt: "2026-11-01T00:00:00.000Z" },
          ],
        });
        const created = useDebtStore.getState().addDebt(
          { personName: "สมชาย", type: "OWED_TO_ME", category: "family", totalAmount: 3000, startDate: "2026-11-02" },
          { create: true, categoryId: "cat-expense-9" },
        );
        const lent = useTransactionStore.getState().transactions.find((t) => t.description.includes("สมชาย"));
        expect(created.initialTransactionId).toBe(lent?.id);

        useDebtStore.getState().addPayment(created.id, { amount: 1000, date: "2026-11-10", createTransaction: true });
        const repaid = useTransactionStore.getState().transactions.find((t) => t.description.startsWith("รับคืน"));
        const payment = useDebtStore.getState().debts[0].payments[0];
        expect(payment.transactionId).toBe(repaid?.id);

        await app.engine.sync();
        await other.engine.sync();

        expect(other.items()).toEqual([
          expect.objectContaining({
            id: created.id,
            category: "family",
            initialTransactionId: lent?.id,
            paidAmount: 1000,
            payments: [expect.objectContaining({ amount: 1000, transactionId: repaid?.id })],
          }),
        ]);
      } finally {
        app.unregister();
      }
    });

    it("syncs savings added to a goal, but not a portfolio refresh that changes nothing", async () => {
      const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
      const other = createDevice(network, ALICE, { kind: "goal" });
      try {
        const goals = useGoalStore.getState();
        goals.addGoal({ name: "กองทุนฉุกเฉิน", targetAmount: 10000, savedAmount: 0, targetDate: "2027-01-01", icon: "Target", color: "#10b981" });
        goals.addGoal({ name: "พอร์ต", targetAmount: 100000, savedAmount: 0, targetDate: "2030-01-01", icon: "Target", color: "#10b981", linkedPortfolio: true });
        const [emergency] = useGoalStore.getState().goals;
        expect(useGoalStore.getState().addSaving(emergency.id, 3000)).toEqual([25]);
        useGoalStore.getState().syncPortfolioGoals(30000);
        await app.engine.sync();
        await other.engine.sync();

        expect(other.items()).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: emergency.id, savedAmount: 3000, milestonesCelebrated: [25] }),
            expect.objectContaining({ name: "พอร์ต", savedAmount: 30000, linkedPortfolio: true, milestonesCelebrated: [25] }),
          ]),
        );

        useGoalStore.getState().syncPortfolioGoals(30000);
        expect(app.engine.getStatus().pending).toBe(0);
      } finally {
        app.unregister();
      }
    });

    it("syncs categories and budgets changed through the stores", async () => {
      const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
      const cats = createDevice(network, ALICE, { kind: "category" });
      const budgets = createDevice(network, ALICE, { kind: "budget" });
      try {
        useCategoryStore.getState().addCategory({ name: "สัตว์เลี้ยง", type: "EXPENSE", icon: "Dog", color: "#f59e0b" });
        const pet = useCategoryStore.getState().categories[0];
        useBudgetStore.getState().addBudget({ categoryId: pet.id, amount: 2000, month: 11, year: 2026 });
        await app.engine.sync();
        await cats.engine.sync();
        await budgets.engine.sync();
        expect(cats.items()).toEqual([expect.objectContaining({ id: pet.id, name: "สัตว์เลี้ยง" })]);
        expect(budgets.items()).toEqual([expect.objectContaining({ categoryId: pet.id, amount: 2000 })]);

        app.tick(1_000);
        useBudgetStore.getState().deleteBudget(useBudgetStore.getState().budgets[0].id);
        useCategoryStore.getState().deleteCategory(pet.id);
        await app.engine.sync();
        await cats.engine.sync();
        await budgets.engine.sync();
        expect(cats.items()).toEqual([]);
        expect(budgets.items()).toEqual([]);
      } finally {
        app.unregister();
      }
    });
  });

  describe.each(KINDS)("$kind", ({ kind, record, rename, api }) => {
    it("is deleted for every device by the old per-item DELETE, and GET no longer lists it", async () => {
      const a = createDevice(network, ALICE, { kind });
      a.add(record);
      await a.engine.sync();

      holder.currentUserId = ALICE;
      const del = await api.item.DELETE(jsonRequest("DELETE"), ctx(record.id));
      expect(del.status).toBe(200);
      const list = await (await api.list.GET()).json();
      expect(list[api.key]).toEqual([]);
      expect((await api.item.PUT(jsonRequest("PUT", api.put), ctx(record.id))).status).toBe(404);
      expect((await api.item.DELETE(jsonRequest("DELETE"), ctx(record.id))).status).toBe(404);

      await a.engine.sync();
      expect(a.items()).toEqual([]);

      // A browser holding it from before sync cannot bring it back.
      const stale = createDevice(network, ALICE, { kind, items: [record] });
      await stale.engine.sync();
      expect(stale.items()).toEqual([]);
    });

    it("is neither listed nor brought back by the old /api/sync once deleted", async () => {
      const a = createDevice(network, ALICE, { kind });
      a.add(record);
      await a.engine.sync();
      a.tick(1_000);
      a.remove(record.id);
      await a.engine.sync();

      holder.currentUserId = ALICE;
      expect((await (await oldSyncRoute.GET()).json())[api.key]).toEqual([]);
      const post = await oldSyncRoute.POST(jsonRequest("POST", { [api.key]: [record] }));
      expect(post.status).toBe(200);
      expect((await (await oldSyncRoute.GET()).json())[api.key]).toEqual([]);

      const b = createDevice(network, ALICE, { kind });
      await b.engine.sync();
      expect(b.items()).toEqual([]);
    });

    it("reaches other devices when changed through the old per-item PUT", async () => {
      const a = createDevice(network, ALICE, { kind });
      a.add(record);
      await a.engine.sync();

      holder.currentUserId = ALICE;
      expect((await api.item.PUT(jsonRequest("PUT", api.put), ctx(record.id))).status).toBe(200);
      await a.engine.sync();

      expect(a.items()).toEqual([expect.objectContaining(rename)]);
    });

    it("removes one deleted on device A from device B, and it never comes back", async () => {
      const a = createDevice(network, ALICE, { kind });
      const b = createDevice(network, ALICE, { kind });
      a.add(record);
      await a.engine.sync();
      await b.engine.sync();
      expect(b.items()).toEqual([record]);

      a.tick(1_000);
      a.remove(record.id);
      await a.engine.sync();
      await b.engine.sync();
      await b.engine.sync();
      await a.engine.sync();

      expect(b.items()).toEqual([]);
      expect(a.items()).toEqual([]);
      expect(b.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });
    });

    it("stays deleted when an offline device with an older edit comes back", async () => {
      const a = createDevice(network, ALICE, { kind });
      const b = createDevice(network, ALICE, { kind });
      a.add(record);
      await a.engine.sync();
      await b.engine.sync();

      b.offline = true;
      b.tick(500);
      b.edit(record.id, rename);
      await b.engine.sync();

      a.tick(1_000);
      a.remove(record.id);
      await a.engine.sync();

      b.offline = false;
      await b.engine.sync();
      await a.engine.sync();

      expect(b.items()).toEqual([]);
      expect(a.items()).toEqual([]);
    });

    it.each([
      ["the earlier editor pushes first", ["a", "b"] as const],
      ["the later editor pushes first", ["b", "a"] as const],
    ])("settles edits from two devices on the latest one (%s)", async (_label, order) => {
      const devices = { a: createDevice(network, ALICE, { kind }), b: createDevice(network, ALICE, { kind }) };
      devices.a.add(record);
      await devices.a.engine.sync();
      await devices.b.engine.sync();

      devices.a.tick(1_000);
      devices.a.edit(record.id, { note: "older", description: "older", color: "#000000" });
      devices.b.tick(2_000);
      devices.b.edit(record.id, rename);
      for (const d of order) await devices[d].engine.sync();
      for (const d of order) await devices[d].engine.sync();

      expect(devices.a.items()).toEqual([expect.objectContaining({ ...rename })]);
      expect(devices.b.items()).toEqual([expect.objectContaining({ ...rename })]);
      expect(devices.a.items()[0]).toEqual(devices.b.items()[0]);
    });
  });
});
