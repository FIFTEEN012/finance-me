import { z } from 'zod'

/**
 * Wire contract of `/api/sync/changes` (ADR-0003), shared by the route and
 * the client sync engine.
 *
 * - GET  `?since=<cursor>[&limit=<n>]` → `PullResponse`: every record of the
 *   caller changed after the cursor, tombstones included, and the next
 *   cursor. No `since` = everything. The cursor is opaque to clients. At most
 *   `limit` records come per page; while `next` is set, ask for
 *   `?page=<next>` (same `limit`) and keep the cursor of the last page.
 * - POST `PushRequest` → `PushResponse`: one result per change. A body over
 *   `MAX_PUSH_BODY_BYTES`, or a record over `MAX_CHANGE_DATA_BYTES`, is
 *   refused whole with 413. A change is
 *   accepted only if its `editedAt` is newer than the stored record's
 *   (last edit wins per record); a rejected change carries the record that
 *   won so the device can take it.
 *
 * Both answer with the user's Reset `generation` (how many Resets so far).
 * A device remembers the last one it heard and sends it with each push: a
 * push from an older generation was queued before the device heard of a
 * Reset, so every change in it is refused (with what the server holds now,
 * or a tombstone). A device that has not heard any yet (fresh, or just
 * signed in) sends none, and its changes are judged by last edit wins.
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
export type SharedTableKind = (typeof SHARED_TABLE_KINDS)[number]

/**
 * Record kinds kept in a table of their own (ADR-0003). Each needs a mapping
 * in `TABLE_KINDS` (`src/lib/sync/tableKinds.ts`) and an adapter in
 * `appKinds.ts`.
 */
export const OWN_TABLE_KINDS = ['category', 'budget', 'goal', 'debt', 'transaction'] as const
export type OwnTableKind = (typeof OWN_TABLE_KINDS)[number]

/** Every kind the server accepts; it refuses kinds not listed here. */
export const RECORD_KINDS = [...SHARED_TABLE_KINDS, ...OWN_TABLE_KINDS] as const
export type RecordKind = (typeof RECORD_KINDS)[number]

export const SYNC_CHANGES_PATH = '/api/sync/changes'

/**
 * POST → `ResetResponse`: Reset (GLOSSARY). Deletes every User Data record of
 * the caller (tombstones, so every device drops them on its next pull) and
 * recreates the default categories, in one transaction, and starts a new
 * Reset generation: a device's queue from before it heard of the Reset
 * cannot upload old data back.
 */
export const SYNC_RESET_PATH = '/api/sync/reset'
export type ResetResponse = { resetAt: string; generation: number }

/** Most changes one push may carry; the engine sends larger queues in batches. */
export const MAX_PUSH_CHANGES = 200

/**
 * Largest record the server stores: its `data` as JSON, in UTF-8 bytes. Room
 * for the settings record's report cover image: the app takes files up to
 * 2 MB, about 2.7 MB as a base64 data URL.
 */
export const MAX_CHANGE_DATA_BYTES = 3 * 1024 * 1024

/** Largest push body; the engine splits its queue to stay under it. */
export const MAX_PUSH_BODY_BYTES = 6 * 1024 * 1024

/** Records per pull page when the device does not ask, and the most it may ask for. */
export const DEFAULT_PULL_LIMIT = 500
export const MAX_PULL_LIMIT = 1000

/** Size of `value` sent as JSON, in UTF-8 bytes. */
export function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

/** A record as the server holds it. `data` is null for a tombstone. */
export type SyncRecord = {
  kind: RecordKind
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
  /** The Reset generation the device knew when it queued these changes; absent = none heard yet. */
  generation: z.number().int().min(0).optional(),
})

export const pullQuerySchema = z.object({
  since: isoTime.optional(),
  /** Continuation token from the previous page's `next`. */
  page: z.string().min(1).max(2000).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PULL_LIMIT).optional(),
})

export type PushResult = {
  kind: RecordKind
  id: string
  status: 'accepted' | 'rejected'
  /** On rejection: the stored record that won. */
  current?: SyncRecord
}

export type PushResponse = { results: PushResult[]; generation: number }
export type PullResponse = {
  records: SyncRecord[]
  cursor: string
  generation: number
  /** Set while more pages follow: ask for `?page=<next>`. */
  next?: string
}
