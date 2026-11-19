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
import { FINANCE_SYNC_NOW_EVENT } from '@/lib/cloudSync'
import { subscribeToDocStores, syncDocStores } from '@/lib/docSync'

/** Re-sync while the app is open, so edits from other devices show up. */
const PERIODIC_SYNC_MS = 60_000
/** Push local edits of document stores this long after the last change. */
const LOCAL_CHANGE_DEBOUNCE_MS = 2_000

type Tombstones = Partial<Record<'transactions' | 'categories' | 'budgets' | 'goals' | 'debts', string[]>>

function withoutDeleted<T extends { id: string }>(items: T[], ids: string[] | undefined): T[] {
  if (!ids?.length) return items
  const gone = new Set(ids)
  return items.filter((item) => !gone.has(item.id))
}

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

      // Document stores (investments, settings, supplies, ...) sync on their
      // own endpoint; run it alongside and wait for it before dataLoaded, so
      // recurring rules from other devices are known before generating.
      const docSync = syncDocStores()

      // 1. Fetch remote data from Neon
      const res = await fetch('/api/sync', { method: 'GET' })
      if (!res.ok) {
        await docSync
        return
      }

      const data = await res.json()

      // 2. Current local state, minus rows deleted on another device
      const deleted: Tombstones = data.deleted ?? {}
      const localTx = withoutDeleted(useTransactionStore.getState().transactions, deleted.transactions)
      const localCategories = withoutDeleted(useCategoryStore.getState().categories, deleted.categories)
      const localBudgets = withoutDeleted(useBudgetStore.getState().budgets, deleted.budgets)
      const localGoals = withoutDeleted(useGoalStore.getState().goals, deleted.goals)
      const localDebts = withoutDeleted(useDebtStore.getState().debts, deleted.debts)

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
        useTransactionStore.getState().replaceTransactions(localTx)
        useCategoryStore.getState().replaceCategories(localCategories)
        useBudgetStore.getState().replaceBudgets(localBudgets)
        useGoalStore.getState().replaceGoals(localGoals)
        useDebtStore.getState().replaceDebts(localDebts)
        await docSync
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

      await docSync
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

  // Keep this device in step with the others while it is open: on return to
  // the app (tab focus, phone app resume), every minute while visible, on an
  // explicit "sync now", and shortly after local edits to document stores.
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) return
    let debounce: ReturnType<typeof setTimeout> | undefined
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshData()
    }
    const onSyncNow = () => refreshData()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshData()
    }, PERIODIC_SYNC_MS)

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener(FINANCE_SYNC_NOW_EVENT, onSyncNow)
    subscribeToDocStores(() => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => {
        syncDocStores().catch(() => {})
      }, LOCAL_CHANGE_DEBOUNCE_MS)
    }).then((unsub) => {
      if (cancelled) unsub()
      else unsubscribe = unsub
    })

    return () => {
      cancelled = true
      clearInterval(timer)
      if (debounce) clearTimeout(debounce)
      unsubscribe?.()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener(FINANCE_SYNC_NOW_EVENT, onSyncNow)
    }
  }, [userId, refreshData])

  return {
    dataLoaded,
    refreshData,
  }
}
