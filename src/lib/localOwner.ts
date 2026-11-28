'use client'

import { PERSISTED_STORE_KEYS, rehydrateAllStores } from '@/lib/persistedStores'
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
import {
  OWNER_MARKER_KEY,
  createDeviceAccount,
  type DeviceAccount,
  type SignOutResult,
} from '@/lib/sync/deviceAccount'

/**
 * localStorage key recording which account the persisted `finance-*` data
 * on this browser belongs to (absent = Guest Data). Persisted stores are
 * per-browser, not per-user, so without this marker one account's local rows
 * could be uploaded into another account after a sign-in on the same browser.
 */
export { OWNER_MARKER_KEY }

/** Old import-local flag; no longer written, removed with the owner's data. */
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
 * persisted keys (plus the old migrated-to-neon flag). Device Preferences
 * (dashboard layout, onboarding) are kept. Does not touch the sync engine's
 * queue: callers reset it afterwards (deviceAccount on account switch and
 * sign-out, resetUserData on Reset), so the removals are never uploaded.
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

  // The __synced_at/__modified_at markers were written by the old sync.
  for (const key of PERSISTED_STORE_KEYS) {
    if (DEVICE_PREFERENCE_KEYS.includes(key)) continue
    safeRemove(key)
    safeRemove(`${key}__synced_at`)
    safeRemove(`${key}__modified_at`)
  }
  safeRemove(MIGRATED_FLAG_KEY)
  rehydrateAllStores().catch(() => {})
}

/** localStorage, looked up on every call (blocked site data: reads nothing). */
const browserStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
}

let account: DeviceAccount | null = null
function deviceAccount(): DeviceAccount {
  account ??= createDeviceAccount({
    storage: browserStorage,
    engine: getAppSyncEngine(),
    clearUserData: clearLocalUserData,
  })
  return account
}

/**
 * Make sure the local data on this browser belongs to `userId`; call when
 * they are signed in, before the first sync (src/lib/sync/deviceAccount.ts).
 *
 * - Same owner: nothing changes, nothing is uploaded again; returns false.
 * - No marker (Guest Data, or a browser from before the marker): the local
 *   data becomes theirs and the next sync uploads it once; returns false.
 * - Another account's data (its session ended without signing out): it is
 *   cleared first (store keys, their __synced_at/__modified_at markers, the
 *   old migrated-to-neon flag, in-memory stores, the sync queue); returns
 *   true. Device Preferences (dashboard layout, onboarding) are kept.
 */
export function ensureLocalDataBelongsTo(userId: string): boolean {
  if (!hasWindow() || !userId) return false
  return deviceAccount().signedIn(userId) === 'switched'
}

/**
 * Signs out: sends queued changes, ends the session with `endSession`, then
 * clears this browser's User Data so the next person sees none of it.
 * Returns `{ ok: false, unsynced }` without signing out when changes could
 * not be sent, unless `discardUnsynced`.
 */
export function signOutAndClearLocalData(
  endSession: () => Promise<unknown>,
  opts?: { discardUnsynced?: boolean },
): Promise<SignOutResult> {
  return deviceAccount().signOut(endSession, opts)
}
