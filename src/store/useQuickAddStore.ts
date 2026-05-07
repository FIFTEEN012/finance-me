'use client'

import { create } from 'zustand'

export interface QuickAddPrefill {
  type?:        'INCOME' | 'EXPENSE'
  amount?:      number
  description?: string
  date?:        Date
  categoryId?:  string
}

interface QuickAddStore {
  open:      boolean
  scanOpen:  boolean
  prefill:   QuickAddPrefill | null
  setOpen:   (open: boolean, prefill?: QuickAddPrefill) => void
  setScanOpen: (open: boolean) => void
  clearPrefill: () => void
}

export const useQuickAddStore = create<QuickAddStore>()((set) => ({
  open:      false,
  scanOpen:  false,
  prefill:   null,
  setOpen:   (open, prefill) => set({ open, prefill: prefill ?? null }),
  setScanOpen: (scanOpen) => set({ scanOpen }),
  clearPrefill: () => set({ prefill: null }),
}))
