import 'server-only'

import { and, eq, gt, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '@/db/schema'
import { userRecords } from '@/db/schema'
import type { PullResponse, PushResult, SyncChange, SyncRecord } from './contract'

type Db = PostgresJsDatabase<typeof schema>

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

function toSyncRecord(row: typeof userRecords.$inferSelect): SyncRecord {
  return {
    kind: row.kind,
    id: row.id,
    data: row.deletedAt ? null : row.data,
    editedAt: toIso(row.editedAt),
    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,
  }
}

/** Every record of `ownerId` received after `since` (all when absent), tombstones included. */
export async function pullRecords(db: Db, ownerId: string, since?: string): Promise<PullResponse> {
  const [{ now }] = await db.execute<{ now: Date | string }>(sql`select now() as now`)
  const rows = await db
    .select()
    .from(userRecords)
    .where(
      since
        ? and(eq(userRecords.ownerId, ownerId), gt(userRecords.updatedAt, new Date(since)))
        : eq(userRecords.ownerId, ownerId),
    )
  const cursor = new Date(new Date(now).getTime() - CURSOR_OVERLAP_MS).toISOString()
  return { records: rows.map(toSyncRecord), cursor }
}

/**
 * Applies `changes` for `ownerId` in one transaction, last edit wins per
 * record: a change replaces the stored record only if its `editedAt` is
 * newer (on a tie, a delete beats an edit). So an older edit can never bring
 * back a deleted record.
 */
export async function pushChanges(db: Db, ownerId: string, changes: SyncChange[]): Promise<PushResult[]> {
  return db.transaction(async (tx) => {
    const results: PushResult[] = []
    for (const change of changes) {
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
          setWhere: sql`${userRecords.editedAt} < excluded.edited_at
            OR (${userRecords.editedAt} = excluded.edited_at
                AND excluded.deleted_at IS NOT NULL AND ${userRecords.deletedAt} IS NULL)`,
        })
        .returning({ id: userRecords.id })

      if (written.length > 0) {
        results.push({ kind: change.kind, id: change.id, status: 'accepted' })
        continue
      }
      const [current] = await tx
        .select()
        .from(userRecords)
        .where(
          and(
            eq(userRecords.ownerId, ownerId),
            eq(userRecords.kind, change.kind),
            eq(userRecords.id, change.id),
          ),
        )
      results.push({
        kind: change.kind,
        id: change.id,
        status: 'rejected',
        ...(current ? { current: toSyncRecord(current) } : {}),
      })
    }
    return results
  })
}
