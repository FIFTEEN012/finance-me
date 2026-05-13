'use client'

import { supabase } from './supabase'

/** All localStorage keys managed by Zustand persist that we want to sync */
export const SYNC_STORE_KEYS = [
  'finance-transactions',
  'finance-budgets',
  'finance-categories',
  'finance-goals',
  'finance-investments',
  'finance-debts',
  'finance-recurrings',
  'finance-networth',
  'finance-settings',
  'finance-monthly-expense-logs',
  'finance-dashboard-layout',
  'finance-onboarding',
  'finance-subscriptions',
  'finance-bank-accounts',
  'finance-bill-splits',
] as const

export type SyncResult = { ok: true } | { ok: false; error: string }

/**
 * Push all local store data to Supabase.
 * Uses upsert so it creates or updates in one call.
 * Records `updated_at` so pullFromCloud can compare timestamps.
 */
export async function pushToCloud(userId: string): Promise<SyncResult> {
  if (!supabase) return { ok: false, error: 'Cloud sync not configured' }

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

  // Record what we just synced so future pulls don't overwrite newer local edits
  const nowMs = new Date(now).getTime()
  for (const key of SYNC_STORE_KEYS) {
    localStorage.setItem(`${key}__synced_at`, String(nowMs))
  }

  return { ok: true }
}

/**
 * Pull all store data from Supabase and write to localStorage,
 * then rehydrate all Zustand stores.
 * Uses last-write-wins: cloud row is only applied when its updated_at
 * is newer than what we have locally (stored under `<key>__synced_at`).
 */
export async function pullFromCloud(userId: string): Promise<SyncResult> {
  if (!supabase) return { ok: false, error: 'Cloud sync not configured' }

  const { data, error } = await supabase
    .from('user_store_data')
    .select('store_name, data, updated_at')
    .eq('user_id', userId)

  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: true }

  data.forEach(({ store_name, data: storeData, updated_at }) => {
    if (!SYNC_STORE_KEYS.includes(store_name as typeof SYNC_STORE_KEYS[number])) return

    const cloudTs = updated_at ? new Date(updated_at).getTime() : 0
    const localSyncedAt = localStorage.getItem(`${store_name}__synced_at`)
    const localTs = localSyncedAt ? parseInt(localSyncedAt, 10) : 0

    // Only overwrite if cloud data is strictly newer than last known sync
    if (cloudTs >= localTs) {
      localStorage.setItem(store_name, JSON.stringify(storeData))
      localStorage.setItem(`${store_name}__synced_at`, String(cloudTs))
    }
  })

  await rehydrateAllStores()
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
    { useDebtStore },
    { useRecurringStore },
    { useNetWorthStore },
    { useSettingsStore },
    { useMonthlyExpenseStore },
    { useDashboardStore },
    { useOnboardingStore },
    { useSubscriptionStore },
    { useBankAccountStore },
    { useBillSplitStore },
  ] = await Promise.all([
    import('@/store/useTransactionStore'),
    import('@/store/useBudgetStore'),
    import('@/store/useCategoryStore'),
    import('@/store/useGoalStore'),
    import('@/store/useInvestmentStore'),
    import('@/store/useDebtStore'),
    import('@/store/useRecurringStore'),
    import('@/store/useNetWorthStore'),
    import('@/store/useSettingsStore'),
    import('@/store/useMonthlyExpenseStore'),
    import('@/store/useDashboardStore'),
    import('@/store/useOnboardingStore'),
    import('@/store/useSubscriptionStore'),
    import('@/store/useBankAccountStore'),
    import('@/store/useBillSplitStore'),
  ])

  type WithPersist = { persist?: { rehydrate?: () => void | Promise<void> } }

  const stores: WithPersist[] = [
    useTransactionStore,
    useBudgetStore,
    useCategoryStore,
    useGoalStore,
    useInvestmentStore,
    useDebtStore,
    useRecurringStore,
    useNetWorthStore,
    useSettingsStore,
    useMonthlyExpenseStore,
    useDashboardStore,
    useOnboardingStore,
    useSubscriptionStore,
    useBankAccountStore,
    useBillSplitStore,
  ]

  stores.forEach((store) => {
    if (typeof store.persist?.rehydrate === 'function') {
      store.persist.rehydrate()
    }
  })
}
