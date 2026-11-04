'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RecurringTransaction } from '@/types'
import { computeDueTransactions, resumeCursor, todayKey } from '@/lib/recurring'
import { useTransactionStore } from '@/store/useTransactionStore'

type RecurringInput = Pick<
  RecurringTransaction,
  'categoryId' | 'type' | 'amount' | 'description' | 'note' | 'frequency' | 'startDate'
>

interface RecurringStore {
  recurrings: RecurringTransaction[]
  addRecurring: (input: RecurringInput) => void
  updateRecurring: (id: string, input: RecurringInput) => void
  deleteRecurring: (id: string) => void
  setRecurringActive: (id: string, isActive: boolean) => void
  /** Records everything that has fallen due and returns how many transactions were added. */
  generateDue: () => number
}

// Not the old 'finance-recurrings' key: browsers may still hold rules from the
// removed feature, and reading them would silently start recording transactions.
export const useRecurringStore = create<RecurringStore>()(
  persist(
    (set, get) => ({
      recurrings: [],
      addRecurring: (input) =>
        set((s) => ({
          recurrings: [
            ...s.recurrings,
            { ...input, id: crypto.randomUUID(), isActive: true, createdAt: new Date().toISOString() },
          ],
        })),
      updateRecurring: (id, input) =>
        set((s) => ({
          recurrings: s.recurrings.map((r) => (r.id === id ? { ...r, ...input } : r)),
        })),
      deleteRecurring: (id) =>
        set((s) => ({ recurrings: s.recurrings.filter((r) => r.id !== id) })),
      setRecurringActive: (id, isActive) =>
        set((s) => ({
          recurrings: s.recurrings.map((r) => {
            if (r.id !== id) return r
            return isActive
              ? { ...r, isActive, lastGeneratedDate: resumeCursor(r, todayKey()) }
              : { ...r, isActive }
          }),
        })),
      generateDue: () => {
        const transactionStore = useTransactionStore.getState()
        const existingIds = new Set(transactionStore.transactions.map((t) => t.id))
        const { transactions, cursors } = computeDueTransactions(
          get().recurrings,
          todayKey(),
          existingIds,
          new Date().toISOString(),
        )

        if (Object.keys(cursors).length > 0) {
          set((s) => ({
            recurrings: s.recurrings.map((r) =>
              cursors[r.id] ? { ...r, lastGeneratedDate: cursors[r.id] } : r
            ),
          }))
        }
        if (transactions.length > 0) {
          transactionStore.addGeneratedTransactions(transactions)
        }
        return transactions.length
      },
    }),
    { name: 'finance-recurring-rules' }
  )
)
