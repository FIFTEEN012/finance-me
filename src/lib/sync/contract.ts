import { z } from 'zod'

/**
 * Wire contract of `/api/sync/changes` (ADR-0003), shared by the route and
 * the client sync engine.
 *
 * - GET  `?since=<cursor>` → `PullResponse`: every record of the caller
 *   changed after the cursor, tombstones included, and the next cursor.
 *   No `since` = everything. The cursor is opaque to clients.
 * - POST `PushRequest` → `PushResponse`: one result per change. A change is
 *   accepted only if its `editedAt` is newer than the stored record's
 *   (last edit wins per record); a rejected change carries the record that
 *   won so the device can take it.
 */

/**
 * Record kinds stored in the shared `user_records` table. Adding one: append
 * it here and register an adapter for it in `src/lib/sync/appKinds.ts`.
 */
export const SHARED_TABLE_KINDS = [
  'supply',
  'food-entry',
  'water-entry',
  'workout-session',
  'health-profile',
  'investment-holding',
  'investment-order',
  'dividend',
  'portfolio-snapshot',
  'monthly-expense-log',
  'monthly-tracked-category',
  'recurring-rule',
  'bill-split',
  'settings',
  'workout-plan',
] as const

/**
 * Record kinds kept in a table of their own (ADR-0003). Each needs a mapping
 * in `TABLE_KINDS` (`src/lib/sync/tableKinds.ts`) and an adapter in
 * `appKinds.ts`.
 */
export const OWN_TABLE_KINDS = ['category', 'budget', 'goal', 'debt'] as const
export type OwnTableKind = (typeof OWN_TABLE_KINDS)[number]

/** Every kind the server accepts; it refuses kinds not listed here. */
export const RECORD_KINDS = [...SHARED_TABLE_KINDS, ...OWN_TABLE_KINDS] as const
export type RecordKind = (typeof RECORD_KINDS)[number]

export const SYNC_CHANGES_PATH = '/api/sync/changes'

/** Most changes one push may carry; the engine sends larger queues in batches. */
export const MAX_PUSH_CHANGES = 200

/** A record as the server holds it. `data` is null for a tombstone. */
export type SyncRecord = {
  kind: string
  id: string
  data: unknown
  editedAt: string
  deletedAt: string | null
}

const isoTime = z
  .string()
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), 'invalid time')

export const changeSchema = z.object({
  kind: z.enum(RECORD_KINDS),
  id: z.string().min(1).max(200),
  editedAt: isoTime,
  /** The whole record (replaces the stored one), or null to delete it. */
  data: z.record(z.string(), z.unknown()).nullable(),
})
export type SyncChange = z.infer<typeof changeSchema>

export const pushRequestSchema = z.object({
  changes: z.array(changeSchema).min(1).max(MAX_PUSH_CHANGES),
})

export const sinceSchema = isoTime.optional()

export type PushResult = {
  kind: string
  id: string
  status: 'accepted' | 'rejected'
  /** On rejection: the stored record that won. */
  current?: SyncRecord
}

export type PushResponse = { results: PushResult[] }
export type PullResponse = { records: SyncRecord[]; cursor: string }
