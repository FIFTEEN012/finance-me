'use client'

import { supabase } from './supabase'

export const FINANCE_DIRTY_EVENT = 'finance:store-dirty'
export const FINANCE_SYNC_NOW_EVENT = 'finance:sync-now'

/** All localStorage keys managed by Zustand persist that we want to sync */
export const SYNC_STORE_KEYS = [
  'finance-transactions',
  'finance-budgets',
  'finance-categories',
  'finance-goals',
  'finance-investments',
  'finance-settings',
  'finance-monthly-expense-logs',
  'finance-dashboard-layout',
  'finance-onboarding',
  'finance-bill-splits',
  'finance-debts',
] as const

const REMOVED_SYNC_STORE_KEYS = [
  'finance-workouts',
  'finance-routines',
  'finance-reading',
  'finance-health-quests',
  'finance-cycle',
] as const

export type SyncResult = { ok: true } | { ok: false; error: string }

let isApplyingCloudData = false

export function getIsApplyingCloudData(): boolean {
  return isApplyingCloudData
}

export function setIsApplyingCloudData(val: boolean) {
  isApplyingCloudData = val
}

export function triggerSyncNow() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FINANCE_SYNC_NOW_EVENT))
  }
}

export function hasUnsyncedLocalChanges(): boolean {
  if (typeof window === 'undefined') return false
  for (const key of SYNC_STORE_KEYS) {
    const modTs = parseInt(localStorage.getItem(`${key}__modified_at`) || '0', 10)
    const syncTs = parseInt(localStorage.getItem(`${key}__synced_at`) || '0', 10)
    if (modTs > syncTs) return true
  }
  return false
}

function clearStoreKey(key: string) {
  localStorage.removeItem(key)
  localStorage.removeItem(`${key}__synced_at`)
  localStorage.removeItem(`${key}__modified_at`)
}

export function clearRemovedFeatureStorage() {
  REMOVED_SYNC_STORE_KEYS.forEach(clearStoreKey)
}

/**
 * Intelligent merger for Zustand stores.
 * Keeps all items from cloud and merges any local items whose IDs do not yet exist in cloud.
 */
export function mergeStoreData(storeName: string, localData: any, cloudData: any): any {
  if (!localData?.state) return cloudData
  if (!cloudData?.state) return localData

  const arrayProps: Record<string, string> = {
    'finance-transactions': 'transactions',
    'finance-budgets': 'budgets',
    'finance-categories': 'categories',
    'finance-goals': 'goals',
    'finance-bill-splits': 'splits',
    'finance-debts': 'debts',
    'finance-investments': 'holdings',
  }

  const prop = arrayProps[storeName]
  if (prop && Array.isArray(localData.state[prop]) && Array.isArray(cloudData.state[prop])) {
    const localArr: any[] = localData.state[prop]
    const cloudArr: any[] = cloudData.state[prop]
    const cloudIdSet = new Set(cloudArr.map((item) => item?.id).filter(Boolean))

    const mergedArr = [...cloudArr]
    for (const item of localArr) {
      if (item?.id && !cloudIdSet.has(item.id)) {
        mergedArr.push(item)
      }
    }

    return {
      ...cloudData,
      state: {
        ...cloudData.state,
        [prop]: mergedArr,
      },
    }
  }

  return cloudData
}

/**
 * Push all local store data to Supabase.
 * Uses upsert so it creates or updates in one call.
 * Records `updated_at` so pullFromCloud can compare timestamps.
 */
export async function pushToCloud(userId: string): Promise<SyncResult> {
  if (!supabase) return { ok: false, error: 'Cloud sync not configured' }

  clearRemovedFeatureStorage()

  const now = new Date().toISOString()
  const rows = SYNC_STORE_KEYS.map((key) => {
    const raw = localStorage.getItem(key)
    return {
      user_id:    userId,
      store_name: key,
      data:       raw ? (JSON.parse(raw) as object) : {},
      updated_at: now,
    }
  })

  const { error } = await supabase
    .from('user_store_data')
    .upsert(rows, { onConflict: 'user_id,store_name' })

  if (error) return { ok: false, error: error.message }

  const { error: deleteError } = await supabase
    .from('user_store_data')
    .delete()
    .eq('user_id', userId)
    .in('store_name', [...REMOVED_SYNC_STORE_KEYS])

  if (deleteError) return { ok: false, error: deleteError.message }

  // Record what we just synced so future pulls don't overwrite newer local edits
  const nowMs = new Date(now).getTime()
  setIsApplyingCloudData(true)
  try {
    for (const key of SYNC_STORE_KEYS) {
      localStorage.setItem(`${key}__synced_at`, String(nowMs))
      const modTs = parseInt(localStorage.getItem(`${key}__modified_at`) || '0', 10)
      if (modTs <= nowMs) {
        localStorage.setItem(`${key}__modified_at`, String(nowMs))
      }
    }
  } finally {
    setIsApplyingCloudData(false)
  }

  return { ok: true }
}

/**
 * Pull all store data from Supabase and write to localStorage,
 * then rehydrate all Zustand stores.
 * Never overwrites local unpushed edits. Safely merges when necessary.
 */
export async function pullFromCloud(userId: string): Promise<SyncResult> {
  if (!supabase) return { ok: false, error: 'Cloud sync not configured' }

  clearRemovedFeatureStorage()

  const { data, error } = await supabase
    .from('user_store_data')
    .select('store_name, data, updated_at')
    .eq('user_id', userId)

  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: true }

  let needsPushBack = false

  setIsApplyingCloudData(true)
  try {
    data.forEach(({ store_name, data: storeData, updated_at }) => {
      if (!SYNC_STORE_KEYS.includes(store_name as typeof SYNC_STORE_KEYS[number])) return

      const cloudTs = updated_at ? new Date(updated_at).getTime() : 0
      const localSyncedAt = localStorage.getItem(`${store_name}__synced_at`)
      const localTs = localSyncedAt ? parseInt(localSyncedAt, 10) : 0
      const localModifiedAt = localStorage.getItem(`${store_name}__modified_at`)
      const modTs = localModifiedAt ? parseInt(localModifiedAt, 10) : 0

      const hasLocalEdits = modTs > localTs
      const isCloudNewer = cloudTs > localTs

      const raw = localStorage.getItem(store_name)
      const localData = raw ? JSON.parse(raw) : null

      if (hasLocalEdits) {
        // Local has unsynced changes! Merge instead of blindly overwriting
        const mergedData = mergeStoreData(store_name, localData, storeData)
        localStorage.setItem(store_name, JSON.stringify(mergedData))
        // Keep synced_at as localTs until push completes, or max timestamp
        needsPushBack = true
      } else if (isCloudNewer) {
        // Cloud is strictly newer and local has no unsynced changes -> safe to apply
        localStorage.setItem(store_name, JSON.stringify(storeData))
        localStorage.setItem(`${store_name}__synced_at`, String(cloudTs))
        localStorage.setItem(`${store_name}__modified_at`, String(cloudTs))
      }
      // If neither is newer (cloudTs <= localTs and !hasLocalEdits), do nothing!
    })
  } finally {
    setIsApplyingCloudData(false)
  }

  await rehydrateAllStores()

  // If local had changes that were merged with cloud, push the merged state back immediately
  if (needsPushBack) {
    await pushToCloud(userId)
  }

  return { ok: true }
}

/**
 * Force all persisted Zustand stores to re-read from localStorage.
 * Import is dynamic to avoid circular deps.
 */
export async function rehydrateAllStores() {
  const [
    { useTransactionStore },
    { useBudgetStore },
    { useCategoryStore },
    { useGoalStore },
    { useInvestmentStore },
    { useSettingsStore },
    { useMonthlyExpenseStore },
    { useDashboardStore },
    { useOnboardingStore },
    { useBillSplitStore },
    { useDebtStore },
  ] = await Promise.all([
    import('@/store/useTransactionStore'),
    import('@/store/useBudgetStore'),
    import('@/store/useCategoryStore'),
    import('@/store/useGoalStore'),
    import('@/store/useInvestmentStore'),
    import('@/store/useSettingsStore'),
    import('@/store/useMonthlyExpenseStore'),
    import('@/store/useDashboardStore'),
    import('@/store/useOnboardingStore'),
    import('@/store/useBillSplitStore'),
    import('@/store/useDebtStore'),
  ])

  type WithPersist = { persist?: { rehydrate?: () => void | Promise<void> } }

  const stores: WithPersist[] = [
    useTransactionStore,
    useBudgetStore,
    useCategoryStore,
    useGoalStore,
    useInvestmentStore,
    useSettingsStore,
    useMonthlyExpenseStore,
    useDashboardStore,
    useOnboardingStore,
    useBillSplitStore,
    useDebtStore,
  ]

  stores.forEach((store) => {
    if (typeof store.persist?.rehydrate === 'function') {
      store.persist.rehydrate()
    }
  })
}
