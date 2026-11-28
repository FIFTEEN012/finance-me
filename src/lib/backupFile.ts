'use client'

import { PERSISTED_STORE_KEYS, rehydrateAllStores } from '@/lib/persistedStores'
import { readBackupStores, restoreBackup } from '@/lib/sync/backup'
import { getAppSyncEngine } from '@/lib/sync/appEngine'
import { APP_SYNC_KINDS } from '@/lib/sync/appKinds'

/**
 * Backup file (export / import in DataManager and Settings):
 * `{ version, exportedAt, stores: { [persist key]: { state, version } } }`.
 * Version 1 files (root arrays of the five finance kinds) are still read.
 */
export const BACKUP_VERSION = 2

export type BackupFile = {
  version: number
  exportedAt: string
  stores: Record<string, unknown>
}

/** Downloads a backup of every persisted store on this browser. */
export function downloadBackup() {
  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    stores: readBackupStores(localStorage, PERSISTED_STORE_KEYS),
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `financeme-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Reads a backup file's text; null when it is not a FinanceMe backup. Throws on invalid JSON. */
export function parseBackup(text: string): BackupFile | null {
  const raw = JSON.parse(text)
  if (!raw || typeof raw !== 'object') return null
  if (raw.stores && typeof raw.stores === 'object') {
    return {
      version: raw.version || 2,
      exportedAt: raw.exportedAt || new Date().toISOString(),
      stores: raw.stores,
    }
  }
  if (Array.isArray(raw.transactions)) {
    return {
      version: raw.version || 1,
      exportedAt: raw.exportedAt || new Date().toISOString(),
      stores: {
        'finance-transactions': { state: { transactions: raw.transactions } },
        'finance-budgets': { state: { budgets: raw.budgets || [] } },
        'finance-categories': { state: { categories: raw.categories || [] } },
        'finance-goals': { state: { goals: raw.goals || [] } },
        'finance-debts': { state: { debts: raw.debts || [] } },
      },
    }
  }
  return null
}

/**
 * Replaces this browser's stores with the backup. The difference is queued in
 * the sync engine, so signed in it reaches every device on the next sync
 * (records missing from the backup are deleted everywhere).
 */
export async function importBackup(backup: BackupFile) {
  await restoreBackup(backup.stores, {
    storage: localStorage,
    keys: PERSISTED_STORE_KEYS,
    rehydrate: rehydrateAllStores,
    engine: getAppSyncEngine(),
    adapters: APP_SYNC_KINDS,
  })
}

/** Number of the backup's stores this app restores. */
export function backupStoreCount(backup: BackupFile) {
  return Object.keys(backup.stores).filter((k) => (PERSISTED_STORE_KEYS as readonly string[]).includes(k)).length
}

interface StoreBlob {
  state?: Record<string, unknown>
}

export function countItems(stores: Record<string, unknown>) {
  function len(key: string) {
    const blob = stores[key] as StoreBlob | undefined
    const state = blob?.state ?? {}
    const arr = Object.values(state).find(Array.isArray) as unknown[] | undefined
    return arr?.length ?? 0
  }

  return {
    transactions:   len('finance-transactions'),
    budgets:        len('finance-budgets'),
    goals:          len('finance-goals'),
    investments:    len('finance-investments'),
    debts:          len('finance-debts'),
    recurrings:     len('finance-recurring-rules'),
    supplies:       len('finance-supplies'),
    nutrition: (() => {
      const s = (stores['finance-nutrition'] as StoreBlob | undefined)?.state ?? {}
      return ((s.food as unknown[])?.length ?? 0) + ((s.water as unknown[])?.length ?? 0) + ((s.exercise as unknown[])?.length ?? 0)
    })(),
    billSplits:     len('finance-bill-splits'),
    // Moves of the in-progress Workout Plan plus those of the unsaved draft.
    workoutPlan: (() => {
      const s = (stores['finance-workout-plan'] as StoreBlob | undefined)?.state ?? {}
      const active = s.active as { plan?: { moves?: unknown[] } } | null | undefined
      const draft = s.draft as { moves?: unknown[] } | null | undefined
      return (active?.plan?.moves?.length ?? 0) + (draft?.moves?.length ?? 0)
    })(),
  }
}
