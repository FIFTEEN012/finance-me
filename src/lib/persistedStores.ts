'use client'

/**
 * localStorage keys of the zustand persisted stores: the User Data stores and
 * the Device Preferences (dashboard layout, onboarding). Backups carry these
 * keys; clearing User Data removes them (except the Device Preferences).
 */
export const PERSISTED_STORE_KEYS = [
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
  'finance-supplies',
  'finance-nutrition',
  'finance-workout-plan',
] as const

/**
 * Makes every persisted store re-read its key from localStorage.
 * Imports are dynamic to avoid circular deps.
 */
export async function rehydrateAllStores() {
  const stores = await Promise.all([
    import('@/store/useTransactionStore').then((m) => m.useTransactionStore),
    import('@/store/useBudgetStore').then((m) => m.useBudgetStore),
    import('@/store/useCategoryStore').then((m) => m.useCategoryStore),
    import('@/store/useGoalStore').then((m) => m.useGoalStore),
    import('@/store/useInvestmentStore').then((m) => m.useInvestmentStore),
    import('@/store/useSettingsStore').then((m) => m.useSettingsStore),
    import('@/store/useMonthlyExpenseStore').then((m) => m.useMonthlyExpenseStore),
    import('@/store/useDashboardStore').then((m) => m.useDashboardStore),
    import('@/store/useOnboardingStore').then((m) => m.useOnboardingStore),
    import('@/store/useBillSplitStore').then((m) => m.useBillSplitStore),
    import('@/store/useDebtStore').then((m) => m.useDebtStore),
    import('@/store/useRecurringStore').then((m) => m.useRecurringStore),
    import('@/store/useSupplyStore').then((m) => m.useSupplyStore),
    import('@/store/useNutritionStore').then((m) => m.useNutritionStore),
    import('@/store/useWorkoutPlanStore').then((m) => m.useWorkoutPlanStore),
  ])

  type WithPersist = { persist?: { rehydrate?: () => void | Promise<void> } }
  await Promise.all(
    (stores as WithPersist[]).map((store) => store.persist?.rehydrate?.()),
  )
}
