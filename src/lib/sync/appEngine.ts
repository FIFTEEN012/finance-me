'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { APP_SYNC_KINDS } from './appKinds'
import { startAutoSync } from './autoSync'
import { createSyncEngine, type SyncEngine, type SyncStatus, type SyncStorage } from './engine'

/** The browser's engine, bound to the real stores. Created on first use. */
let engine: SyncEngine | null = null

function memoryStorage(): SyncStorage {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

function browserStorage(): SyncStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch {
    // blocked site data: fall through
  }
  return memoryStorage()
}

export function getAppSyncEngine(): SyncEngine {
  if (!engine) {
    engine = createSyncEngine({
      fetch: (input, init) => fetch(input, init),
      storage: browserStorage(),
    })
    for (const adapter of APP_SYNC_KINDS) engine.register(adapter)
  }
  return engine
}

/**
 * Keeps User Data records syncing while someone is signed in. Mount once (AppShell).
 * `claimLocalData` runs before the first sync of each signed-in user, so the
 * local data is theirs before anything is uploaded (localOwner).
 */
export function useRecordSync(
  signedInUserId: string | null | undefined,
  claimLocalData: (userId: string) => unknown,
) {
  useEffect(() => {
    if (!signedInUserId || typeof window === 'undefined') return
    claimLocalData(signedInUserId)
    return startAutoSync(getAppSyncEngine(), { events: window, visibility: document })
  }, [signedInUserId, claimLocalData])
}

const SERVER_STATUS: SyncStatus = { state: 'synced', pending: 0, syncing: false, lastSyncedAt: null }

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (listener) => getAppSyncEngine().subscribe(listener),
    () => getAppSyncEngine().getStatus(),
    () => SERVER_STATUS,
  )
}
