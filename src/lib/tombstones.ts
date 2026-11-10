import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import type { getDatabase } from "@/db/client";
import { financeStoreDocs } from "@/db/schema";
import { TYPED_ENTITIES, tombstoneStoreKey, type TypedEntity } from "@/lib/storeDocs";

type Db = ReturnType<typeof getDatabase>;

export type TombstoneMap = Record<TypedEntity, string[]>;

function emptyMap(): TombstoneMap {
  return { transactions: [], categories: [], budgets: [], goals: [], debts: [] };
}

/**
 * Remembers that a typed-table row was deleted, so devices that still hold it
 * drop it on their next pull instead of uploading it again. Never throws: a
 * missing table (migration not yet applied) must not break the delete itself.
 */
export async function recordTombstones(
  db: Db,
  ownerId: string,
  entity: TypedEntity,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  try {
    const now = new Date();
    await db
      .insert(financeStoreDocs)
      .values(
        ids.map((id) => ({
          ownerId,
          storeKey: tombstoneStoreKey(entity),
          docId: id,
          data: null,
          deleted: true,
          updatedAt: now,
        })),
      )
      .onConflictDoNothing();
  } catch (error) {
    console.error("[tombstones] record failed", error);
  }
}

/** Deleted ids per entity for `ownerId`. Empty when the table is missing. */
export async function listTombstones(db: Db, ownerId: string): Promise<TombstoneMap> {
  const map = emptyMap();
  try {
    const rows = await db
      .select({ storeKey: financeStoreDocs.storeKey, docId: financeStoreDocs.docId })
      .from(financeStoreDocs)
      .where(
        and(
          eq(financeStoreDocs.ownerId, ownerId),
          inArray(
            financeStoreDocs.storeKey,
            TYPED_ENTITIES.map((e) => tombstoneStoreKey(e)),
          ),
        ),
      );
    for (const row of rows) {
      const entity = row.storeKey.slice("deleted:".length) as TypedEntity;
      map[entity]?.push(row.docId);
    }
  } catch (error) {
    console.error("[tombstones] list failed", error);
  }
  return map;
}
