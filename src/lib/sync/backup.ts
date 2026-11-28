import type { RecordData, SyncEngine, SyncKindAdapter, SyncStorage } from './engine'

/**
 * Backup files (export / import in DataManager and Settings): the raw
 * persisted blob (`{ state, version }`) of each store key, as zustand's
 * persist middleware writes it.
 */

/** Each key's persisted blob, `{}` for a key with nothing stored. */
export function readBackupStores(storage: SyncStorage, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of keys) {
    const raw = storage.getItem(key)
    out[key] = raw ? JSON.parse(raw) : {}
  }
  return out
}

export type RestoreBackupOptions = {
  storage: SyncStorage
  /** Store keys a backup may write; anything else in the file is ignored. */
  keys: readonly string[]
  /** Re-reads every persisted store from `storage`. */
  rehydrate: () => Promise<void>
  engine: SyncEngine
  /** The engine's record kinds, bound to the same stores. */
  adapters: SyncKindAdapter[]
}

type Snapshot = Map<string, string>

function snapshotOf(adapter: SyncKindAdapter): Snapshot {
  return new Map(adapter.snapshot().map(({ id, data }) => [id, JSON.stringify(data)]))
}

/**
 * Replaces the local stores with a backup and queues the difference as local
 * edits, so it syncs through the engine like any other change: every device
 * gets the backup's records, and records not in the backup are deleted.
 *
 * Rehydrating a store is not an edit to the adapters' watchers, so the
 * difference is found by comparing each kind's records before and after.
 * Records the backup leaves unchanged queue nothing.
 */
export async function restoreBackup(
  stores: Record<string, unknown>,
  { storage, keys, rehydrate, engine, adapters }: RestoreBackupOptions,
): Promise<void> {
  const before = new Map(adapters.map((a) => [a.kind, snapshotOf(a)]))

  for (const key of keys) {
    if (key in stores) storage.setItem(key, JSON.stringify(stores[key]))
  }
  await rehydrate()

  for (const adapter of adapters) {
    const old = before.get(adapter.kind)!
    const now = adapter.snapshot()
    const kept = new Set<string>()
    for (const { id, data } of now) {
      kept.add(id)
      if (old.get(id) !== JSON.stringify(data)) engine.record(adapter.kind, id, data as RecordData)
    }
    for (const id of old.keys()) if (!kept.has(id)) engine.record(adapter.kind, id, null)
  }
}
