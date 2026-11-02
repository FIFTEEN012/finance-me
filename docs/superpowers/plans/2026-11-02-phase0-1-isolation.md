# Phase 0–1: Cleanup and Per-Owner Data Isolation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead code and the cycle feature, add CI, and make every synced table safe for multiple owners (composite `(owner_id, id)` keys, default-category backfill), proven by tests against a real Postgres.

**Architecture:** Keep the Next.js route handlers and Drizzle schema; change primary keys of five tables to `(owner_id, id)` through one migration (`0003`) that also backfills the 14 default categories per user. Behaviour is proven by integration tests that run the real migrations on a throwaway `*_test` Postgres database and call the route handlers with a switchable current user.

**Tech Stack:** Next.js 16.2.2 (read `node_modules/next/dist/docs/` before changing route handlers — see `AGENTS.md`), TypeScript, Drizzle ORM 0.45 + drizzle-kit 0.31, postgres.js, Vitest 4, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-02-multi-user-sync-design.md` (§3 data model, §6 cleanup, §7 phases 0–1, §8 production data). Out of scope here: delta sync, `finance_documents`, `deleted_at`, quotas (Phases 2–4).

**Branching:** create `feat/multi-user-isolation` from `feat/gemini-ai-import` (it contains the `/api/sync` and debt changes edited here); rebase onto `master` once that branch merges.

## Global Constraints

- Composite primary key `(owner_id, id)` on `finance_transactions`, `finance_categories`, `finance_budgets`, `finance_goals`, `finance_debts`; `owner_id` always comes from the session, never from the request body.
- Do not change `identityAndAuditColumns` or the agent-ingestion tables (`meal_logs`, `workout_logs`, `running_logs`, `agent_ingestion_events`); override `id` inside `finance_transactions` only.
- `deleted_at` is **not** added in this plan; it ships with the Phase 2 migration together with the code that reads it (deviation from the spec's Part 1 item 2, to avoid dead schema; flag it in the review).
- Default categories are exactly the 14 in `src/lib/defaultCategories.ts` (`cat-income-1..4`, `cat-expense-1..9`, `cat-transfer-1`); Thai text must survive byte-for-byte.
- Integration tests must refuse to run unless the database name ends with `_test` (they drop schemas).
- Commit messages carry no AI-attribution trailers (owner's standing git rule).
- Commands are PowerShell on Windows. The Linux sandbox used while planning cannot run Vitest (Windows-built `node_modules`).
- Production database is touched only by the owner, following the Task 9 runbook, after a Neon snapshot.

## Review Focus

1. Same `id` for two owners in every one of the five tables must both insert and stay separate (Task 5, 6).
2. A request body carrying a foreign `ownerId` must be stored under the session user (Task 5).
3. `PUT`/`DELETE` on another owner's id must return 404, indistinguishable from a missing id, and leave the row unchanged (Task 7).
4. Running the backfill twice, or on a user who customised a default category, must not duplicate or overwrite anything (Task 8).
5. A brand-new user with empty payloads must get empty results from `GET /api/sync`, not an error (Task 7).

---

### Task 1: Line endings and spec correction

**Files:**
- Create: `.gitattributes`
- Modify: `docs/superpowers/specs/2026-11-02-multi-user-sync-design.md` (§6 cleanup item 1)

**Interfaces:**
- Produces: LF line endings enforced for every contributor and for CI.

- [ ] **Step 1:** Run `git config core.autocrlf` and record the value (expected `true` on the owner's Windows Git).
- [ ] **Step 2:** Create `.gitattributes` containing `* text=auto eol=lf`.
- [ ] **Step 3:** Run `git add --renormalize .` then `git status --short`. Expected: only `.gitattributes` staged. If other files appear, they were stored with CRLF; commit them separately as `chore: normalize line endings` before continuing.
- [ ] **Step 4:** In the spec, replace cleanup item 1 with: line endings were not a problem on Windows (`core.autocrlf=true`); the noisy diffs seen on 2026-11-01 came from running Git inside a Linux sandbox; `.gitattributes` makes behaviour identical everywhere.
- [ ] **Step 5:** Commit `chore: enforce LF line endings with .gitattributes`.

### Task 2: Remove the menstrual-cycle feature

**Files:**
- Delete: `src/app/cycle/`, `src/components/cycle/`, `src/store/useCycleStore.ts`, `src/types/cycle.ts`
- Modify: `src/types/index.ts` (remove the `Cycle*` re-export block; keep `SubscriptionBillingCycle`), `src/components/layout/BottomNav.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `src/components/shared/GlobalSearch.tsx` (remove the `/cycle` entries and the unused `Droplets` import), `src/lib/cloudSync.ts`
- Test: `src/lib/cloudSync.test.ts`

**Interfaces:**
- Consumes: `SYNC_STORE_KEYS` and `rehydrateAllStores` exported from `src/lib/cloudSync.ts` (used by `DataManager.tsx`, `useInitialData.ts`).
- Produces: `SYNC_STORE_KEYS` without `'finance-cycle'`.

- [ ] **Step 1:** Write failing test in `cloudSync.test.ts`: `it("does not sync the removed cycle store")` asserting `SYNC_STORE_KEYS` does not contain `"finance-cycle"`. Run `npx vitest run src/lib/cloudSync.test.ts` → FAIL.
- [ ] **Step 2:** Delete the four paths above and remove the UI/type references. Do not touch `cycleStartDay`, `PaydayCountdown.tsx` or `SubscriptionBillingCycle` (salary/billing cycles, unrelated).
- [ ] **Step 3:** In `cloudSync.ts` remove `useCycleStore` from the dynamic imports and the `stores` array; move `'finance-cycle'` from `SYNC_STORE_KEYS` to `REMOVED_SYNC_STORE_KEYS`. Read how `REMOVED_SYNC_STORE_KEYS` is used first; if it deletes local data on load, say so in the commit body (owner confirmed both users exported).
- [ ] **Step 4:** Verify: `npx tsc --noEmit` exits 0; `npx vitest run` passes; `git grep -n "useCycleStore\|/cycle'" src` prints nothing; `npx next build` succeeds.
- [ ] **Step 5:** Commit `feat!: remove menstrual-cycle feature`.

### Task 3: Remove dead Supabase code

**Files:**
- Delete: `src/hooks/useSupabaseSync.ts` (no importers), `src/lib/supabase.ts`, `supabase-schema.sql`
- Modify: `src/lib/cloudSync.ts` (remove the Supabase push/pull functions and the `supabase` import; keep `SYNC_STORE_KEYS`, `rehydrateAllStores`, and `SyncResult` if still referenced), `src/store/useAuthStore.ts`, `package.json`, `package-lock.json`
- Test: `src/lib/cloudSync.test.ts`

**Interfaces:**
- Produces: `export interface AuthUser { id: string; email: string; name?: string | null }` in `useAuthStore.ts` (add only fields the code reads) replacing the Supabase `User` type.

- [ ] **Step 1:** `git grep -n "pushToCloud\|pullFromCloud\|isCloudEnabled\|from '@/lib/supabase'\|supabase-js" src` — record every caller of the functions to be removed; update or delete the matching cases in `cloudSync.test.ts` and keep tests for the exports that stay.
- [ ] **Step 2:** Replace `import type { User } from '@supabase/supabase-js'` with the `AuthUser` interface; run `npx tsc --noEmit` to find fields the code needs.
- [ ] **Step 3:** Delete the files and functions listed; run `npm uninstall @supabase/supabase-js`.
- [ ] **Step 4:** Verify: `npx tsc --noEmit`, `npx vitest run`, `npx next build` all succeed; `git grep -in supabase src package.json` shows no code references.
- [ ] **Step 5:** Commit `chore: remove unused Supabase sync code and dependency`.

### Task 4: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a required check running type-check, tests (with a Postgres service) and build on every pull request and push to `master`.

- [ ] **Step 1:** Create the workflow: Node 22, `npm ci`, then `npx tsc --noEmit`, `npx vitest run`, `npx next build`. Add a `postgres:16` service with database `finance_test` and set `TEST_DATABASE_URL` for the test step.
- [ ] **Step 2:** Verify locally that the three commands pass without any `.env` file (the build must not require secrets).
- [ ] **Step 3:** Commit `ci: run tsc, vitest and next build on every PR`. Actual run is confirmed in Task 10 after pushing.

### Task 5: Integration harness and failing isolation tests

**Files:**
- Create: `src/test/pgTestDb.ts`, `src/db/isolation.integration.test.ts`
- Read first: `src/db/auth-schema.ts` (columns required to insert a `user` row), `src/app/api/sync/route.test.ts` (existing mocking style), `docker-compose.local.yml`

**Interfaces:**
- Produces in `src/test/pgTestDb.ts`:
  - `integrationDbUrl(): string | undefined` — returns `process.env.TEST_DATABASE_URL`.
  - `createTestDb(opts?: { upToIdx?: number }): Promise<{ db: PostgresJsDatabase<typeof schema>; sql: postgres.Sql; close(): Promise<void> }>` — throws unless the database name ends with `_test`; drops schemas `public` and `drizzle`, recreates `public`, applies `drizzle/` migrations up to `upToIdx` (inclusive index into `drizzle/meta/_journal.json`, default all).
  - `insertUser(db, id: string): Promise<void>`.
- Consumes: `getCurrentUser` from `@/lib/server-auth` (mocked, switchable per test) and `getDatabase` from `@/db/client` (mocked to return the test db via `vi.hoisted`).

- [ ] **Step 1:** Start the local database and create the test database: `docker compose -f docker-compose.local.yml up -d`, then `docker exec finance-app-postgres-local psql -U finance_local -d postgres -c "CREATE DATABASE finance_test"`. Set `$env:TEST_DATABASE_URL="postgresql://finance_local:finance_local_dev_only@127.0.0.1:55432/finance_test"` (dev-only credentials already in `drizzle.config.ts`).
- [ ] **Step 2:** Implement `pgTestDb.ts` per the interface above; wrap suites with `describe.skipIf(!integrationDbUrl())` so plain `npx vitest run` still passes without a database.
- [ ] **Step 3:** Write failing tests in `isolation.integration.test.ts`:
  - `it.each([categories, budgets, goals, debts, transactions])("two owners can hold the same id in %s")` — insert the same id for owners A and B; both inserts succeed; selecting by each owner returns only that owner's row.
  - `it("sync POST by B with A's default category ids leaves A's rows unchanged")` — A has `cat-expense-1` named `อาหาร`; B posts `cat-expense-1` named `ของ B`; A's row still `อาหาร`; B's `GET /api/sync` returns `ของ B`.
  - `it("import-local by B stores all 14 default categories")` — B posts `defaultCategories` to `/api/migrate/import-local`; B has 14 rows; A's rows unchanged (this is the production bug).
  - `it("ignores an ownerId supplied in the body")` — B posts a category with `ownerId: A`; it is stored under B.
- [ ] **Step 4:** Run `npx vitest run src/db/isolation.integration.test.ts`. Expected: FAIL (unique violation on `id`; B's categories missing).
- [ ] **Step 5:** Commit `test: add Postgres integration harness and failing isolation tests`.

### Task 6: Composite primary keys and migration 0003

**Files:**
- Modify: `src/db/schema.ts`, `src/db/schema.test.ts`
- Create (generated): `drizzle/0003_multi_user_composite_pk.sql`, updated `drizzle/meta/_journal.json`, new snapshot

**Interfaces:**
- Consumes: `createTestDb` from Task 5.
- Produces: tables whose primary key is `(owner_id, id)`; Drizzle exports unchanged in name.

- [ ] **Step 1:** Add to `schema.test.ts`: `it.each` over the five tables asserting `getTableConfig(table).primaryKeys[0].columns.map((c) => c.name)` equals `["owner_id", "id"]`, and an assertion that `mealLogs`, `workoutLogs`, `runningLogs`, `agentIngestionEvents` still use a single-column `id` key. Run → FAIL.
- [ ] **Step 2:** In `schema.ts` remove `.primaryKey()` from `id` in categories, budgets, goals, debts; add `primaryKey({ columns: [table.ownerId, table.id] })` in each table's extra config. For `financeTransactions` keep the spread but override `id: uuid("id").defaultRandom().notNull()` after it, then add the same composite key.
- [ ] **Step 3:** Run `npm run db:generate -- --name multi_user_composite_pk`. Open the SQL: it must only drop the five `*_pkey` constraints and add five `PRIMARY KEY ("owner_id","id")` constraints; reject anything else.
- [ ] **Step 4:** Run `npx vitest run src/db`. Expected: schema tests and the "same id in each table" tests PASS; the sync-route tests still FAIL (route uses `ON CONFLICT (id)`; fixed in Task 7).
- [ ] **Step 5:** Commit `feat(db)!: key synced tables by (owner_id, id)`.

### Task 7: Route changes and cross-account tests

**Files:**
- Modify: `src/app/api/sync/route.ts` (five `onConflictDoUpdate` targets), `src/app/api/migrate/import-local/route.ts` (five `onConflictDoNothing`), `src/app/api/sync/route.test.ts`
- Create: `src/app/api/crossAccount.integration.test.ts`

**Interfaces:**
- Consumes: `createTestDb`, `insertUser` (Task 5); route exports `GET`, `POST`, `PUT`, `DELETE` of `categories`, `budgets`, `goals`, `debts`, `transactions` and their `[id]` routes.

- [ ] **Step 1:** Write failing tests in `crossAccount.integration.test.ts`, table-driven over the five resources:
  - `"B cannot update A's row"` — B `PUT /api/<resource>/<A's id>` → 404; A's row unchanged.
  - `"B cannot delete A's row"` — B `DELETE` → 404 with the same body as a nonexistent id; A's row still present.
  - `"list returns only the caller's rows"` — B `GET` list never contains A's ids.
  - `"B can create a row with A's id"` — B `POST` with A's id → 201; A's row unchanged.
  - `"new user gets empty data from GET /api/sync"` — user with no rows → 200 with empty arrays.
- [ ] **Step 2:** Run them; fix only what fails. Expected failures: `/api/sync` conflict target. Change every `target: <table>.id` to `target: [<table>.ownerId, <table>.id]`; give each `onConflictDoNothing` in `import-local` the same explicit target.
- [ ] **Step 3:** Update `sync/route.test.ts` assertions that reference the old target. Read the relevant guide under `node_modules/next/dist/docs/` before editing route handlers.
- [ ] **Step 4:** Run `npx vitest run` with `TEST_DATABASE_URL` set. Expected: all tests including Task 5 PASS.
- [ ] **Step 5:** Commit `fix(api): scope all upserts to the session owner`.

### Task 8: Default-category backfill in migration 0003

**Files:**
- Modify: `drizzle/0003_multi_user_composite_pk.sql` (append one statement after the last `--> statement-breakpoint`)
- Create: `src/db/migration0003.integration.test.ts`

**Interfaces:**
- Consumes: `createTestDb({ upToIdx: 2 })` and the ability to run the 0003 file afterwards; `defaultCategories` from `src/lib/defaultCategories.ts`.

- [ ] **Step 1:** Write failing tests:
  - `it("gives every existing user the 14 default categories")` — on a database migrated to idx 2 with users A (has all defaults) and B (none), apply the 0003 file; each user has 14 `is_default` rows whose `id,name,type,icon,color` equal `defaultCategories`.
  - `it("keeps a customised default")` — A's `cat-expense-1` named `อาหารของฉัน` is unchanged afterwards.
  - `it("is idempotent")` — executing the backfill statement a second time leaves row counts and contents unchanged.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Append `INSERT INTO "finance_categories" (id, owner_id, name, type, icon, color, is_default) SELECT d.id, u.id, d.name, d.type, d.icon, d.color, true FROM "user" u CROSS JOIN (VALUES …14 rows copied from defaultCategories.ts…) AS d(id, name, type, icon, color) ON CONFLICT ("owner_id","id") DO NOTHING;`. No user ids are hard-coded.
- [ ] **Step 4:** Run `npx vitest run src/db/migration0003.integration.test.ts` → PASS; then the full suite.
- [ ] **Step 5:** Commit `feat(db): backfill default categories for every existing user`.

### Task 9: Production runbook (owner executes)

**Files:**
- Create: `docs/runbooks/2026-11-phase1-isolation-migration.md`

- [ ] **Step 1:** Write the runbook with these sections: (a) pre-flight: both users exported; Neon branch snapshot named `pre-0003`; run `SELECT count(*) FROM drizzle.__drizzle_migrations;` to learn whether drizzle's migrator was ever used on production; (b) apply: if the table exists use `npm run db:migrate` with the production `DATABASE_URL`; if not, run the 0003 statements (split at each `--> statement-breakpoint`) inside `BEGIN; … COMMIT;` in the Neon SQL editor; (c) deploy order: migrate, then deploy the new code immediately (old code uses `ON CONFLICT (id)` and fails on the new schema; local-first clients retry); do it while both users are idle; (d) verification: `SELECT owner_id, count(*) FROM finance_categories GROUP BY 1;` expects 14 + customs per owner (A: 17, B: 15), plus a query on `pg_indexes` showing `(owner_id, id)` for the five tables; (e) rollback: restore the Neon snapshot.
- [ ] **Step 2:** Commit `docs: add Phase 1 production migration runbook`.

### Task 10: Gate and pull request

- [ ] **Step 1:** Rebase onto `feat/gemini-ai-import` (or `master` if merged); run `npx tsc --noEmit`, `npx vitest run` (with `TEST_DATABASE_URL`), `npx next build`; all must pass.
- [ ] **Step 2:** Push and open a PR whose body has: a summary table of before/after keys, evidence (the Task 5 tests failing then passing), and `Door: one-way` (migration `0003` changes keys; reverting requires restoring the snapshot), `Blast radius: data`. A one-way door needs an independent second review before merge.
- [ ] **Step 3:** Watch the checks (`gh pr checks <n> --watch`); report only when green.

