'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { authClient } from '@/lib/auth-client'
import { useAuthStore } from '@/store/useAuthStore'
import { rehydrateAllStores } from '@/lib/cloudSync'

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

      // All User Data, transactions included, syncs through the sync engine
      // (src/lib/sync/appKinds.ts); nothing is fetched here any more.
      setDataLoaded(true)
    } catch {
      // ignore fetch errors
    } finally {
      isSyncingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isPending) {
      // Signed out, the local data is Guest Data and the app works on it as is.
      // Signed in, the record sync (useRecordSync) claims it for the user first.
      setUser(session?.user ?? null)
      refreshData()
      setLoading(false)
    }
  }, [session, isPending, setUser, setLoading, refreshData])

  return {
    dataLoaded,
    refreshData,
  }
}
