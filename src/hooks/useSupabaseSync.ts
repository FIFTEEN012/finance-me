'use client'

import { useEffect, useRef, useCallback } from 'react'
import { supabase, isCloudEnabled } from '@/lib/supabase'
import { pushToCloud, pullFromCloud } from '@/lib/cloudSync'
import { useAuthStore } from '@/store/useAuthStore'

const PUSH_DEBOUNCE_MS = 30_000
const PUSH_ON_HIDE    = true
const FINANCE_DIRTY_EVENT = 'finance:store-dirty'

/*
 * Patch localStorage once at module level so the wrapper is never stacked.
 * Dispatches a CustomEvent instead of mutating React state directly,
 * keeping the patch side-effect-free w.r.t. component lifecycle.
 */
if (typeof window !== 'undefined') {
  const _original = localStorage.setItem.bind(localStorage)
  localStorage.setItem = function patchedSetItem(key: string, value: string) {
    _original(key, value)
    if (key.startsWith('finance-')) {
      window.dispatchEvent(new CustomEvent(FINANCE_DIRTY_EVENT))
    }
  }
}

export function useSupabaseSync() {
  const { setUser, setLoading, setSyncStatus, setSyncError, setLastSyncAt } = useAuthStore()
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const dirtyRef    = useRef(false)

  const doSync = useCallback(async (userId: string, direction: 'push' | 'pull') => {
    setSyncStatus('syncing')
    const result = direction === 'push'
      ? await pushToCloud(userId)
      : await pullFromCloud(userId)

    if (result.ok) {
      setLastSyncAt(new Date().toISOString())
      dirtyRef.current = false
    } else {
      setSyncError(result.error)
    }
  }, [setSyncStatus, setSyncError, setLastSyncAt])

  useEffect(() => {
    if (!isCloudEnabled || !supabase) {
      setLoading(false)
      return
    }

    /* ── Bootstrap: check existing session ── */
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        doSync(session.user.id, 'pull')
        startAutoSync(session.user.id)
      }
    })

    /* ── Auth state changes ── */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null
        setUser(user)

        if (user) {
          if (_event === 'SIGNED_IN') {
            doSync(user.id, 'pull')
          }
          startAutoSync(user.id)
        } else {
          stopAutoSync()
        }
      }
    )

    /* ── Push on tab hide ── */
    const handleVisibility = () => {
      const user = useAuthStore.getState().user
      if (PUSH_ON_HIDE && document.hidden && user) {
        doSync(user.id, 'push')
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
      stopAutoSync()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Mark dirty via CustomEvent from the module-level localStorage patch */
  useEffect(() => {
    const onDirty = () => { dirtyRef.current = true }
    window.addEventListener(FINANCE_DIRTY_EVENT, onDirty)
    return () => window.removeEventListener(FINANCE_DIRTY_EVENT, onDirty)
  }, [])

  function startAutoSync(userId: string) {
    stopAutoSync()
    timerRef.current = setInterval(() => {
      if (dirtyRef.current) doSync(userId, 'push')
    }, PUSH_DEBOUNCE_MS)
  }

  function stopAutoSync() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  /* Expose manual sync trigger */
  return {
    manualSync: () => {
      const user = useAuthStore.getState().user
      if (user) doSync(user.id, 'push')
    },
  }
}
