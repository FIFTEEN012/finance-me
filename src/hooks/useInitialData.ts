'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { authClient } from '@/lib/auth-client'
import { useAuthStore } from '@/store/useAuthStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { rehydrateAllStores } from '@/lib/cloudSync'
import { ensureLocalDataBelongsTo } from '@/lib/localOwner'

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

      // 1. Get current local state. Only transactions still load here;
      // categories, budgets, goals and debts sync through the sync engine
      // (src/lib/sync/appKinds.ts).
      const localTx = useTransactionStore.getState().transactions

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
          body: JSON.stringify({ transactions: localTx }),
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

      // If there were any unpushed items locally, persist them to Neon in background
      if (unpushedTx.length > 0) {
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: unpushedTx }),
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
