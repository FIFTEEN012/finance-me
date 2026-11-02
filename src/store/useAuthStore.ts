'use client'

import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export interface AuthUser {
  id: string
  email: string
  name?: string | null
}

interface AuthStore {
  user:       AuthUser | null
  loading:    boolean
  syncStatus: SyncStatus
  syncError:  string | null
  lastSyncAt: string | null   // ISO timestamp

  setUser:       (user: AuthUser | null)   => void
  setLoading:    (loading: boolean)    => void
  setSyncStatus: (s: SyncStatus)       => void
  setSyncError:  (e: string | null)    => void
  setLastSyncAt: (t: string)           => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user:       null,
  loading:    true,
  syncStatus: 'idle',
  syncError:  null,
  lastSyncAt: null,

  setUser:       (user)   => set({ user }),
  setLoading:    (loading) => set({ loading }),
  setSyncStatus: (s)      => set({ syncStatus: s, ...(s !== 'error' ? { syncError: null } : {}) }),
  setSyncError:  (e)      => set({ syncError: e, syncStatus: 'error' }),
  setLastSyncAt: (t)      => set({ lastSyncAt: t, syncStatus: 'success' }),
}))
