import 'server-only'

import { and, eq, isNull, sql } from 'drizzle-orm'
import { getDatabase } from '@/db/client'
import type { SyncedTable } from './tableKinds'

/**
 * Deletes `ownerId`'s live row `id` the way sync does (ADR-0003): the row
 * stays as a tombstone, so no device can upload it again. Returns false when
 * there is no such live row.
 */
export async function softDeleteRow(table: SyncedTable, ownerId: string, id: string): Promise<boolean> {
  const now = new Date()
  const deleted = (await getDatabase()
    .update(table)
    .set({ deletedAt: now, editedAt: now, updatedAt: sql`now()` } as never)
    .where(and(eq(table.id, id), eq(table.ownerId, ownerId), isNull(table.deletedAt)))
    .returning({ id: table.id })) as unknown[]
  return deleted.length > 0
}
