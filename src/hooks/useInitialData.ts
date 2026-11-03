'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { authClient } from '@/lib/auth-client'
import { useAuthStore } from '@/store/useAuthStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useGoalStore } from '@/store/useGoalStore'
import { useDebtStore } from '@/store/useDebtStore'
import { rehydrateAllStores } from '@/lib/cloudSync'
import { ensureLocalDataBelongsTo } from '@/lib/localOwner'
import { debtToDatabasePayload, normalizeDebt } from '@/lib/debtRecord'

export function useInitialData() {
  const { data: session, isPending } = authClient.useSession()
  const setUser = useAuthStore((state) => state.setUser)
  const setLoading = useAuthStore((state) => state.setLoading)
  const [dataLoaded, setDataLoaded] = useState(false)
  const isSyncingRef = useRef(false)

  const refreshData = useCallback(async () => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true

    try {
      // 0. Ensure all zustand persist stores have loaded from localStorage
      await rehydrateAllStores()

      // 1. Get current local state
      const localTx = useTransactionStore.getState().transactions
      const localCategories = useCategoryStore.getState().categories
      const localBudgets = useBudgetStore.getState().budgets
      const localGoals = useGoalStore.getState().goals
      const localDebts = useDebtStore.getState().debts

      // 2. Fetch remote data from Neon
      const res = await fetch('/api/sync', { method: 'GET' })
      if (!res.ok) return

      const data = await res.json()

      // If server has no transactions but client has local items, upload local items to Neon!
      if (
        Array.isArray(data.transactions) &&
        data.transactions.length === 0 &&
        localTx.length > 0
      ) {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactions: localTx,
            categories: localCategories,
            budgets: localBudgets,
            goals: localGoals,
            debts: localDebts,
          }),
        }).catch(() => {})
        setDataLoaded(true)
        return
      }

      // Merge transactions: keep server items + any local items not yet in server
      let unpushedTx: any[] = []
      if (Array.isArray(data.transactions)) {
        const serverIds = new Set(data.transactions.map((t: any) => t.id))
        unpushedTx = localTx.filter((t) => !serverIds.has(t.id))
        useTransactionStore.getState().replaceTransactions([...data.transactions, ...unpushedTx])
      }

      // Merge categories
      let unpushedCat: any[] = []
      if (Array.isArray(data.categories)) {
        const serverCatIds = new Set(data.categories.map((c: any) => c.id))
        unpushedCat = localCategories.filter((c) => !serverCatIds.has(c.id))
        useCategoryStore.getState().replaceCategories([...data.categories, ...unpushedCat])
      }

      // Merge budgets
      let unpushedBudgets: any[] = []
      if (Array.isArray(data.budgets)) {
        const serverBudgetIds = new Set(data.budgets.map((b: any) => b.id))
        unpushedBudgets = localBudgets.filter((b) => !serverBudgetIds.has(b.id))
        useBudgetStore.getState().replaceBudgets([...data.budgets, ...unpushedBudgets])
      }

      // Merge goals
      let unpushedGoals: any[] = []
      if (Array.isArray(data.goals)) {
        const serverGoalIds = new Set(data.goals.map((g: any) => g.id))
        unpushedGoals = localGoals.filter((g) => !serverGoalIds.has(g.id))
        useGoalStore.getState().replaceGoals([...data.goals, ...unpushedGoals])
      }

      // Merge debts
      let unpushedDebts: any[] = []
      if (Array.isArray(data.debts)) {
        const serverDebtIds = new Set(data.debts.map((d: any) => d.id))
        unpushedDebts = localDebts.filter((d) => !serverDebtIds.has(d.id))
        const localById = new Map(localDebts.map((debt) => [debt.id, debt]))
        const mergedDebts = data.debts.map((debt: any) => {
          const local = localById.get(debt.id)
          const merged = normalizeDebt(debt, local as unknown as Record<string, unknown> | undefined)
          // Repayments from older versions existed only in localStorage.
          if (local?.payments?.length && merged.payments === local.payments &&
            merged.payments.length > (debt.payments?.length ?? 0)) {
            fetch(`/api/debts/${debt.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(debtToDatabasePayload(merged)),
            }).catch(() => {})
          }
          return merged
        })
        useDebtStore.getState().replaceDebts([...mergedDebts, ...unpushedDebts])
      }

      // If there were any unpushed items locally, persist them to Neon in background
      if (
        unpushedTx.length > 0 ||
        unpushedCat.length > 0 ||
        unpushedBudgets.length > 0 ||
        unpushedGoals.length > 0 ||
        unpushedDebts.length > 0
      ) {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactions: unpushedTx,
            categories: unpushedCat,
            budgets: unpushedBudgets,
            goals: unpushedGoals,
            debts: unpushedDebts,
          }),
        }).catch(() => {})
      }

      setDataLoaded(true)
    } catch {
      // ignore fetch errors
    } finally {
      isSyncingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        setUser(session.user)
        // Drop another account's local data before any upload decision
        ensureLocalDataBelongsTo(session.user.id)
        refreshData()
      } else {
        setUser(null)
      }
      setLoading(false)
    }
  }, [session, isPending, setUser, setLoading, refreshData])

  return {
    dataLoaded,
    refreshData,
  }
}
