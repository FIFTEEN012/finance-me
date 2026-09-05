# Neon Local Agent Ingestion Implementation Plan

> **For Hermes:** Implement task-by-task with strict RED → GREEN → REFACTOR. Do not deploy, modify Vercel, contact the production Supabase project, or migrate production data without explicit approval.

**Goal:** Add a localhost-only PostgreSQL data path, compatible with Neon, so Hermes can safely record financial transactions, meals, workouts, and runs without touching the existing production system.

**Architecture:** Keep the current Supabase/localStorage production path intact while introducing an opt-in server-side PostgreSQL backend controlled by `DATA_BACKEND=postgres`. Use Docker PostgreSQL for local verification and Drizzle ORM with the `postgres` driver so the same schema can later use a Neon `DATABASE_URL`. The first vertical slice is an authenticated, idempotent Agent Ingestion API plus read APIs; existing frontend migration and production cutover remain separate approval-gated phases.

**Tech Stack:** Next.js 16 Route Handlers, TypeScript, Zod, PostgreSQL 16, Drizzle ORM, postgres.js, Vitest.

---

## Safety boundary

- Work only on local branch `feat/neon-local-agent-ingestion`.
- Do not change or remove the existing Supabase schema, credentials, client, authentication, or cloud-sync implementation during the local slice.
- Do not write to `finance-app-red-one.vercel.app`, Vercel environment variables, or the configured Supabase project.
- Do not import or delete existing user data.
- Use a fresh Docker volume and test-only records.
- Do not commit, push, deploy, or run a production migration without a separate approval.

## Local acceptance criteria

1. Docker PostgreSQL starts on a non-production local port.
2. Migrations create normalized tables for transactions, meals, workouts, runs, and ingestion audit records.
3. `POST /api/agent/records` rejects missing/invalid bearer tokens.
4. The API validates every record type and stores exactly one record for a repeated idempotency key.
5. The response reads back the stored row and reports whether it was newly created or deduplicated.
6. `GET /api/agent/records` can read local records for verification.
7. Existing production build behavior remains available when PostgreSQL variables are absent.
8. Tests, TypeScript, build, migration, and localhost HTTP verification pass.

---

### Task 1: Establish testing and database toolchain

**Objective:** Add only the development/runtime packages and scripts needed for TDD and PostgreSQL.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`

**Steps:**
1. Add Vitest and a `test` script.
2. Add `drizzle-orm`, `drizzle-kit`, and `postgres`.
3. Add scripts for `db:generate`, `db:migrate`, and `db:studio`.
4. Run an empty test command and confirm the runner starts.
5. Run the existing production build and confirm it still passes.

### Task 2: Add isolated localhost PostgreSQL

**Objective:** Provide a disposable PostgreSQL instance that cannot affect Supabase or Neon.

**Files:**
- Create: `docker-compose.local.yml`
- Create: `.env.local.postgres.example`
- Modify: `.gitignore` only if a committed example exception is necessary.

**Steps:**
1. Define PostgreSQL 16 on host port `55432` with a named local-only volume.
2. Add a health check.
3. Document `DATABASE_URL`, `DATA_BACKEND`, `AGENT_INGEST_TOKEN`, and `LOCAL_OWNER_ID` without real secrets.
4. Start the container and verify readiness using the container's `pg_isready`.

### Task 3: Define PostgreSQL schema

**Objective:** Model normalized, auditable records without touching existing Supabase blobs.

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Create: `drizzle.config.ts`
- Generate: `drizzle/*.sql`

**Tables:**
- `finance_transactions`
- `meal_logs`
- `workout_logs`
- `running_logs`
- `agent_ingestion_events`

**Required constraints:**
- UUID primary keys.
- `owner_id`, `source`, `source_message_id`, timestamps.
- Unique `(owner_id, idempotency_key)` on ingestion events.
- Positive amount/distance/duration/macronutrient checks where applicable.
- No Supabase foreign keys.

**Steps:**
1. Add a failing schema contract test for required tables/constraints.
2. Run it and confirm RED.
3. Add the minimal schema and generate migration SQL.
4. Run test to GREEN.
5. Apply the migration only to Docker PostgreSQL.
6. Query system catalogs to verify all tables and constraints.

### Task 4: Define ingestion validation

**Objective:** Parse the four supported record types into trusted domain inputs.

**Files:**
- Create: `src/lib/agentIngestion/schema.ts`
- Test: `src/lib/agentIngestion/schema.test.ts`

**Record types:**
- `transaction`: income, expense, transfer
- `meal`: meal type, food, optional macros and cost
- `workout`: exercise, sets/reps/duration/intensity
- `run`: distance, duration, run type, intensity

**Steps per record type:**
1. Write one failing happy-path test.
2. Implement minimal validation to pass.
3. Write failing boundary/error tests.
4. Implement constraints.
5. Run focused and full tests.

### Task 5: Implement token authentication

**Objective:** Protect the agent endpoint without exposing secrets to the browser bundle.

**Files:**
- Create: `src/lib/agentIngestion/auth.ts`
- Test: `src/lib/agentIngestion/auth.test.ts`

**Steps:**
1. Write failing tests for missing, malformed, and wrong bearer tokens.
2. Write a passing-case test using dependency-injected expected token.
3. Implement constant-time token comparison.
4. Ensure the environment token is read only in server code.

### Task 6: Implement idempotent ingestion repository

**Objective:** Insert one domain record and one audit event atomically, or return the existing result for duplicates.

**Files:**
- Create: `src/lib/agentIngestion/repository.ts`
- Test: `src/lib/agentIngestion/repository.test.ts`

**Steps:**
1. Write a failing integration test for creating a transaction.
2. Implement a transaction that inserts the audit event and domain row.
3. Verify GREEN and read back the exact row.
4. Write a failing duplicate-idempotency test.
5. Implement deduplication and verify only one domain row exists.
6. Repeat the vertical tests for meal, workout, and run.
7. Add failure-path rollback verification.

### Task 7: Add localhost Agent API route

**Objective:** Expose authenticated POST and verification GET endpoints only when PostgreSQL mode is enabled.

**Files:**
- Create: `src/app/api/agent/records/route.ts`
- Test: `src/app/api/agent/records/route.test.ts`

**Steps:**
1. Write failing route tests for backend disabled, unauthorized, invalid JSON, invalid payload, created, and duplicate.
2. Implement POST using the validation/auth/repository boundaries.
3. Implement a local verification GET with bearer authentication and bounded pagination.
4. Return `503` when `DATA_BACKEND` is not `postgres` so production keeps its old path.
5. Verify all route tests.

### Task 8: Preserve existing frontend and prepare later migration

**Objective:** Make the new backend discoverable locally without silently switching the production UI.

**Files:**
- Create: `src/lib/dataBackend.ts`
- Test: `src/lib/dataBackend.test.ts`
- Modify: `.env.local.postgres.example`
- Modify: `README.md`

**Steps:**
1. Test that missing configuration resolves to the legacy backend.
2. Test that explicit local PostgreSQL configuration resolves to PostgreSQL.
3. Add a server-only backend selector.
4. Document that frontend cloud-sync replacement, authentication replacement, and old-data import are future approval-gated phases.

### Task 9: Local end-to-end verification

**Objective:** Prove the new path works without production writes.

**Steps:**
1. Start Docker PostgreSQL and apply migrations.
2. Start Next.js on localhost with PostgreSQL-mode environment variables.
3. Verify `/dashboard`, `/health`, and `/transactions` return HTTP 200.
4. Verify unauthorized POST returns 401.
5. POST one test record of each kind.
6. Repeat one request with the same idempotency key and verify deduplication.
7. GET records and compare exact stored values.
8. Query PostgreSQL row counts directly from the Docker container.
9. Run all tests and `npm run build`.
10. Stop before commit, push, production deploy, Neon provisioning, or data migration.

---

## Approval-gated future phases

### Phase B: Neon development database

**User action required before this phase:** Create or select a Neon development project/branch and provide its pooled `DATABASE_URL` through a secure local environment file. Do not paste credentials into Git or Discord if a safer local file is available.

Hermes will then:
- run migrations against the Neon development branch only;
- perform read/write verification with synthetic data;
- confirm no production Vercel environment was changed.

### Phase C: Authentication replacement

Neon is a database, not an authentication provider. Choose and implement one of:
- Better Auth backed by Neon/PostgreSQL (recommended for ownership/control), or
- Clerk/Auth.js if preferred.

Supabase Auth remains untouched until this phase is approved and verified.

### Phase D: Existing data migration

- Export Supabase `user_store_data` read-only.
- Transform JSON blobs to normalized rows.
- Run dry-run validation and count reconciliation.
- Import to a Neon development branch.
- Obtain explicit approval before any production cutover.

### Phase E: Frontend cutover and deployment

- Replace Zustand/Supabase sync with API-backed queries while retaining offline-safe behavior.
- Exercise all finance and wellness flows locally.
- Create backup/rollback instructions.
- Deploy only after explicit approval.
