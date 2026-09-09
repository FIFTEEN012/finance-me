'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  pushToNeon,
  pullFromNeon,
  syncWithNeon,
  FINANCE_DIRTY_EVENT,
  FINANCE_SYNC_NOW_EVENT,
  getIsApplyingNeonData,
} from '@/lib/neonSync'
import { useAuthStore } from '@/store/useAuthStore'
import { authClient } from '@/lib/auth-client'

const FAST_DEBOUNCE_MS = 1_500
const FALLBACK_INTERVAL_MS = 30_000

/*
 * Patch localStorage at module level to detect local store changes
 */
if (typeof window !== 'undefined') {
  const _original = localStorage.setItem.bind(localStorage)
  localStorage.setItem = function patchedSetItem(key: string, value: string) {
    _original(key, value)
    if (
      key.startsWith('finance-') &&
      !key.endsWith('__synced_at') &&
      !key.endsWith('__modified_at') &&
      !getIsApplyingNeonData()
    ) {
      window.dispatchEvent(new CustomEvent(FINANCE_DIRTY_EVENT))
    }
  }
}

export function useNeonSync() {
  const { user, setUser, setLoading } = useAuthStore()
  const { data: session, isPending } = authClient.useSession()
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)

  // Sync user from better-auth session
  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    }
  }, [session, isPending, setUser, setLoading])

  // Initial pull when user logs in
  useEffect(() => {
    if (user?.id) {
      pullFromNeon().catch(() => {})
      startAutoSync()
    } else {
      stopAutoSync()
    }

    return () => stopAutoSync()
  }, [user?.id])

  const doPush = useCallback(async () => {
    if (!user) return
    const res = await pushToNeon()
    if (res.ok) {
      dirtyRef.current = false
      useAuthStore.getState().setLastSyncAt(new Date().toISOString())
    }
  }, [user])

  // Handle dirty events & sync now
  useEffect(() => {
    const onDirty = () => {
      dirtyRef.current = true
      if (user) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = setTimeout(() => {
          doPush()
        }, FAST_DEBOUNCE_MS)
      }
    }

    const onSyncNow = () => {
      if (user) {
        syncWithNeon().catch(() => {})
      }
    }

    window.addEventListener(FINANCE_DIRTY_EVENT, onDirty)
    window.addEventListener(FINANCE_SYNC_NOW_EVENT, onSyncNow)

    return () => {
      window.removeEventListener(FINANCE_DIRTY_EVENT, onDirty)
      window.removeEventListener(FINANCE_SYNC_NOW_EVENT, onSyncNow)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [user, doPush])

  // Handle visibility change (push when leaving tab)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && user && dirtyRef.current) {
        doPush()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user, doPush])

  function startAutoSync() {
    stopAutoSync()
    fallbackTimerRef.current = setInterval(() => {
      if (dirtyRef.current) {
        doPush()
      }
    }, FALLBACK_INTERVAL_MS)
  }

  function stopAutoSync() {
    if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current)
    fallbackTimerRef.current = null
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = null
  }

  return {
    manualSync: () => {
      if (user) syncWithNeon()
    },
  }
}
