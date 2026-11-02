# FinanceMe: Multi-user, Delta Sync, AI Quota — Design Spec

Date: 2026-11-02 · Status: **Draft for owner review** (no code changes made yet)

## 1. Intent (agreed with owner)

- Turn FinanceMe from a single-owner app into a **public multi-user app**: anyone can sign up; every account's data is fully separate.
- Owner **pays Gemini costs** (no bring-your-own-key).
- Local-first stores stay; server becomes durable storage for **all** user data (except per-device UI state).
- Success = isolation proven by automated tests, lighter sync, bounded AI cost, a lean scope, and measurable KPIs.
- Out of scope: new product features, rewriting pages to server-first (approach B), field-level conflict merging, agent-ingestion/health tables (left untouched, local-only behind `DATA_BACKEND=postgres`).

## 2. Findings that drive the design (evidence from the repo, 2026-11-01)

1. `finance_categories/budgets/goals/debts` use a global `id` primary key, but default categories have fixed ids (`cat-income-1`, `cat-expense-1`, …) identical for every user. `onConflictDoUpdate` on `id` lets user B overwrite user A's row without changing `ownerId`.
2. `/api/sync` does 5 unconditional upserts, row by row, with unvalidated (`any`) payloads, and pushes the full dataset every 1.5 s (debounced) / 30 s (fallback).
3. 5 of 13 persisted stores never reach the server (investments, settings, bill-splits, cycle, monthly expense logs).
4. `rateLimiter.ts` is in-memory and called nowhere; `/api/stock-price` is unauthenticated, uncached.
5. `useSupabaseSync.ts` has no importers; `cloudSync.ts` is still used (`rehydrateAllStores`, `SYNC_STORE_KEYS`).
6. Sign-up is open (`emailAndPassword` without `disableSignUp`). **Production currently has 2 accounts** (owner + one other). Since only default-category ids collide and their content is identical unless customized, expected damage is small, but this must be verified before migrating (see §8).

## 3. Part 1 — Data model and isolation

1. Every synced table has primary key **`(owner_id, id)`** (transactions, categories, budgets, goals, debts). All upserts target that key.
2. Add **`deleted_at`** (tombstone) to every synced table; deletes are soft and propagate.
3. **`updated_at` is set by the server** (client clocks are not trusted); it is the sync cursor. **It changes only when the row's content actually changes** (`… DO UPDATE SET … WHERE (cols) IS DISTINCT FROM (excluded.cols)`); otherwise every sync would mark every row as changed and delta sync would save nothing. Evidence: on 2026-11-02 08:20 UTC the 14 default categories of the first production account were re-stamped within 6 seconds although unchanged, because the current code writes `updated_at = now()` on every upsert.
4. New table **`finance_documents`** `(owner_id, store, key, data jsonb, updated_at, deleted_at)`, PK `(owner_id, store, key)`, for: investments (one document per holding/order), settings, bill-splits, monthly expense logs. `dashboard-layout` and `onboarding` stay device-local.
5. Migration **`0003`** changes PKs without data loss. **Back up (Neon branch/snapshot) before running.**
6. Account deletion removes all rows in one DB transaction (`finance_transactions` and agent tables have no FK to `user` by design).

## 4. Part 2 — Delta sync

1. One endpoint: `POST /api/sync` with `{ cursor, changes }` → `{ changes, newCursor }`. `changes` are only records changed since the cursor, including tombstones, grouped by table.
2. Client tracks **dirty records per store** (persisted locally), replacing the patched `localStorage.setItem`. Offline edits survive reloads and are sent when online.
3. Server: validated with zod; **multi-row `INSERT … ON CONFLICT (owner_id,id) DO UPDATE`** in one transaction; max 500 records and 1 MB per request. **`owner_id` always comes from the session, never from the body.**
4. Conflicts: **last write wins per record.** Client sends `baseUpdatedAt`; if the server row is newer, the server keeps its version and returns it. Same rule for deletes.
5. Triggers: send 1.5 s after a change (only if something is dirty); pull on tab focus, on reconnect and every 60 s; exponential backoff on failure.
6. New device with existing local data: one-time bulk push through the existing `import-local` route.
7. Cursor is the server timestamp; each pull overlaps by 5 s (upserts are idempotent).

## 5. Part 3 — AI quota and rate limiting

1. Table **`ai_usage`** `(owner_id, day, kind, count)`, PK on all four. Reserve quota **atomically before** calling Gemini (`INSERT … ON CONFLICT DO UPDATE … WHERE count < limit RETURNING`); no row returned → HTTP 429. Refund if the provider fails. Initial limits (to be tuned against real Gemini pricing): text parse 50/day, image import 10/day.
2. **Global kill switch** `AI_DAILY_GLOBAL_LIMIT` plus a Google Cloud budget alert and quota cap (owner does this in the console).
3. Table **`rate_limits`** `(key, window_start, count)` replaces `rateLimiter.ts`: per-user AI burst (e.g. 10/min), sign-up/login per IP, public endpoints. Better-Auth's built-in limiter is configured to use the database (verify against v1.7 docs).
4. `/api/stock-price` and `/api/exchange-rates` require login and send `Cache-Control: s-maxage=60`. The unofficial Yahoo endpoint needs a documented fallback.
5. **Email verification required before using AI** (also enables password reset); needs an email provider (e.g. Resend free tier). CAPTCHA deferred until abuse is observed.
6. UI shows remaining quota and Thai 429 messages with reset time; first-use notice says text/images are sent to Google and not stored. Wording must be checked against Gemini API **paid-tier** terms before publishing.

## 6. Part 4 — Scope, KPIs, cleanup

**Core scope:** capture (incl. AI) → budgets → goals and debts → investments → reports, plus bill-split. **Feature freeze** until the launch gate passes. **The menstrual-cycle feature is removed** (owner decision, 2026-11-02): delete `src/app/cycle`, `src/components/cycle`, `useCycleStore`, `types/cycle.ts`, nav/dashboard references and the `finance-cycle` sync key; remind users to export their data first via the existing DataManager export.

**KPIs** (derived from existing tables; no third-party analytics; `scripts/kpi.sql`):

| Group | KPI | Source |
|---|---|---|
| Security | cross-account tests pass 100% on every route | automated tests |
| Sync | median payload per sync down ≥90% vs baseline; error rate <1% | server logs (baseline measured first) |
| Usage | share of signups with ≥3 transactions in 7 days; users still logging in week 4 | `finance_transactions.created_at` |
| AI | share of AI rows saved without edits; AI cost per active user per month | `ai_usage`, Google invoice |

Usage and AI targets are set after one month of data (no baseline exists today).

**Cleanup, in order:** (1) `.gitattributes` forcing LF + one dedicated renormalize commit; (2) delete dead Supabase code (`useSupabaseSync.ts`; verify `supabase.ts` use in `useAuthStore`; move `rehydrateAllStores` into the new sync module; remove `@supabase/supabase-js` and `supabase-schema.sql` if unused); (3) CI (`tsc`, `vitest`, `next build`); (4) remove `any` only in sync/auth files being rewritten; (5) split `settings/page.tsx` when adding delete-account/export/quota UI; (6) rewrite README and `.env.local.example`; (7) add `.playwright-cli/` to `.gitignore` (`rklb-zones.html` left for the owner to decide).

## 7. Phases and launch gate

| Phase | Work |
|---|---|
| 0 | Cleanup items 1–3, cycle removal |
| 1 | Isolation: migration `0003`, ownership enforced in every route, cross-account tests |
| 2 | Delta sync, `finance_documents`, move 4 remaining stores |
| 3 | AI quota, rate limits, email verification, password reset |
| 4 | Delete account, data export, privacy page, `kpi.sql` |

**Launch gate** (open public sign-up only when all hold): cross-account tests pass; Gemini billing enabled and budget alert set; email verification working; backup/restore of the database rehearsed.

## 8. Existing production data (2 accounts)

Queried by the owner in Neon on 2026-11-02 (`finance_categories`):

- Account A (owner): 17 rows = the 14 default categories (`cat-income-1..4`, `cat-expense-1..9`, `cat-transfer-1`) + 3 custom categories with UUID ids.
- Account B: **1 row**, a custom category with a UUID id (created 2026-10-02). **B has no default categories on the server**; the 14 default ids are held by A. This confirms the id-collision bug (finding 1).
- Custom (UUID-id) rows are correctly separated between accounts.
- `updated_at` on A's default rows cannot show who synced or whether content was overwritten (see §4.3). Names of the checked default rows match `defaultCategories`; icons and colors were not compared.
- Not yet checked: row counts per owner in `finance_transactions`, `finance_budgets`, `finance_goals`, `finance_debts` (ids are random UUIDs, so collisions are not expected).

Actions:

1. Before Phase 1: Neon snapshot/branch; both users export their data (Settings → export); B must not clear browser data until Phase 1 is done (her local store is currently her only complete copy of categories).
2. Migration `0003` (or its accompanying data step) **backfills the 14 default categories for account B** from `defaultCategories`, keeping the same ids under owner B, so her existing transactions keep valid category references.
3. Do not invite further users until Phase 1 ships. Optional interim hotfix (needs owner approval): `emailAndPassword.disableSignUp: true`.

## 9. Open items

- Real Gemini per-request cost and final quota numbers.
- Choice of email provider.
- Whether `supabase.ts` can be deleted (depends on `useAuthStore`).
