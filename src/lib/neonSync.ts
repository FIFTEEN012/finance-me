'use client'

import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useGoalStore } from '@/store/useGoalStore'
import { useDebtStore } from '@/store/useDebtStore'
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
 * Push all local store items to Neon PostgreSQL via /api/sync
 */
export async function pushToNeon(): Promise<SyncResult> {
  try {
    const transactions = useTransactionStore.getState().transactions
    const categories = useCategoryStore.getState().categories
    const budgets = useBudgetStore.getState().budgets
    const goals = useGoalStore.getState().goals
    const debts = useDebtStore.getState().debts

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions, categories, budgets, goals, debts }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.error || 'Failed to sync with Neon' }
    }

    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error during sync' }
  }
}

/**
 * Pull all data from Neon PostgreSQL via /api/sync and merge into local stores
 */
export async function pullFromNeon(): Promise<SyncResult> {
  try {
    const res = await fetch('/api/sync', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.error || 'Failed to pull from Neon' }
    }

    const data = await res.json()
    setIsApplyingNeonData(true)

    try {
      // 1. Transactions Merge: server items + local items not yet in server
      if (Array.isArray(data.transactions)) {
        const localTx = useTransactionStore.getState().transactions
        const serverTxIds = new Set(data.transactions.map((t: any) => t.id))
        const unpushedLocal = localTx.filter((t) => !serverTxIds.has(t.id))
        useTransactionStore.getState().replaceTransactions([...data.transactions, ...unpushedLocal])
      }

      // 2. Categories Merge
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        const localCat = useCategoryStore.getState().categories
        const serverCatIds = new Set(data.categories.map((c: any) => c.id))
        const unpushedCat = localCat.filter((c) => !serverCatIds.has(c.id))
        useCategoryStore.getState().replaceCategories([...data.categories, ...unpushedCat])
      }

      // 3. Budgets Merge
      if (Array.isArray(data.budgets)) {
        const localBudgets = useBudgetStore.getState().budgets
        const serverBudgetIds = new Set(data.budgets.map((b: any) => b.id))
        const unpushedBudgets = localBudgets.filter((b) => !serverBudgetIds.has(b.id))
        useBudgetStore.getState().replaceBudgets([...data.budgets, ...unpushedBudgets])
      }

      // 4. Goals Merge
      if (Array.isArray(data.goals)) {
        const localGoals = useGoalStore.getState().goals
        const serverGoalIds = new Set(data.goals.map((g: any) => g.id))
        const unpushedGoals = localGoals.filter((g) => !serverGoalIds.has(g.id))
        useGoalStore.getState().replaceGoals([...data.goals, ...unpushedGoals])
      }

      // 5. Debts Merge
      if (Array.isArray(data.debts)) {
        const localDebts = useDebtStore.getState().debts
        const serverDebtIds = new Set(data.debts.map((d: any) => d.id))
        const unpushedDebts = localDebts.filter((d) => !serverDebtIds.has(d.id))
        useDebtStore.getState().replaceDebts([...data.debts, ...unpushedDebts])
      }

      return { ok: true }
    } finally {
      setIsApplyingNeonData(false)
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error during pull' }
  }
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
