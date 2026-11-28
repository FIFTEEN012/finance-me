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

import * as agentRoute from "@/app/api/agent/records/route";
import * as changesRoute from "@/app/api/sync/changes/route";
import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";
import { createAppDevice, createDevice, type DeviceNetwork } from "@/test/syncDevices";
import { APP_SYNC_KINDS } from "@/lib/sync/appKinds";
import { useNutritionStore } from "@/store/useNutritionStore";

const OWNER = "bot-owner";
const TOKEN = "bot-test-token";

const network: DeviceNetwork = {
  route: changesRoute,
  signInAs: (userId) => {
    holder.currentUserId = userId;
  },
};

function postFromBot(body: Record<string, unknown>) {
  return agentRoute.POST(
    new Request("http://localhost/api/agent/records", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ source: "hermes-discord", sourceMessageId: "msg-1", ...body }),
    }),
  );
}

const meal = {
  kind: "meal",
  idempotencyKey: "discord-meal-0001",
  data: {
    mealType: "lunch",
    food: "ข้าวมันไก่",
    calories: 650,
    proteinGrams: 30,
    carbsGrams: 80.5,
    fatGrams: 20,
    // 23:30 in Bangkok on the 25th = 16:30 UTC; the entry belongs to the 25th.
    loggedAt: "2026-11-25T16:30:00Z",
  },
};

const run = {
  kind: "run",
  idempotencyKey: "discord-run-0001",
  data: { distanceKm: 5, durationMinutes: 30, runType: "easy", loggedAt: "2026-11-26T06:00:00+07:00" },
};

const workout = {
  kind: "workout",
  idempotencyKey: "discord-workout-0001",
  data: { exercise: "มวยไทย", durationMinutes: 45, intensity: "hard", loggedAt: "2026-11-26T18:00:00+07:00" },
};

describe.skipIf(!integrationDbUrl())("bot records land on devices as Food Entries and Workout Sessions", () => {
  let t: TestDb | undefined;

  beforeAll(() => {
    process.env.DATABASE_URL = integrationDbUrl();
    process.env.DATA_BACKEND = "postgres";
    process.env.LOCAL_OWNER_ID = OWNER;
    process.env.AGENT_INGEST_TOKEN = TOKEN;
  });

  beforeEach(async () => {
    if (t) await t.close();
    t = await createTestDb();
    holder.db = t.db;
    await insertUser(t.db, OWNER);
    useNutritionStore.setState(useNutritionStore.getInitialState(), true);
  });

  afterAll(async () => {
    if (t) await t.close();
  });

  it("shows a meal from the bot as a Food Entry with its meal, kcal and macros", async () => {
    const response = await postFromBot(meal);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ status: "created", kind: "meal" });

    const app = createAppDevice(network, OWNER, APP_SYNC_KINDS);
    try {
      await app.engine.sync();
      expect(useNutritionStore.getState().food).toEqual([
        {
          id: expect.any(String),
          date: "2026-11-25",
          meal: "lunch",
          name: "ข้าวมันไก่",
          kcal: 650,
          proteinG: 30,
          carbsG: 80.5,
          fatG: 20,
          createdAt: expect.any(String),
        },
      ]);
    } finally {
      app.unregister();
    }
  });

  it("shows a meal without calories or macros as a 0 kcal Food Entry without macro fields", async () => {
    await postFromBot({ ...meal, data: { mealType: "snack", food: "กล้วย", loggedAt: meal.data.loggedAt } });

    const device = createDevice(network, OWNER, { kind: "food-entry" });
    await device.engine.sync();
    const [entry] = device.items();
    expect(entry).toMatchObject({ meal: "snack", name: "กล้วย", kcal: 0 });
    expect(entry).not.toHaveProperty("proteinG");
    expect(entry).not.toHaveProperty("carbsG");
    expect(entry).not.toHaveProperty("fatG");
  });

  it("shows a run as a running Workout Session whose minutes and burn count, using the profile weight", async () => {
    // Weight from the synced health profile: 8.3 MET × 70 kg × 0.5 h = 290.5 → 291 kcal.
    const profileDevice = createDevice(network, OWNER, { kind: "health-profile" });
    profileDevice.add({
      id: "health-profile",
      name: "profile",
      profile: { sex: "male", age: 30, heightCm: 175, weightKg: 70, activity: "light", goal: "lose", updatedAt: "" },
      calorieGoal: 2000,
      waterGoal: 2000,
    });
    await profileDevice.engine.sync();

    expect((await postFromBot(run)).status).toBe(201);

    const device = createDevice(network, OWNER, { kind: "workout-session" });
    await device.engine.sync();
    expect(device.items()).toEqual([
      {
        id: expect.any(String),
        date: "2026-11-26",
        activity: "run",
        name: "วิ่ง",
        minutes: 30,
        kcal: 291,
        createdAt: expect.any(String),
      },
    ]);
  });

  it("estimates a run's burn with the fallback weight when there is no profile", async () => {
    // 8.3 × 60 kg × 0.5 h = 249 kcal.
    await postFromBot(run);
    const device = createDevice(network, OWNER, { kind: "workout-session" });
    await device.engine.sync();
    expect(device.items()).toEqual([expect.objectContaining({ activity: "run", minutes: 30, kcal: 249 })]);
  });

  it("shows a workout of a type the app does not know as an 'other' session named as the bot sent it", async () => {
    await postFromBot(workout);
    const device = createDevice(network, OWNER, { kind: "workout-session" });
    await device.engine.sync();
    expect(device.items()).toEqual([
      expect.objectContaining({ date: "2026-11-26", activity: "other", name: "มวยไทย", minutes: 45, kcal: 0 }),
    ]);
  });

  it("maps a workout the app knows to its Session Type and estimates its burn", async () => {
    // Yoga: 2.5 MET × 60 kg × 1 h = 150 kcal.
    await postFromBot({ ...workout, data: { exercise: "Yoga", durationMinutes: 60, loggedAt: workout.data.loggedAt } });
    const device = createDevice(network, OWNER, { kind: "workout-session" });
    await device.engine.sync();
    expect(device.items()).toEqual([
      expect.objectContaining({ activity: "yoga", name: "โยคะ / ยืดเหยียด", minutes: 60, kcal: 150 }),
    ]);
  });

  it("does not duplicate a repeated message, still answers with the audit event, and lists it", async () => {
    const first = await (await postFromBot(meal)).json();
    const again = await postFromBot(meal);
    expect(again.status).toBe(200);
    const second = await again.json();
    expect(second).toMatchObject({ status: "deduplicated", kind: "meal" });
    expect(second.record).toEqual(first.record);
    expect(second.auditEvent).toEqual(first.auditEvent);
    expect(first.auditEvent).toMatchObject({ idempotencyKey: meal.idempotencyKey, recordId: first.record.id });

    const device = createDevice(network, OWNER, { kind: "food-entry" });
    await device.engine.sync();
    expect(device.items()).toHaveLength(1);

    const listed = await agentRoute.GET(
      new Request("http://localhost/api/agent/records", { headers: { authorization: `Bearer ${TOKEN}` } }),
    );
    const body = await listed.json();
    expect(body.total).toBe(1);
    expect(body.records).toEqual([expect.objectContaining({ kind: "meal", record: first.record })]);
  });

  it("does not bring back a bot Food Entry the user deleted when the bot resends the message", async () => {
    await postFromBot(meal);
    // The user deletes it later than the bot wrote it.
    const device = createDevice(network, OWNER, { kind: "food-entry", startAt: Date.now() + 60_000 });
    await device.engine.sync();
    device.remove(device.items()[0].id);
    await device.engine.sync();

    expect((await postFromBot(meal)).status).toBe(200);
    const other = createDevice(network, OWNER, { kind: "food-entry" });
    await other.engine.sync();
    expect(other.items()).toEqual([]);
  });

  it("still recognises meal, workout and run messages recorded before the change", async () => {
    const { sql } = t!;
    const [mealRow] = await sql`INSERT INTO meal_logs (owner_id, source, source_message_id, meal_type, food, calories, logged_at)
      VALUES (${OWNER}, 'hermes-discord', 'old-1', 'dinner', 'ส้มตำ', 300, '2026-10-01T12:00:00Z') RETURNING id`;
    const [runRow] = await sql`INSERT INTO running_logs (owner_id, source, source_message_id, distance_km, duration_minutes, run_type, logged_at)
      VALUES (${OWNER}, 'hermes-discord', 'old-2', 5, 30, 'easy', '2026-10-01T12:00:00Z') RETURNING id`;
    const [workoutRow] = await sql`INSERT INTO workout_logs (owner_id, source, source_message_id, exercise, sets, logged_at)
      VALUES (${OWNER}, 'hermes-discord', 'old-3', 'Squats', 3, '2026-10-01T12:00:00Z') RETURNING id`;
    const old = [
      { ...meal, idempotencyKey: "old-meal-0001", recordType: "meal", id: mealRow.id },
      { ...run, idempotencyKey: "old-run-0001", recordType: "run", id: runRow.id },
      { ...workout, idempotencyKey: "old-workout-0001", recordType: "workout", id: workoutRow.id },
    ];
    for (const o of old) {
      await sql`INSERT INTO agent_ingestion_events (owner_id, source, source_message_id, idempotency_key, record_type, record_id, payload)
        VALUES (${OWNER}, 'hermes-discord', 'old', ${o.idempotencyKey}, ${o.recordType}, ${o.id}, '{}')`;
    }

    for (const o of old) {
      const response = await postFromBot({ kind: o.kind, data: o.data, idempotencyKey: o.idempotencyKey });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        status: "deduplicated",
        kind: o.recordType,
        record: { id: o.id },
      });
    }
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM user_records`;
    expect(count).toBe(0);

    const listed = await (
      await agentRoute.GET(new Request("http://localhost/api/agent/records", { headers: { authorization: `Bearer ${TOKEN}` } }))
    ).json();
    expect(listed.total).toBe(3);
  });

  it("keeps writing transactions from the bot to the transactions table", async () => {
    const response = await postFromBot({
      kind: "transaction",
      idempotencyKey: "discord-tx-0001",
      data: { transactionType: "EXPENSE", amount: "50.00", description: "กาแฟ", occurredAt: "2026-11-26T09:00:00+07:00" },
    });
    expect(response.status).toBe(201);
    const [{ count }] = await t!.sql`SELECT count(*)::int AS count FROM finance_transactions WHERE owner_id = ${OWNER}`;
    expect(count).toBe(1);
  });
});
