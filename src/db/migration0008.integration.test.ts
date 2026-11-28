import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { createTestDb, insertUser, integrationDbUrl, type TestDb } from "@/test/pgTestDb";

const ALICE = "migrate-alice";
const BOB = "migrate-bob";

function migration0008Statements(): string[] {
  const file = path.resolve(process.cwd(), "drizzle", "0008_bot_records_to_user_records.sql");
  return readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

async function runMigration(sql: TestDb["sql"]) {
  await sql.begin(async (tx) => {
    for (const stmt of migration0008Statements()) await tx.unsafe(stmt);
  });
}

describe.skipIf(!integrationDbUrl())("migration 0008: bot meal/workout/run rows become user records", () => {
  let t: TestDb | undefined;

  afterAll(async () => {
    if (t) await t.close();
  });

  it("copies every existing row for its owner, once, as Food Entries and Workout Sessions", async () => {
    t = await createTestDb({ upToIdx: 6 });
    const { sql } = t;
    await insertUser(t.db, ALICE);
    await insertUser(t.db, BOB);
    // Alice weighs 70 kg; Bob has no profile (fallback 60 kg).
    await sql`INSERT INTO user_records (owner_id, kind, id, data, edited_at)
      VALUES (${ALICE}, 'health-profile', 'health-profile',
        ${JSON.stringify({ profile: { weightKg: 70 }, calorieGoal: 2000, waterGoal: 2000 })}::jsonb, now())`;

    const created = "2026-10-01T05:00:00.000Z";
    const updated = "2026-10-02T05:00:00.000Z";
    const [aliceMeal] = await sql`INSERT INTO meal_logs
      (owner_id, source, source_message_id, meal_type, food, calories, protein_grams, carbs_grams, fat_grams, cost, logged_at, created_at, updated_at)
      VALUES (${ALICE}, 'hermes-discord', 'm1', 'dinner', 'ส้มตำ', 300, 10.5, 40, 12, 60, '2026-09-30T17:30:00Z', ${created}, ${updated})
      RETURNING id`;
    const [bobMeal] = await sql`INSERT INTO meal_logs (owner_id, source, source_message_id, meal_type, food, logged_at, created_at, updated_at)
      VALUES (${BOB}, 'hermes-discord', 'm2', 'snack', 'กล้วย', '2026-10-01T03:00:00Z', ${created}, ${updated}) RETURNING id`;
    const [aliceRun] = await sql`INSERT INTO running_logs
      (owner_id, source, source_message_id, distance_km, duration_minutes, run_type, logged_at, created_at, updated_at)
      VALUES (${ALICE}, 'hermes-discord', 'r1', 5.25, 30, 'easy', '2026-10-01T00:00:00Z', ${created}, ${updated}) RETURNING id`;
    const [bobRun] = await sql`INSERT INTO running_logs
      (owner_id, source, source_message_id, distance_km, duration_minutes, run_type, logged_at, created_at, updated_at)
      VALUES (${BOB}, 'hermes-discord', 'r2', 3, 30, 'easy', '2026-10-01T00:00:00Z', ${created}, ${updated}) RETURNING id`;
    const [aliceBoxing] = await sql`INSERT INTO workout_logs
      (owner_id, source, source_message_id, exercise, duration_minutes, logged_at, created_at, updated_at)
      VALUES (${ALICE}, 'hermes-discord', 'w1', 'มวยไทย', 45, '2026-10-01T11:00:00Z', ${created}, ${updated}) RETURNING id`;
    const [aliceSquats] = await sql`INSERT INTO workout_logs
      (owner_id, source, source_message_id, exercise, sets, reps, logged_at, created_at, updated_at)
      VALUES (${ALICE}, 'hermes-discord', 'w2', 'Squats', 3, 12, '2026-10-01T11:00:00Z', ${created}, ${updated}) RETURNING id`;
    const [aliceYoga] = await sql`INSERT INTO workout_logs
      (owner_id, source, source_message_id, exercise, duration_minutes, logged_at, created_at, updated_at)
      VALUES (${ALICE}, 'hermes-discord', 'w3', ' YOGA ', 60, '2026-10-01T11:00:00Z', ${created}, ${updated}) RETURNING id`;
    // A row of an owner who has no account: nothing to show it to, skipped.
    await sql`INSERT INTO meal_logs (owner_id, source, source_message_id, meal_type, food, logged_at)
      VALUES ('no-such-user', 'hermes-discord', 'm3', 'lunch', 'ข้าว', now())`;

    await runMigration(sql);

    const rows = await sql`SELECT owner_id, kind, id, data, edited_at, deleted_at FROM user_records
      WHERE kind <> 'health-profile' ORDER BY owner_id, kind, id`;
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(rows).toHaveLength(7);
    for (const r of rows) {
      expect(r.deleted_at).toBeNull();
      expect(new Date(r.edited_at).toISOString()).toBe(updated);
    }

    expect(byId[aliceMeal.id]).toMatchObject({ owner_id: ALICE, kind: "food-entry" });
    expect(byId[aliceMeal.id].data).toEqual({
      id: aliceMeal.id,
      date: "2026-10-01",
      meal: "dinner",
      name: "ส้มตำ",
      kcal: 300,
      proteinG: 10.5,
      carbsG: 40,
      fatG: 12,
      createdAt: created,
    });
    expect(byId[bobMeal.id]).toMatchObject({ owner_id: BOB, kind: "food-entry" });
    expect(byId[bobMeal.id].data).toEqual({
      id: bobMeal.id,
      date: "2026-10-01",
      meal: "snack",
      name: "กล้วย",
      kcal: 0,
      createdAt: created,
    });

    // 8.3 MET × 70 kg × 0.5 h = 290.5 → 291; Bob: 8.3 × 60 × 0.5 = 249.
    expect(byId[aliceRun.id]).toMatchObject({ owner_id: ALICE, kind: "workout-session" });
    expect(byId[aliceRun.id].data).toEqual({
      id: aliceRun.id,
      date: "2026-10-01",
      activity: "run",
      name: "วิ่ง",
      minutes: 30,
      kcal: 291,
      createdAt: created,
    });
    expect(byId[bobRun.id].data).toMatchObject({ activity: "run", minutes: 30, kcal: 249 });
    expect(byId[aliceBoxing.id].data).toEqual({
      id: aliceBoxing.id,
      date: "2026-10-01",
      activity: "other",
      name: "มวยไทย",
      minutes: 45,
      kcal: 0,
      createdAt: created,
    });
    expect(byId[aliceSquats.id].data).toMatchObject({ activity: "other", name: "Squats", minutes: 0, kcal: 0 });
    // Yoga: 2.5 × 70 × 1 h = 175.
    expect(byId[aliceYoga.id].data).toMatchObject({
      activity: "yoga",
      name: "โยคะ / ยืดเหยียด",
      minutes: 60,
      kcal: 175,
    });

    // Old tables stay as they were.
    const [{ meals }] = await sql`SELECT count(*)::int AS meals FROM meal_logs`;
    expect(meals).toBe(3);

    // Re-running adds nothing and does not undo a later edit or delete.
    await sql`UPDATE user_records SET data = NULL, deleted_at = now(), edited_at = now()
      WHERE owner_id = ${ALICE} AND kind = 'food-entry' AND id = ${aliceMeal.id}`;
    await runMigration(sql);
    const after = await sql`SELECT id, data FROM user_records WHERE kind <> 'health-profile'`;
    expect(after).toHaveLength(7);
    expect(after.find((r) => r.id === aliceMeal.id)?.data).toBeNull();
  });
});
