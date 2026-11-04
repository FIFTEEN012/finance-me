'use client'

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
  'finance-recurring-rules',
] as const

const REMOVED_SYNC_STORE_KEYS = [
  'finance-workouts',
  'finance-routines',
  'finance-reading',
  'finance-health-quests',
  'finance-cycle',
] as const

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
    { useRecurringStore },
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
    import('@/store/useRecurringStore'),
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
    useRecurringStore,
  ]

  stores.forEach((store) => {
    if (typeof store.persist?.rehydrate === 'function') {
      store.persist.rehydrate()
    }
  })
}
