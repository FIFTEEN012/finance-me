'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RecurringTransaction } from '@/types'

interface RecurringStore {
  recurrings: RecurringTransaction[]
  addRecurring: (r: Omit<RecurringTransaction, 'id' | 'createdAt'>) => void
  updateRecurring: (id: string, r: Partial<Omit<RecurringTransaction, 'id' | 'createdAt'>>) => void
  deleteRecurring: (id: string) => void
  setLastGeneratedDate: (id: string, date: string) => void
}

export const useRecurringStore = create<RecurringStore>()(
  persist(
    (set) => ({
      recurrings: [],
      addRecurring: (r) =>
        set((s) => ({
          recurrings: [
            ...s.recurrings,
            { ...r, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),
      updateRecurring: (id, r) =>
        set((s) => ({
          recurrings: s.recurrings.map((rec) =>
            rec.id === id ? { ...rec, ...r } : rec
          ),
        })),
      deleteRecurring: (id) =>
        set((s) => ({
          recurrings: s.recurrings.filter((r) => r.id !== id),
        })),
      setLastGeneratedDate: (id, date) =>
        set((s) => ({
          recurrings: s.recurrings.map((r) =>
            r.id === id ? { ...r, lastGeneratedDate: date } : r
          ),
        })),
    }),
    { name: 'finance-recurrings' }
  )
)
