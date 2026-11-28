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
import { appDevicePool, type DeviceNetwork } from "@/test/syncDevices";
import { APP_SYNC_KINDS } from "@/lib/sync/appKinds";
import { useRecurringStore } from "@/store/useRecurringStore";
import { useBillSplitStore } from "@/store/useBillSplitStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkoutPlanStore } from "@/store/useWorkoutPlanStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useTransactionStore } from "@/store/useTransactionStore";
import { generateDueAfterEachSync } from "@/lib/sync/recurringAfterSync";

const ALICE = "user-alice";

const network: DeviceNetwork = {
  route: changesRoute,
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

const STORES = [
  useRecurringStore,
  useBillSplitStore,
  useSettingsStore,
  useWorkoutPlanStore,
  useDashboardStore,
  useOnboardingStore,
  useTransactionStore,
];

const internet = {
  categoryId: "cat-expense-1",
  type: "EXPENSE" as const,
  amount: 500,
  description: "ค่าเน็ต",
  frequency: "monthly" as const,
  startDate: "2026-12-15",
};

describe.skipIf(!integrationDbUrl())("Recurring rules, bill splits, settings and the Workout Plan across devices", () => {
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

  it("shows recurring rules added, edited and deleted on one device on the other", async () => {
    const a = pool.create(ALICE);
    const b = pool.create(ALICE);

    pool.use(a);
    useRecurringStore.getState().addRecurring(internet);
    const id = useRecurringStore.getState().recurrings[0].id;
    await a.engine.sync();
    pool.use(b);
    await b.engine.sync();
    expect(useRecurringStore.getState().recurrings).toEqual([expect.objectContaining({ id, ...internet })]);

    b.tick(1_000);
    useRecurringStore.getState().updateRecurring(id, { ...internet, amount: 599 });
    await b.engine.sync();
    pool.use(a);
    await a.engine.sync();
    expect(useRecurringStore.getState().recurrings).toEqual([expect.objectContaining({ id, amount: 599 })]);

    a.tick(2_000);
    useRecurringStore.getState().deleteRecurring(id);
    await a.engine.sync();
    pool.use(b);
    await b.engine.sync();
    expect(useRecurringStore.getState().recurrings).toEqual([]);
  });

  it("shows bill splits added, paid and deleted on one device on the other", async () => {
    const a = pool.create(ALICE);
    const b = pool.create(ALICE);
    const dinner = {
      title: "หมูกระทะ",
      totalAmount: 900,
      currency: "THB",
      date: "2026-11-25",
      paidBy: "ฉัน",
      splitMode: "equal" as const,
      participants: [
        { id: "p-me", name: "ฉัน", share: 300, paid: true },
        { id: "p-bee", name: "บี", share: 300, paid: false },
        { id: "p-cee", name: "ซี", share: 300, paid: false },
      ],
    };

    pool.use(a);
    useBillSplitStore.getState().addSplit(dinner);
    const id = useBillSplitStore.getState().splits[0].id;
    await a.engine.sync();
    pool.use(b);
    await b.engine.sync();
    expect(useBillSplitStore.getState().splits).toEqual([expect.objectContaining({ id, ...dinner })]);

    b.tick(1_000);
    useBillSplitStore.getState().markPaid(id, "p-bee", true);
    await b.engine.sync();
    pool.use(a);
    await a.engine.sync();
    expect(useBillSplitStore.getState().getTotalOwedToMe()).toBe(300);

    a.tick(2_000);
    useBillSplitStore.getState().deleteSplit(id);
    await a.engine.sync();
    pool.use(b);
    await b.engine.sync();
    expect(useBillSplitStore.getState().splits).toEqual([]);
  });

  it("carries the user's settings to every device, and a new device's defaults do not overwrite them", async () => {
    const a = pool.create(ALICE);
    const b = pool.create(ALICE);

    pool.use(a);
    a.tick(1_000);
    useSettingsStore.getState().setPaydayDate(28);
    useSettingsStore.getState().update({ accentColor: "emerald", displayName: "อลิซ" });
    useSettingsStore.getState().setReportCoverImage("data:image/png;base64,AAAA");
    await a.engine.sync();

    pool.use(b);
    await b.engine.sync();
    expect(useSettingsStore.getState()).toMatchObject({
      paydayDate: 28,
      accentColor: "emerald",
      displayName: "อลิซ",
      reportCoverImage: "data:image/png;base64,AAAA",
    });

    b.tick(2_000);
    useSettingsStore.getState().setReportCoverImage(null);
    await b.engine.sync();
    pool.use(a);
    await a.engine.sync();
    expect(useSettingsStore.getState()).toMatchObject({ paydayDate: 28, reportCoverImage: null });
  });

  it("lets a Workout Plan started on one device be ticked on another; when ticks collide the latest wins", async () => {
    const a = pool.create(ALICE);
    const b = pool.create(ALICE);
    const plan = {
      activity: "strength",
      moves: [
        { moveId: "squat", sets: 2, count: 10, restSeconds: 60 },
        { moveId: "push-up", sets: 2, count: 8, restSeconds: 60 },
      ],
    };

    pool.use(a);
    a.tick(1_000);
    useWorkoutPlanStore.getState().startPlan(plan as never);
    await a.engine.sync();

    pool.use(b);
    await b.engine.sync();
    expect(useWorkoutPlanStore.getState().active?.plan).toEqual(plan);
    b.tick(2_000);
    useWorkoutPlanStore.getState().toggleSet(0, 0);
    await b.engine.sync();

    pool.use(a);
    await a.engine.sync();
    expect(useWorkoutPlanStore.getState().active?.done).toEqual([
      [true, false],
      [false, false],
    ]);

    // Both tick before either syncs: B's tick is the later one.
    a.tick(2_000); // a: 3s
    useWorkoutPlanStore.getState().toggleSet(1, 0);
    pool.use(b);
    b.tick(2_000); // b: 4s
    useWorkoutPlanStore.getState().toggleSet(0, 1);
    await b.engine.sync();
    pool.use(a);
    await a.engine.sync();
    pool.use(b);
    await b.engine.sync();

    const latest = [
      [true, true],
      [false, false],
    ];
    expect(useWorkoutPlanStore.getState().active?.done).toEqual(latest);
    pool.use(a);
    expect(useWorkoutPlanStore.getState().active?.done).toEqual(latest);
  });

  it("keeps the dashboard layout and onboarding progress on the device they were set on", async () => {
    const a = pool.create(ALICE);
    const b = pool.create(ALICE);
    const defaultLayout = useDashboardStore.getInitialState().widgets;

    pool.use(a);
    a.tick(1_000);
    useDashboardStore.getState().setVisible("spending-heatmap", false);
    useDashboardStore.getState().reorder("health-score", "summary-cards");
    useOnboardingStore.getState().complete();
    await a.engine.sync();

    pool.use(b);
    await b.engine.sync();
    expect(useDashboardStore.getState().widgets).toEqual(defaultLayout);
    expect(useOnboardingStore.getState()).toMatchObject({ completed: false, step: 0 });

    b.tick(2_000);
    useOnboardingStore.getState().setStep(2);
    await b.engine.sync();
    pool.use(a);
    await a.engine.sync();
    expect(useOnboardingStore.getState()).toMatchObject({ completed: true, step: 0 });
    expect(useDashboardStore.getState().widgets[0].id).toBe("health-score");
  });

  describe("when a recurring rule falls due", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-12-01T09:00:00"));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("records its transaction on one device only, not again on a device that synced after", async () => {
      const a = pool.create(ALICE);
      const b = pool.create(ALICE);
      pool.use(a);
      useRecurringStore.getState().addRecurring(internet);
      await a.engine.sync();
      pool.use(b);
      await b.engine.sync();

      vi.setSystemTime(new Date("2026-12-20T09:00:00"));
      pool.use(a);
      a.tick(1_000);
      expect(useRecurringStore.getState().generateDue()).toBe(1);
      await a.engine.sync();

      pool.use(b);
      await b.engine.sync();
      expect(useRecurringStore.getState().generateDue()).toBe(0);
      // B has A's transaction, synced, and no second one.
      expect(useTransactionStore.getState().transactions).toEqual([
        expect.objectContaining({ date: "2026-12-15", amount: 500 }),
      ]);
      expect(useRecurringStore.getState().recurrings[0].lastGeneratedDate).toBe("2026-12-15");
    });

    it("waits for a sync before recording, so a device opened later does not record it again", async () => {
      const a = pool.create(ALICE);
      const b = pool.create(ALICE);
      pool.use(a);
      useRecurringStore.getState().addRecurring(internet);
      await a.engine.sync();
      pool.use(b);
      await b.engine.sync();

      vi.setSystemTime(new Date("2026-12-20T09:00:00"));
      pool.use(a);
      a.tick(1_000);
      const recordedOnA: number[] = [];
      const stopA = generateDueAfterEachSync(a.engine, (n) => recordedOnA.push(n));
      expect(recordedOnA).toEqual([]); // nothing before the first sync
      await a.engine.sync();
      stopA();
      expect(recordedOnA).toEqual([1]);
      await a.engine.sync(); // pushes the rule's new cursor

      // B was last synced before the rule fell due: its local copy still says "due".
      pool.use(b);
      b.tick(2_000);
      const recordedOnB: number[] = [];
      const stopB = generateDueAfterEachSync(b.engine, (n) => recordedOnB.push(n));
      expect(recordedOnB).toEqual([]);
      await b.engine.sync();
      stopB();
      expect(recordedOnB).toEqual([]);
      // B has A's transaction, synced, and did not record another.
      expect(useTransactionStore.getState().transactions).toEqual([
        expect.objectContaining({ date: "2026-12-15", amount: 500 }),
      ]);
    });
  });
});
