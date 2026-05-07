'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Debt } from '@/types'

interface DebtStore {
  debts: Debt[]
  addDebt:    (d: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateDebt: (id: string, d: Partial<Omit<Debt, 'id' | 'createdAt'>>) => void
  deleteDebt: (id: string) => void
  makePayment:(id: string, amount: number) => void
}

export const useDebtStore = create<DebtStore>()(
  persist(
    (set) => ({
      debts: [],
      addDebt: (d) =>
        set((s) => ({
          debts: [...s.debts, {
            ...d,
            id:        crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        })),
      updateDebt: (id, d) =>
        set((s) => ({
          debts: s.debts.map((debt) =>
            debt.id === id ? { ...debt, ...d, updatedAt: new Date().toISOString() } : debt
          ),
        })),
      deleteDebt: (id) =>
        set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),
      makePayment: (id, amount) =>
        set((s) => ({
          debts: s.debts.map((d) =>
            d.id === id
              ? { ...d, currentBalance: Math.max(0, d.currentBalance - amount), updatedAt: new Date().toISOString() }
              : d
          ),
        })),
    }),
    { name: 'finance-debts' }
  )
)
