'use client'

import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  name?: string | null
}

/** Who is signed in. Sync status lives in the sync engine (useSyncStatus). */
interface AuthStore {
  user:       AuthUser | null
  loading:    boolean

  setUser:       (user: AuthUser | null)   => void
  setLoading:    (loading: boolean)    => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user:       null,
  loading:    true,

  setUser:       (user)   => set({ user }),
  setLoading:    (loading) => set({ loading }),
}))
