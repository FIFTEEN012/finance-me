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
  'finance-coach-chat',
] as const

export type SyncResult = { ok: true } | { ok: false; error: string }

/**
 * Push all local store data to Supabase.
 * Uses upsert so it creates or updates in one call.
 */
export async function pushToCloud(userId: string): Promise<SyncResult> {
  if (!supabase) return { ok: false, error: 'Cloud sync not configured' }

  const rows = SYNC_STORE_KEYS.map((key) => {
    const raw = localStorage.getItem(key)
    return {
      user_id:    userId,
      store_name: key,
      data:       raw ? (JSON.parse(raw) as object) : {},
      updated_at: new Date().toISOString(),
    }
  })

  const { error } = await supabase
    .from('user_store_data')
    .upsert(rows, { onConflict: 'user_id,store_name' })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Pull all store data from Supabase and write to localStorage,
 * then rehydrate all Zustand stores.
 */
export async function pullFromCloud(userId: string): Promise<SyncResult> {
  if (!supabase) return { ok: false, error: 'Cloud sync not configured' }

  const { data, error } = await supabase
    .from('user_store_data')
    .select('store_name, data')
    .eq('user_id', userId)

  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: true } // no cloud data yet — keep local

  data.forEach(({ store_name, data: storeData }) => {
    if (SYNC_STORE_KEYS.includes(store_name as typeof SYNC_STORE_KEYS[number])) {
      localStorage.setItem(store_name, JSON.stringify(storeData))
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
    { useCoachStore },
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
    import('@/store/useCoachStore'),
  ])

  const stores = [
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
    useCoachStore,
  ]

  stores.forEach((store) => {
    if ('persist' in store && typeof (store as any).persist?.rehydrate === 'function') {
      ;(store as any).persist.rehydrate()
    }
  })
}
