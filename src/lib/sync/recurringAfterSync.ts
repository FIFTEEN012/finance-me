import { useRecurringStore } from '@/store/useRecurringStore'
import type { SyncEngine } from './engine'

/**
 * Records due recurring transactions right after each completed sync, never
 * before the first one. A rule's cursor (`lastGeneratedDate`) syncs with the
 * rule, so after a pull this device knows what another device has already
 * recorded and does not record it again. `onRecorded` gets the count when
 * anything was recorded. Returns a stop function.
 */
export function generateDueAfterEachSync(engine: SyncEngine, onRecorded?: (count: number) => void): () => void {
  let seen = engine.getStatus().lastSyncedAt
  let wasSyncing = engine.getStatus().syncing

  return engine.subscribe((status) => {
    const finished = wasSyncing && !status.syncing
    wasSyncing = status.syncing
    if (!finished || status.lastSyncedAt === null || status.lastSyncedAt === seen) return
    seen = status.lastSyncedAt
    const count = useRecurringStore.getState().generateDue()
    if (count > 0) onRecorded?.(count)
  })
}
