'use client'

import { useEffect, useRef, useCallback } from 'react'
import { supabase, isCloudEnabled } from '@/lib/supabase'
import {
  pushToCloud,
  pullFromCloud,
  FINANCE_DIRTY_EVENT,
  FINANCE_SYNC_NOW_EVENT,
  getIsApplyingCloudData,
  hasUnsyncedLocalChanges,
} from '@/lib/cloudSync'
import { useAuthStore } from '@/store/useAuthStore'

const FAST_DEBOUNCE_MS = 1_500
const FALLBACK_INTERVAL_MS = 10_000
const PUSH_ON_HIDE = true

/*
 * Patch localStorage once at module level so the wrapper is never stacked.
 * Dispatches a CustomEvent instead of mutating React state directly,
 * keeping the patch side-effect-free w.r.t. component lifecycle.
 */
if (typeof window !== 'undefined') {
  const _original = localStorage.setItem.bind(localStorage)
  localStorage.setItem = function patchedSetItem(key: string, value: string) {
    _original(key, value)
    if (
      key.startsWith('finance-') &&
      !key.endsWith('__synced_at') &&
      !key.endsWith('__modified_at') &&
      !getIsApplyingCloudData()
    ) {
      try {
        _original(`${key}__modified_at`, String(Date.now()))
      } catch {
        // ignore quota/privacy errors
      }
      window.dispatchEvent(new CustomEvent(FINANCE_DIRTY_EVENT))
    }
  }
}

export function useSupabaseSync() {
  const { setUser, setLoading, setSyncStatus, setSyncError, setLastSyncAt } = useAuthStore()
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef         = useRef(false)

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        // Safely pull (merges unpushed local changes if any)
        await doSync(session.user.id, 'pull')
        startAutoSync(session.user.id)
      }
    })

    /* ── Auth state changes ── */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null
        setUser(user)

        if (user) {
          if (_event === 'SIGNED_IN') {
            await doSync(user.id, 'pull')
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
      if (PUSH_ON_HIDE && document.hidden && user && (dirtyRef.current || hasUnsyncedLocalChanges())) {
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

  /* Mark dirty & trigger fast debounced push on changes */
  useEffect(() => {
    const onDirty = () => {
      dirtyRef.current = true
      const user = useAuthStore.getState().user
      if (user) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = setTimeout(() => {
          doSync(user.id, 'push')
        }, FAST_DEBOUNCE_MS)
      }
    }

    const onSyncNow = () => {
      const user = useAuthStore.getState().user
      if (user) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        doSync(user.id, 'push')
      }
    }

    window.addEventListener(FINANCE_DIRTY_EVENT, onDirty)
    window.addEventListener(FINANCE_SYNC_NOW_EVENT, onSyncNow)

    return () => {
      window.removeEventListener(FINANCE_DIRTY_EVENT, onDirty)
      window.removeEventListener(FINANCE_SYNC_NOW_EVENT, onSyncNow)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [doSync])

  function startAutoSync(userId: string) {
    stopAutoSync()
    fallbackTimerRef.current = setInterval(() => {
      if (dirtyRef.current || hasUnsyncedLocalChanges()) {
        doSync(userId, 'push')
      }
    }, FALLBACK_INTERVAL_MS)
  }

  function stopAutoSync() {
    if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current)
    fallbackTimerRef.current = null
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = null
  }

  /* Expose manual sync trigger */
  return {
    manualSync: () => {
      const user = useAuthStore.getState().user
      if (user) doSync(user.id, 'push')
    },
  }
}
