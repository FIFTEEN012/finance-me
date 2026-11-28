'use client'

import { getAppSyncEngine } from '@/lib/sync/appEngine'
import { useAuthStore } from '@/store/useAuthStore'

export const FINANCE_DIRTY_EVENT = 'finance:store-dirty'
export const FINANCE_SYNC_NOW_EVENT = 'finance:sync-now'

export type SyncResult = { ok: true } | { ok: false; error: string }

let isApplyingNeonData = false

export function getIsApplyingNeonData(): boolean {
  return isApplyingNeonData
}

export function setIsApplyingNeonData(val: boolean) {
  isApplyingNeonData = val
}

export function triggerSyncNow() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FINANCE_SYNC_NOW_EVENT))
  }
}

/**
 * Runs the sync engine once (push queued changes, then pull). All User Data,
 * transactions included, syncs through it now (src/lib/sync/appKinds.ts); the
 * old /api/sync round trip would overwrite the engine's records.
 */
async function syncEngineOnce(): Promise<SyncResult> {
  const engine = getAppSyncEngine()
  await engine.sync()
  const status = engine.getStatus()
  if (status.state === 'error') return { ok: false, error: 'ซิงก์ข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง' }
  if (status.state === 'pending') return { ok: false, error: 'ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ จะซิงก์ให้เมื่อออนไลน์' }
  return { ok: true }
}

/** Uploads local changes (through the sync engine). */
export async function pushToNeon(): Promise<SyncResult> {
  return syncEngineOnce()
}

/** Downloads everyone else's changes (through the sync engine). */
export async function pullFromNeon(): Promise<SyncResult> {
  return syncEngineOnce()
}

/**
 * Full Two-Way Sync (Push unsynced local data, then pull and merge latest state)
 */
export async function syncWithNeon(): Promise<SyncResult> {
  const authState = useAuthStore.getState()
  authState.setSyncStatus('syncing')

  // First push local data to Neon
  const pushRes = await pushToNeon()
  if (!pushRes.ok) {
    authState.setSyncError(pushRes.error)
    return pushRes
  }

  // Then pull latest merged state
  const pullRes = await pullFromNeon()
  if (!pullRes.ok) {
    authState.setSyncError(pullRes.error)
    return pullRes
  }

  const now = new Date().toISOString()
  authState.setLastSyncAt(now)
  return { ok: true }
}
