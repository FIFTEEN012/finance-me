'use client'

import { SYNC_STORE_KEYS, rehydrateAllStores } from '@/lib/cloudSync'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useGoalStore } from '@/store/useGoalStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useMonthlyExpenseStore } from '@/store/useMonthlyExpenseStore'
import { useBillSplitStore } from '@/store/useBillSplitStore'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useDebtStore } from '@/store/useDebtStore'
import { useWorkoutPlanStore } from '@/store/useWorkoutPlanStore'
import { useSupplyStore } from '@/store/useSupplyStore'
import { useNutritionStore } from '@/store/useNutritionStore'
import { getAppSyncEngine } from '@/lib/sync/appEngine'

/**
 * localStorage key recording which account the persisted `finance-*` data
 * on this browser belongs to. Persisted stores are per-browser, not per-user,
 * so without this marker one account's local rows could be uploaded into
 * another account after a sign-in on the same browser.
 */
export const OWNER_MARKER_KEY = 'finance-owner-id'

const MIGRATED_FLAG_KEY = 'finance-migrated-to-neon'

type ResettableStore = {
  getInitialState: () => unknown
  setState: (state: never, replace: true) => unknown
}

/** Stores holding User Data, emptied when another account signs in. */
const PERSISTED_STORES: ResettableStore[] = [
  useTransactionStore,
  useBudgetStore,
  useCategoryStore,
  useGoalStore,
  useInvestmentStore,
  useSettingsStore,
  useMonthlyExpenseStore,
  useBillSplitStore,
  useDebtStore,
  useWorkoutPlanStore,
  useSupplyStore,
  useNutritionStore,
  useRecurringStore,
] as unknown as ResettableStore[]

/** Device Preferences (dashboard layout, onboarding): they belong to the browser, not the account. */
const DEVICE_PREFERENCE_KEYS: readonly string[] = ['finance-dashboard-layout', 'finance-onboarding']

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

export function getStoredOwnerId(): string | null {
  if (!hasWindow()) return null
  try {
    return localStorage.getItem(OWNER_MARKER_KEY)
  } catch {
    return null
  }
}

export function setStoredOwnerId(id: string): void {
  if (!hasWindow()) return
  try {
    localStorage.setItem(OWNER_MARKER_KEY, id)
  } catch {
    // storage unavailable (private mode, blocked site data) — nothing to record
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/**
 * Empties this browser's copy of User Data: the stores in memory and their
 * persisted keys. Device Preferences (dashboard layout, onboarding) are kept.
 * Does not touch the sync engine's queue; callers reset it afterwards.
 */
export function clearLocalUserData() {
  // Reset in-memory state first: persist's setState writes the (default) state
  // back to storage, and a later rehydrate from empty storage keeps whatever is
  // in memory, so stale rows must be gone from memory before keys are removed.
  for (const store of PERSISTED_STORES) {
    try {
      store.setState(store.getInitialState() as never, true)
    } catch {
      // ignore — keys are still removed below
    }
  }

  // Same naming as clearStoreKey/clearRemovedFeatureStorage in cloudSync.ts.
  for (const key of SYNC_STORE_KEYS) {
    if (DEVICE_PREFERENCE_KEYS.includes(key)) continue
    safeRemove(key)
    safeRemove(`${key}__synced_at`)
    safeRemove(`${key}__modified_at`)
  }
}

function clearPreviousOwnerData() {
  clearLocalUserData()
  safeRemove(MIGRATED_FLAG_KEY)
  // After the stores are emptied: their removals must not be uploaded to the
  // new account, and its first sync must not count as already uploaded.
  getAppSyncEngine().reset()

  rehydrateAllStores().catch(() => {})
}

/**
 * Make sure the persisted local data on this browser belongs to `userId`.
 *
 * - Marker present and different: clear the previous owner's persisted data
 *   (store keys, their __synced_at/__modified_at markers and the
 *   migrated-to-neon flag), reset the in-memory stores, record `userId`,
 *   return true. Device Preferences (dashboard layout, onboarding) are kept.
 * - No marker (legacy browser): keep the local data as before, record
 *   `userId`, return false.
 * - Same owner: return false.
 *
 * Must run before any upload of local data (import-local, /api/sync POST).
 */
export function ensureLocalDataBelongsTo(userId: string): boolean {
  if (!hasWindow() || !userId) return false

  const stored = getStoredOwnerId()
  if (stored === userId) return false

  if (stored === null) {
    setStoredOwnerId(userId)
    return false
  }

  clearPreviousOwnerData()
  setStoredOwnerId(userId)
  return true
}
