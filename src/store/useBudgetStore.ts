'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Budget } from '@/types'

interface BudgetStore {
  budgets: Budget[]
  addBudget: (b: Omit<Budget, 'id'>) => void
  updateBudget: (id: string, b: Partial<Omit<Budget, 'id'>>) => void
  deleteBudget: (id: string) => void
  getBudgetsByMonth: (month: number, year: number) => Budget[]
  getBudget: (categoryId: string, month: number, year: number) => Budget | undefined
  replaceBudgets: (budgets: Budget[]) => void
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      budgets: [],
      addBudget: (b) => {
        const id = crypto.randomUUID()
        const newBudget = { ...b, id }
        set((s) => ({
          budgets: [...s.budgets, newBudget],
        }))
        if (typeof window !== 'undefined') {
          fetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newBudget),
          }).catch(() => {})
        }
      },
      updateBudget: (id, b) => {
        set((s) => ({
          budgets: s.budgets.map((budget) =>
            budget.id === id ? { ...budget, ...b } : budget
          ),
        }))
        if (typeof window !== 'undefined') {
          fetch(`/api/budgets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(b),
          }).catch(() => {})
        }
      },
      deleteBudget: (id) => {
        set((s) => ({
          budgets: s.budgets.filter((b) => b.id !== id),
        }))
        if (typeof window !== 'undefined') {
          fetch(`/api/budgets/${id}`, { method: 'DELETE' }).catch(() => {})
        }
      },
      getBudgetsByMonth: (month, year) =>
        get().budgets.filter((b) => b.month === month && b.year === year),
      getBudget: (categoryId, month, year) =>
        get().budgets.find(
          (b) =>
            b.categoryId === categoryId &&
            b.month === month &&
            b.year === year
        ),
      replaceBudgets: (budgets) => set({ budgets }),
    }),
    { name: 'finance-budgets' }
  )
)
