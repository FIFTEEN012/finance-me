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

import { createStore } from "zustand/vanilla";
import * as changesRoute from "@/app/api/sync/changes/route";
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";
import { createAppDevice, type DeviceNetwork } from "@/test/syncDevices";
import { APP_SYNC_KINDS } from "@/lib/sync/appKinds";
import { investmentKinds, monthlyExpenseKinds } from "@/lib/sync/investmentKinds";
import { useInvestmentStore } from "@/store/useInvestmentStore";
import { useMonthlyExpenseStore } from "@/store/useMonthlyExpenseStore";
import type {
  DividendRecord,
  InvestmentHolding,
  InvestmentOrder,
  MonthlyExpenseLog,
  PortfolioSnapshot,
} from "@/types";

const ALICE = "user-alice";

const network: DeviceNetwork = {
  route: changesRoute,
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

type PortfolioState = {
  holdings: InvestmentHolding[];
  portfolioSnapshots: PortfolioSnapshot[];
  dividends: DividendRecord[];
  orders: InvestmentOrder[];
};
type MonthlyState = { logs: MonthlyExpenseLog[]; trackedCategoryIds: string[] };

/** Another browser of the same user: its own copy of both stores, bound by the app's adapters. */
function otherBrowser() {
  const portfolio = createStore<PortfolioState>(() => ({
    holdings: [],
    portfolioSnapshots: [],
    dividends: [],
    orders: [],
  }));
  const monthly = createStore<MonthlyState>(() => ({ logs: [], trackedCategoryIds: [] }));
  const device = createAppDevice(network, ALICE, [...investmentKinds(portfolio), ...monthlyExpenseKinds(monthly)]);
  return Object.assign(device, { portfolio, monthly });
}

function resetAppStores() {
  useInvestmentStore.setState({ holdings: [], portfolioSnapshots: [], dividends: [], orders: [] });
  useMonthlyExpenseStore.setState({ logs: [], trackedCategoryIds: [] });
}

const pttHolding = {
  name: "PTT",
  ticker: "PTT",
  assetClass: "stock" as const,
  units: 100,
  currency: "THB",
  avgCostPerUnit: 33,
  currentPricePerUnit: 35,
  color: "#10b981",
};

describe.skipIf(!integrationDbUrl())("Portfolio and monthly expense logs sync across devices", () => {
  let t: TestDb | undefined;

  beforeAll(() => {
    process.env.DATABASE_URL = integrationDbUrl();
  });

  beforeEach(async () => {
    if (t) await t.close();
    t = await createTestDb();
    holder.db = t.db;
    await insertUser(t.db, ALICE);
    resetAppStores();
  });

  afterAll(async () => {
    if (t) await t.close();
  });

  it("matches holdings added, edited and deleted on one device on the other", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = otherBrowser();
    try {
      const id = useInvestmentStore.getState().addHolding(pttHolding);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.portfolio.getState().holdings).toEqual([expect.objectContaining({ id, ...pttHolding })]);

      app.tick(1_000);
      useInvestmentStore.getState().updatePrice(id, 40);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.portfolio.getState().holdings).toEqual([
        expect.objectContaining({ id, currentPricePerUnit: 40 }),
      ]);

      app.tick(1_000);
      useInvestmentStore.getState().deleteHolding(id);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.portfolio.getState().holdings).toEqual([]);
    } finally {
      app.unregister();
      other.unregister();
    }
  });

  it("keeps a buy order linked to its transaction, and syncs orders and dividends removed with their holding as deletes", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = otherBrowser();
    try {
      const store = useInvestmentStore.getState();
      const holdingId = store.recordBuyOrder({
        id: "order-1",
        holding: { name: "SCB", assetClass: "stock", color: "#6366f1" },
        transactionId: "tx-buy-1",
        feeTransactionId: "tx-fee-1",
        units: 10,
        pricePerUnit: 120,
        fee: 15,
        currency: "THB",
        date: "2026-11-20",
      })!;
      store.addDividend({ holdingId, amountPerUnit: 2, totalAmount: 20, date: "2026-11-25" });
      const dividendId = useInvestmentStore.getState().dividends[0].id;
      await app.engine.sync();
      await other.engine.sync();

      expect(other.portfolio.getState().holdings).toEqual([
        expect.objectContaining({ id: holdingId, name: "SCB", units: 10 }),
      ]);
      expect(other.portfolio.getState().orders).toEqual([
        expect.objectContaining({
          id: "order-1",
          holdingId,
          transactionId: "tx-buy-1",
          feeTransactionId: "tx-fee-1",
        }),
      ]);
      expect(other.portfolio.getState().dividends).toEqual([
        expect.objectContaining({ id: dividendId, holdingId, totalAmount: 20 }),
      ]);

      app.tick(1_000);
      useInvestmentStore.getState().deleteHolding(holdingId);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.portfolio.getState()).toMatchObject({ holdings: [], orders: [], dividends: [] });

      // A browser that signs in later gets nothing back either.
      const late = otherBrowser();
      try {
        await late.engine.sync();
        expect(late.portfolio.getState()).toMatchObject({ holdings: [], orders: [], dividends: [] });
      } finally {
        late.unregister();
      }
    } finally {
      app.unregister();
      other.unregister();
    }
  });

  it("matches portfolio snapshots by date: retaking today's replaces it, removing one removes it everywhere", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = otherBrowser();
    try {
      const today = new Date().toISOString().slice(0, 10);
      const older: PortfolioSnapshot = { date: "2026-01-15", totalValueTHB: 900, totalCostTHB: 800 };
      other.portfolio.setState({ portfolioSnapshots: [older] });
      useInvestmentStore.getState().takePortfolioSnapshot(1_000, 950);
      await app.engine.sync();
      await other.engine.sync();
      await app.engine.sync();

      const byDate = (s: PortfolioSnapshot[]) => [...s].sort((x, y) => x.date.localeCompare(y.date));
      const both = [older, { date: today, totalValueTHB: 1_000, totalCostTHB: 950 }];
      expect(byDate(other.portfolio.getState().portfolioSnapshots)).toEqual(both);
      expect(byDate(useInvestmentStore.getState().portfolioSnapshots)).toEqual(both);

      app.tick(1_000);
      useInvestmentStore.getState().takePortfolioSnapshot(1_200, 950);
      await app.engine.sync();
      other.tick(2_000);
      other.portfolio.setState((s) => ({ portfolioSnapshots: s.portfolioSnapshots.filter((p) => p.date !== older.date) }));
      await other.engine.sync();
      await app.engine.sync();

      const latest = [{ date: today, totalValueTHB: 1_200, totalCostTHB: 950 }];
      expect(other.portfolio.getState().portfolioSnapshots).toEqual(latest);
      expect(useInvestmentStore.getState().portfolioSnapshots).toEqual(latest);
    } finally {
      app.unregister();
      other.unregister();
    }
  });

  it("matches monthly expense logs and tracked categories; untracking removes that category's logs everywhere", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = otherBrowser();
    try {
      const monthly = useMonthlyExpenseStore.getState();
      monthly.trackCategory("cat-electric");
      monthly.trackCategory("cat-water");
      monthly.upsertLog({ categoryId: "cat-electric", year: 2026, month: 10, amount: 1_500 });
      monthly.upsertLog({ categoryId: "cat-water", year: 2026, month: 10, amount: 300 });
      await app.engine.sync();
      await other.engine.sync();

      expect([...other.monthly.getState().trackedCategoryIds].sort()).toEqual(["cat-electric", "cat-water"]);
      expect(other.monthly.getState().logs).toHaveLength(2);

      app.tick(1_000);
      useMonthlyExpenseStore.getState().upsertLog({ categoryId: "cat-electric", year: 2026, month: 10, amount: 1_650 });
      await app.engine.sync();
      await other.engine.sync();
      expect(other.monthly.getState().logs).toContainEqual(
        expect.objectContaining({ categoryId: "cat-electric", month: 10, amount: 1_650 }),
      );

      app.tick(1_000);
      useMonthlyExpenseStore.getState().untrackCategory("cat-electric");
      await app.engine.sync();
      await other.engine.sync();
      expect(other.monthly.getState().trackedCategoryIds).toEqual(["cat-water"]);
      expect(other.monthly.getState().logs).toEqual([
        expect.objectContaining({ categoryId: "cat-water", amount: 300 }),
      ]);

      app.tick(1_000);
      const waterLog = useMonthlyExpenseStore.getState().logs[0];
      useMonthlyExpenseStore.getState().deleteLog(waterLog.id);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.monthly.getState().logs).toEqual([]);
    } finally {
      app.unregister();
      other.unregister();
    }
  });

  it("syncs holdings imported from a portfolio image", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = otherBrowser();
    try {
      const existingId = useInvestmentStore.getState().addHolding(pttHolding);
      await app.engine.sync();
      await other.engine.sync();

      app.tick(1_000);
      useInvestmentStore.getState().importHoldings([
        {
          targetHoldingId: existingId,
          holding: {
            name: "PTT",
            ticker: "PTT",
            assetClass: "stock",
            currency: "THB",
            units: 150,
            avgCostPerUnit: 34,
            currentPricePerUnit: 36,
          },
        },
        {
          targetHoldingId: null,
          holding: {
            name: "Bitcoin",
            ticker: "BTC",
            assetClass: "crypto",
            currency: "USD",
            units: 0.5,
            avgCostPerUnit: 60_000,
            currentPricePerUnit: 90_000,
          },
        },
      ]);
      await app.engine.sync();
      await other.engine.sync();

      const byName = (h: InvestmentHolding[]) => [...h].sort((x, y) => x.name.localeCompare(y.name));
      expect(byName(other.portfolio.getState().holdings)).toEqual(byName(useInvestmentStore.getState().holdings));
      expect(other.portfolio.getState().holdings).toContainEqual(
        expect.objectContaining({ id: existingId, units: 150 }),
      );
      expect(other.portfolio.getState().holdings).toHaveLength(2);
    } finally {
      app.unregister();
      other.unregister();
    }
  });

  it("deletes a single order or dividend on the other device too", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = otherBrowser();
    try {
      const holdingId = useInvestmentStore.getState().addHolding(pttHolding);
      useInvestmentStore.getState().recordBuyOrder({
        id: "order-2",
        holdingId,
        transactionId: "tx-buy-2",
        units: 5,
        pricePerUnit: 36,
        fee: 0,
        currency: "THB",
        date: "2026-11-21",
      });
      useInvestmentStore.getState().addDividend({ holdingId, amountPerUnit: 1, totalAmount: 105, date: "2026-11-22" });
      const dividendId = useInvestmentStore.getState().dividends[0].id;
      await app.engine.sync();
      await other.engine.sync();
      expect(other.portfolio.getState().orders).toHaveLength(1);
      expect(other.portfolio.getState().dividends).toHaveLength(1);

      app.tick(1_000);
      useInvestmentStore.getState().deleteInvestmentOrder("order-2");
      useInvestmentStore.getState().deleteDividend(dividendId);
      await app.engine.sync();
      await other.engine.sync();

      expect(other.portfolio.getState()).toMatchObject({ orders: [], dividends: [] });
      expect(other.portfolio.getState().holdings).toEqual([expect.objectContaining({ id: holdingId, units: 105 })]);
    } finally {
      app.unregister();
      other.unregister();
    }
  });
});
