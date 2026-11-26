import 'server-only'

import { and, eq, getTableColumns, gt, sql, type SQL } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '@/db/schema'
import { userRecords } from '@/db/schema'
import type { OwnTableKind, PullResponse, PushResult, SyncChange, SyncRecord } from './contract'
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
  const [{ now }] = await db.execute<{ now: Date | string }>(sql`select now() as now`)
  const after = since ? new Date(since) : undefined

  const shared = await db
    .select()
    .from(userRecords)
    .where(and(eq(userRecords.ownerId, ownerId), after ? gt(userRecords.updatedAt, after) : undefined))
  const records = shared.map(sharedRecord)

  for (const [kind, spec] of Object.entries(TABLE_KINDS)) {
    const t = spec.table
    const rows = (await db
      .select()
      .from(t)
      .where(and(eq(t.ownerId, ownerId), after ? gt(t.updatedAt, after) : undefined))) as Record<string, unknown>[]
    for (const row of rows) records.push(tableRecord(kind, spec, row))
  }

  const cursor = new Date(new Date(now).getTime() - CURSOR_OVERLAP_MS).toISOString()
  return { records, cursor }
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
  const row = deleted ? spec.emptyRow : spec.toRow(change.data!)

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

/**
 * Applies `changes` for `ownerId` in one transaction, last edit wins per
 * record (see `newerThanStored`). Kinds with a table of their own
 * (`TABLE_KINDS`) are written there; the rest go to `user_records`. A record
 * a kind cannot store (missing required fields) is refused.
 */
export async function pushChanges(db: Db, ownerId: string, changes: SyncChange[]): Promise<PushResult[]> {
  return db.transaction(async (tx) => {
    const results: PushResult[] = []
    for (const change of changes) {
      const spec = tableKindOf(change.kind)
      results.push(spec ? await pushToTable(tx, ownerId, change, spec) : await pushShared(tx, ownerId, change))
    }
    return results
  })
}
