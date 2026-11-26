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
import { useNutritionStore } from "@/store/useNutritionStore";
import { useTransactionStore } from "@/store/useTransactionStore";

const ALICE = "user-alice";

const network: DeviceNetwork = {
  route: changesRoute,
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

const lunch = { date: "2026-11-26", meal: "lunch" as const, name: "ข้าวผัด", kcal: 600 };

describe.skipIf(!integrationDbUrl())("Health records sync across devices", () => {
  let t: TestDb | undefined;

  beforeAll(() => {
    process.env.DATABASE_URL = integrationDbUrl();
  });

  beforeEach(async () => {
    if (t) await t.close();
    t = await createTestDb();
    holder.db = t.db;
    await insertUser(t.db, ALICE);
    useNutritionStore.setState(useNutritionStore.getInitialState(), true);
  });

  afterAll(async () => {
    if (t) await t.close();
  });

  it("shows Food Entries added, edited and deleted on one device on the other", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = createDevice(network, ALICE, { kind: "food-entry" });
    try {
      const id = useNutritionStore.getState().addFood(lunch);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.items()).toEqual([expect.objectContaining({ id, ...lunch })]);

      app.tick(1_000);
      useNutritionStore.getState().updateFood(id, { ...lunch, kcal: 550 });
      await app.engine.sync();
      await other.engine.sync();
      expect(other.items()).toEqual([expect.objectContaining({ id, kcal: 550 })]);

      other.tick(2_000);
      other.remove(id);
      await other.engine.sync();
      await app.engine.sync();
      expect(useNutritionStore.getState().food).toEqual([]);
    } finally {
      app.unregister();
    }
  });

  it("keeps a Food Entry linked to its Food Expense on the other device, and deleting the expense unlinks it everywhere", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = createDevice(network, ALICE, { kind: "food-entry" });
    try {
      const expenseId = "33333333-3333-4333-8333-333333333333";
      const [id] = useNutritionStore.getState().addFoodForExpense(expenseId, [lunch]);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.items()).toEqual([expect.objectContaining({ id, foodExpenseId: expenseId })]);

      app.tick(1_000);
      useTransactionStore.getState().deleteTransaction(expenseId);
      await app.engine.sync();
      await other.engine.sync();

      expect(other.items()).toEqual([expect.objectContaining({ id, ...lunch })]);
      expect(other.items()[0]).not.toHaveProperty("foodExpenseId");
    } finally {
      app.unregister();
    }
  });

  it("shows water added and deleted on one device on the other", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = createDevice(network, ALICE, { kind: "water-entry" });
    try {
      const id = useNutritionStore.getState().addWater("2026-11-26", 250);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.items()).toEqual([expect.objectContaining({ id, date: "2026-11-26", ml: 250 })]);

      app.tick(1_000);
      useNutritionStore.getState().deleteWater(id);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.items()).toEqual([]);
    } finally {
      app.unregister();
    }
  });

  it("keeps a Workout Session's Moves, rest and plan format whole on the other device", async () => {
    const app = createAppDevice(network, ALICE, APP_SYNC_KINDS);
    const other = createDevice(network, ALICE, { kind: "workout-session" });
    try {
      const session = {
        date: "2026-11-26",
        activity: "strength",
        name: "เวท",
        minutes: 30,
        kcal: 200,
        moves: [
          { moveId: "squat", sets: 3, count: 12, restSeconds: 60 },
          { moveId: "plank", sets: 2, count: 45, restSeconds: 30 },
        ],
        planFormat: "circuit" as const,
      };
      useNutritionStore.getState().addExercise(session);
      const id = useNutritionStore.getState().exercise[0].id;
      await app.engine.sync();
      await other.engine.sync();
      expect(other.items()).toEqual([expect.objectContaining({ id, ...session })]);

      other.tick(1_000);
      other.edit(id, { minutes: 35 });
      await other.engine.sync();
      await app.engine.sync();
      expect(useNutritionStore.getState().exercise).toEqual([
        expect.objectContaining({ ...session, id, minutes: 35 }),
      ]);

      app.tick(2_000);
      useNutritionStore.getState().deleteExercise(id);
      await app.engine.sync();
      await other.engine.sync();
      expect(other.items()).toEqual([]);
    } finally {
      app.unregister();
    }
  });

  describe("the health profile (one per user)", () => {
    const profile = {
      sex: "female" as const,
      age: 30,
      heightCm: 160,
      weightKg: 55,
      activity: "light" as const,
      goal: "lose" as const,
    };
    const start = Date.parse("2026-11-26T00:00:00Z");

    /** Opens the app on another browser: its own empty stores and storage. */
    async function openOnAnotherDevice(startAt: number) {
      useNutritionStore.setState(useNutritionStore.getInitialState(), true);
      const device = createAppDevice(network, ALICE, APP_SYNC_KINDS, { startAt });
      await device.engine.sync();
      return device;
    }

    it("gives every device the same profile and the same calorie and water targets", async () => {
      const laptop = createAppDevice(network, ALICE, APP_SYNC_KINDS, { startAt: start });
      try {
        useNutritionStore.getState().setProfile(profile);
        useNutritionStore.getState().setGoals(1700, 2100);
        await laptop.engine.sync();
      } finally {
        laptop.unregister();
      }

      const phone = await openOnAnotherDevice(start + 1_000);
      try {
        expect(useNutritionStore.getState()).toMatchObject({ profile, calorieGoal: 1700, waterGoal: 2100 });

        phone.tick(1_000);
        useNutritionStore.getState().setProfile({ ...profile, weightKg: 53 });
        useNutritionStore.getState().setGoals(1650, 2050);
        await phone.engine.sync();
      } finally {
        phone.unregister();
      }

      const tablet = await openOnAnotherDevice(start + 5_000);
      try {
        expect(useNutritionStore.getState()).toMatchObject({
          profile: { ...profile, weightKg: 53 },
          calorieGoal: 1650,
          waterGoal: 2050,
        });
        expect(tablet.engine.getStatus()).toMatchObject({ state: "synced", pending: 0 });
      } finally {
        tablet.unregister();
      }
    });

    it("does not let a device without a profile overwrite the saved one", async () => {
      const laptop = createAppDevice(network, ALICE, APP_SYNC_KINDS, { startAt: start });
      try {
        useNutritionStore.getState().setProfile(profile);
        useNutritionStore.getState().setGoals(1700, 2100);
        await laptop.engine.sync();
      } finally {
        laptop.unregister();
      }

      // A newer device clock, but nothing entered there: its defaults are not an edit.
      const phone = await openOnAnotherDevice(start + 60_000);
      phone.unregister();
      const tablet = await openOnAnotherDevice(start + 120_000);
      tablet.unregister();

      expect(useNutritionStore.getState()).toMatchObject({ profile, calorieGoal: 1700, waterGoal: 2100 });
    });
  });
});
