'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Transaction, TransactionType } from '@/types'

interface TransactionStore {
  transactions: Transaction[]
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void
  updateTransaction: (id: string, t: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => void
  deleteTransaction: (id: string) => void
  deleteTransactions: (ids: string[]) => void
  recategorizeTransactions: (ids: string[], categoryId: string) => void
  bulkAddTag: (ids: string[], tag: string) => void
  bulkRemoveTag: (ids: string[], tag: string) => void
  getAllTags: () => string[]
  getTransactionsByMonth: (month: number, year: number) => Transaction[]
  getSumByTypeAndMonth: (type: TransactionType, month: number, year: number) => number
  replaceTransactions: (transactions: Transaction[]) => void
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      addTransaction: (t) =>
        set((s) => ({
          transactions: [
            ...s.transactions,
            { ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),
      updateTransaction: (id, t) =>
        set((s) => ({
          transactions: s.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...t } : tx
          ),
        })),
      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((tx) => tx.id !== id),
        })),
      deleteTransactions: (ids) =>
        set((s) => ({
          transactions: s.transactions.filter((tx) => !ids.includes(tx.id)),
        })),
      recategorizeTransactions: (ids, categoryId) =>
        set((s) => ({
          transactions: s.transactions.map((tx) =>
            ids.includes(tx.id) ? { ...tx, categoryId } : tx
          ),
        })),
      bulkAddTag: (ids, tag) =>
        set((s) => ({
          transactions: s.transactions.map((tx) => {
            if (!ids.includes(tx.id)) return tx
            const existing = tx.tags ?? []
            if (existing.includes(tag)) return tx
            return { ...tx, tags: [...existing, tag] }
          }),
        })),
      bulkRemoveTag: (ids, tag) =>
        set((s) => ({
          transactions: s.transactions.map((tx) => {
            if (!ids.includes(tx.id)) return tx
            return { ...tx, tags: (tx.tags ?? []).filter((t) => t !== tag) }
          }),
        })),
      getAllTags: () => {
        const set2 = new Set<string>()
        get().transactions.forEach((tx) => tx.tags?.forEach((t) => set2.add(t)))
        return Array.from(set2).sort()
      },
      getTransactionsByMonth: (month, year) =>
        get().transactions.filter((t) => {
          const d = new Date(t.date)
          return d.getMonth() + 1 === month && d.getFullYear() === year
        }),
      getSumByTypeAndMonth: (type, month, year) =>
        get()
          .getTransactionsByMonth(month, year)
          .filter((t) => t.type === type)
          .reduce((sum, t) => sum + t.amount, 0),
      replaceTransactions: (transactions) => set({ transactions }),
    }),
    { name: 'finance-transactions' }
  )
)
