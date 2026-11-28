import 'server-only'

import { and, eq, getTableColumns, gt, isNull, sql, type SQL } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '@/db/schema'
import { financeCategories, syncResets, userRecords } from '@/db/schema'
import { defaultCategories } from '@/lib/defaultCategories'
import type {
  OwnTableKind,
  PullResponse,
  PushResponse,
  PushResult,
  ResetResponse,
  SyncChange,
  SyncRecord,
} from './contract'
import { TABLE_KINDS, type TableKind } from './tableKinds'

type Db = PostgresJsDatabase<typeof schema>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * How far each pull cursor is set back from the server's clock. A push
 * transaction stamps `updated_at` when it starts but becomes visible when it
 * commits, so a pull running in between must not move the cursor past it.
 * Re-pulling a record a device already has is harmless.
 */
const CURSOR_OVERLAP_MS = 10_000

function toIso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString()
}

const tableKindOf = (kind: string): TableKind | undefined => TABLE_KINDS[kind as OwnTableKind]

function sharedRecord(row: typeof userRecords.$inferSelect): SyncRecord {
  return {
    kind: row.kind,
    id: row.id,
    data: row.deletedAt ? null : row.data,
    editedAt: toIso(row.editedAt),
    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,
  }
}

function tableRecord(kind: string, spec: TableKind, row: Record<string, unknown>): SyncRecord {
  const deletedAt = row.deletedAt as Date | null
  return {
    kind,
    id: String(row.id),
    data: deletedAt ? null : spec.toRecord(row),
    editedAt: toIso(row.editedAt as Date),
    deletedAt: deletedAt ? toIso(deletedAt) : null,
  }
}

/**
 * Last edit wins: the stored record is replaced only by a newer edit; on a
 * tie a delete beats an edit. So an older edit never brings back a delete.
 */
function newerThanStored(stored: { editedAt: unknown; deletedAt: unknown }): SQL {
  return sql`${stored.editedAt} < excluded.edited_at
    OR (${stored.editedAt} = excluded.edited_at
        AND excluded.deleted_at IS NOT NULL AND ${stored.deletedAt} IS NULL)`
}

/** Every record of `ownerId` received after `since` (all when absent), tombstones included. */
export async function pullRecords(db: Db, ownerId: string, since?: string): Promise<PullResponse> {
  // Under the owner's shared lock, so the generation and the records agree
  // (a Reset cannot run in between).
  return db.transaction(async (tx) => {
    await lockOwner(tx, ownerId, 'push')
    const [{ now }] = await tx.execute<{ now: Date | string }>(sql`select now() as now`)
    const after = since ? new Date(since) : undefined

    const shared = await tx
      .select()
      .from(userRecords)
      .where(and(eq(userRecords.ownerId, ownerId), after ? gt(userRecords.updatedAt, after) : undefined))
    const records = shared.map(sharedRecord)

    for (const [kind, spec] of Object.entries(TABLE_KINDS)) {
      const t = spec.table
      const rows = (await tx
        .select()
        .from(t)
        .where(and(eq(t.ownerId, ownerId), after ? gt(t.updatedAt, after) : undefined))) as Record<string, unknown>[]
      for (const row of rows) records.push(tableRecord(kind, spec, row))
    }

    const cursor = new Date(new Date(now).getTime() - CURSOR_OVERLAP_MS).toISOString()
    const { generation } = await lastReset(tx, ownerId)
    return { records, cursor, generation }
  })
}

async function pushShared(tx: Tx, ownerId: string, change: SyncChange): Promise<PushResult> {
  const editedAt = new Date(change.editedAt)
  const deleted = change.data === null
  const written = await tx
    .insert(userRecords)
    .values({
      ownerId,
      kind: change.kind,
      id: change.id,
      data: change.data,
      editedAt,
      deletedAt: deleted ? editedAt : null,
      updatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: [userRecords.ownerId, userRecords.kind, userRecords.id],
      set: {
        data: sql`excluded.data`,
        editedAt: sql`excluded.edited_at`,
        deletedAt: sql`excluded.deleted_at`,
        updatedAt: sql`now()`,
      },
      setWhere: newerThanStored(userRecords),
    })
    .returning({ id: userRecords.id })
  if (written.length > 0) return { kind: change.kind, id: change.id, status: 'accepted' }

  const [current] = await tx
    .select()
    .from(userRecords)
    .where(and(eq(userRecords.ownerId, ownerId), eq(userRecords.kind, change.kind), eq(userRecords.id, change.id)))
  return { kind: change.kind, id: change.id, status: 'rejected', ...(current ? { current: sharedRecord(current) } : {}) }
}

async function pushToTable(tx: Tx, ownerId: string, change: SyncChange, spec: TableKind): Promise<PushResult> {
  const t = spec.table
  const editedAt = new Date(change.editedAt)
  const deleted = change.data === null
  const usableId = spec.acceptsId?.(change.id) ?? true
  const row = !usableId ? null : deleted ? spec.emptyRow : spec.toRow(change.data!)

  let written: unknown[] = []
  if (row) {
    const columns = getTableColumns(t) as Record<string, { name: string }>
    // An edit replaces every mapped column; a delete keeps the last values.
    const replaced = deleted
      ? {}
      : Object.fromEntries(Object.keys(row).map((key) => [key, sql.raw(`excluded."${columns[key].name}"`)]))
    written = await tx
      .insert(t)
      .values({
        ...spec.insertOnly,
        ...row,
        ownerId,
        id: change.id,
        editedAt,
        deletedAt: deleted ? editedAt : null,
        updatedAt: sql`now()`,
      } as never)
      .onConflictDoUpdate({
        target: [t.ownerId, t.id],
        set: {
          ...replaced,
          editedAt: sql`excluded.edited_at`,
          deletedAt: sql`excluded.deleted_at`,
          updatedAt: sql`now()`,
        } as never,
        setWhere: newerThanStored(t),
      })
      .returning({ id: t.id })
  }
  if (written.length > 0) return { kind: change.kind, id: change.id, status: 'accepted' }

  if (!usableId) return { kind: change.kind, id: change.id, status: 'rejected' }
  const [current] = (await tx
    .select()
    .from(t)
    .where(and(eq(t.ownerId, ownerId), eq(t.id, change.id)))) as Record<string, unknown>[]
  return {
    kind: change.kind,
    id: change.id,
    status: 'rejected',
    ...(current ? { current: tableRecord(change.kind, spec, current) } : {}),
  }
}

/** Advisory lock namespace for a user's sync writes. */
const SYNC_LOCK_SPACE = 33_023

/**
 * Pushes take the owner's lock shared, a Reset takes it exclusively: a push
 * never runs half before and half after a Reset, so it cannot slip a record
 * from before the Reset in after it.
 */
async function lockOwner(tx: Tx, ownerId: string, mode: 'push' | 'reset') {
  await tx.execute(
    mode === 'reset'
      ? sql`select pg_advisory_xact_lock(${SYNC_LOCK_SPACE}, hashtext(${ownerId}))`
      : sql`select pg_advisory_xact_lock_shared(${SYNC_LOCK_SPACE}, hashtext(${ownerId}))`,
  )
}

/** The owner's Reset generation (0 = never reset) and when the last Reset ran. */
async function lastReset(tx: Tx, ownerId: string): Promise<{ generation: number; resetAt: Date | null }> {
  const [row] = await tx.select().from(syncResets).where(eq(syncResets.ownerId, ownerId))
  return { generation: row?.generation ?? 0, resetAt: row?.resetAt ?? null }
}

/** The stored record (tombstone included), if the server has one. */
async function storedRecord(tx: Tx, ownerId: string, kind: string, id: string): Promise<SyncRecord | undefined> {
  const spec = tableKindOf(kind)
  if (!spec) {
    const [row] = await tx
      .select()
      .from(userRecords)
      .where(and(eq(userRecords.ownerId, ownerId), eq(userRecords.kind, kind), eq(userRecords.id, id)))
    return row ? sharedRecord(row) : undefined
  }
  if (!(spec.acceptsId?.(id) ?? true)) return undefined
  const t = spec.table
  const [row] = (await tx
    .select()
    .from(t)
    .where(and(eq(t.ownerId, ownerId), eq(t.id, id)))) as Record<string, unknown>[]
  return row ? tableRecord(kind, spec, row) : undefined
}

/**
 * A change queued before its device heard of the user's last Reset was made
 * on data the Reset wiped: it loses, and the device gets what the server holds now (or,
 * for a record the server never had, a tombstone) so it drops its copy.
 */
async function refuseFromBeforeReset(tx: Tx, ownerId: string, change: SyncChange, resetAt: Date): Promise<PushResult> {
  const at = resetAt.toISOString()
  const current = (await storedRecord(tx, ownerId, change.kind, change.id)) ?? {
    kind: change.kind,
    id: change.id,
    data: null,
    editedAt: at,
    deletedAt: at,
  }
  return { kind: change.kind, id: change.id, status: 'rejected', current }
}

/**
 * Applies `changes` for `ownerId` in one transaction, last edit wins per
 * record (see `newerThanStored`). Kinds with a table of their own
 * (`TABLE_KINDS`) are written there; the rest go to `user_records`. A record
 * a kind cannot store (missing required fields) is refused, and so is every
 * change when `knownGeneration` (the Reset generation the device knew when it
 * queued them) is older than the owner's current one. Edit times are never
 * compared with the server clock.
 */
export async function pushChanges(
  db: Db,
  ownerId: string,
  changes: SyncChange[],
  knownGeneration?: number,
): Promise<PushResponse> {
  return db.transaction(async (tx) => {
    await lockOwner(tx, ownerId, 'push')
    const { generation, resetAt } = await lastReset(tx, ownerId)
    const queuedBeforeReset = resetAt !== null && knownGeneration !== undefined && knownGeneration < generation
    const results: PushResult[] = []
    for (const change of changes) {
      if (queuedBeforeReset) {
        results.push(await refuseFromBeforeReset(tx, ownerId, change, resetAt))
        continue
      }
      const spec = tableKindOf(change.kind)
      results.push(spec ? await pushToTable(tx, ownerId, change, spec) : await pushShared(tx, ownerId, change))
    }
    return { results, generation }
  })
}

/**
 * Reset (GLOSSARY), in one transaction: every live User Data record of
 * `ownerId` becomes a tombstone edited at the Reset time (server clock), the
 * default categories are written back live at that time (also those the user
 * had deleted; same ids on every device), and a new Reset generation starts
 * so pushes a device queued before it heard of the Reset are refused. Device Preferences are not on the
 * server and are untouched; other users' rows are not touched.
 */
export async function resetRecords(db: Db, ownerId: string): Promise<ResetResponse> {
  return db.transaction(async (tx) => {
    await lockOwner(tx, ownerId, 'reset')
    const [{ now }] = await tx.execute<{ now: Date | string }>(sql`select now() as now`)
    // Millisecond precision, like every edit time a device sends.
    const resetAt = new Date(new Date(now).getTime())

    await tx
      .update(userRecords)
      .set({ data: null, editedAt: resetAt, deletedAt: resetAt, updatedAt: sql`now()` })
      .where(and(eq(userRecords.ownerId, ownerId), isNull(userRecords.deletedAt)))
    for (const spec of Object.values(TABLE_KINDS)) {
      const t = spec.table
      await tx
        .update(t)
        .set({ editedAt: resetAt, deletedAt: resetAt, updatedAt: sql`now()` } as never)
        .where(and(eq(t.ownerId, ownerId), isNull(t.deletedAt)))
    }

    for (const category of defaultCategories) {
      const row = TABLE_KINDS.category.toRow(category as unknown as Record<string, unknown>)!
      const written = { ...row, editedAt: resetAt, deletedAt: null, updatedAt: sql`now()` }
      await tx
        .insert(financeCategories)
        .values({ ...written, ownerId, id: category.id } as never)
        .onConflictDoUpdate({ target: [financeCategories.ownerId, financeCategories.id], set: written as never })
    }

    const [{ generation }] = await tx
      .insert(syncResets)
      .values({ ownerId, resetAt, generation: 1 })
      .onConflictDoUpdate({
        target: syncResets.ownerId,
        set: { resetAt, generation: sql`${syncResets.generation} + 1` },
      })
      .returning({ generation: syncResets.generation })

    return { resetAt: resetAt.toISOString(), generation }
  })
}
