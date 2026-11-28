-- #31: one-time copy of the bot's meal_logs / workout_logs / running_logs rows
-- into user_records, so they reach devices as Food Entries and Workout
-- Sessions. Same mapping as src/lib/agentIngestion/botRecords.ts. The record
-- id is the old row's uuid, so re-running inserts nothing (ON CONFLICT DO
-- NOTHING) and never undoes a later edit or delete. Rows whose owner has no
-- account are skipped. The old tables are left as they are.
INSERT INTO "user_records" ("owner_id", "kind", "id", "data", "edited_at")
SELECT m."owner_id", 'food-entry', m."id"::text,
  jsonb_strip_nulls(jsonb_build_object(
    'id', m."id"::text,
    'date', to_char((m."logged_at" AT TIME ZONE 'UTC') + interval '7 hours', 'YYYY-MM-DD'),
    'meal', m."meal_type",
    'name', m."food",
    'kcal', coalesce(m."calories", 0),
    'proteinG', m."protein_grams"::float8,
    'carbsG', m."carbs_grams"::float8,
    'fatG', m."fat_grams"::float8,
    'createdAt', to_char(m."created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )),
  m."updated_at"
FROM "meal_logs" m
WHERE EXISTS (SELECT 1 FROM "user" u WHERE u."id" = m."owner_id")
ON CONFLICT ("owner_id", "kind", "id") DO NOTHING;
--> statement-breakpoint
-- Session Types: EXERCISES in src/lib/fitness.ts (key, Thai label, MET).
-- Weight: the user's health profile, else the app's fallback 60 kg.
INSERT INTO "user_records" ("owner_id", "kind", "id", "data", "edited_at")
WITH "exercises" ("value", "label", "met") AS (VALUES
  ('walk', 'เดิน', 3.5), ('brisk_walk', 'เดินเร็ว', 4.3), ('run', 'วิ่ง', 8.3),
  ('cycle', 'ปั่นจักรยาน', 6.8), ('swim', 'ว่ายน้ำ', 6), ('weights', 'เวทเทรนนิ่ง', 5),
  ('hiit', 'HIIT / คาร์ดิโอหนัก', 8), ('aerobic', 'แอโรบิก / เต้น', 6.5), ('yoga', 'โยคะ / ยืดเหยียด', 2.5),
  ('football', 'ฟุตบอล', 7), ('badminton', 'แบดมินตัน', 5.5), ('other', 'อื่น ๆ', 0)
),
"weights" ("owner_id", "weight_kg") AS (
  SELECT r."owner_id", (r."data"->'profile'->>'weightKg')::numeric
  FROM "user_records" r
  WHERE r."kind" = 'health-profile' AND r."id" = 'health-profile'
    AND jsonb_typeof(r."data"->'profile'->'weightKg') = 'number'
    AND (r."data"->'profile'->>'weightKg')::numeric > 0
),
"sessions" AS (
  SELECT w."owner_id", w."id", w."logged_at", w."created_at", w."updated_at",
    coalesce(e."value", 'other') AS "activity",
    CASE WHEN e."value" IS NULL OR e."value" = 'other' THEN w."exercise" ELSE e."label" END AS "name",
    coalesce(w."duration_minutes", 0) AS "minutes",
    coalesce(e."met", 0) AS "met"
  FROM "workout_logs" w
  LEFT JOIN "exercises" e
    ON lower(btrim(w."exercise", E' \t\r\n')) IN (e."value", lower(e."label"))
  UNION ALL
  SELECT r."owner_id", r."id", r."logged_at", r."created_at", r."updated_at",
    'run', 'วิ่ง', r."duration_minutes", 8.3
  FROM "running_logs" r
)
SELECT s."owner_id", 'workout-session', s."id"::text,
  jsonb_build_object(
    'id', s."id"::text,
    'date', to_char((s."logged_at" AT TIME ZONE 'UTC') + interval '7 hours', 'YYYY-MM-DD'),
    'activity', s."activity",
    'name', s."name",
    'minutes', s."minutes",
    'kcal', CASE WHEN s."met" <= 0 OR s."minutes" <= 0 THEN 0
      ELSE round(s."met" * coalesce(wt."weight_kg", 60) * s."minutes" / 60.0)::int END,
    'createdAt', to_char(s."created_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ),
  s."updated_at"
FROM "sessions" s
LEFT JOIN "weights" wt ON wt."owner_id" = s."owner_id"
WHERE EXISTS (SELECT 1 FROM "user" u WHERE u."id" = s."owner_id")
ON CONFLICT ("owner_id", "kind", "id") DO NOTHING;
