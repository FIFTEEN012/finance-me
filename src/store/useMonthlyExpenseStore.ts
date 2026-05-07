'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MonthlyExpenseLog } from '@/types'

interface MonthlyExpenseStore {
  logs: MonthlyExpenseLog[]

  /** Add or replace a log (upsert by categoryId+year+month) */
  upsertLog: (log: Omit<MonthlyExpenseLog, 'id' | 'createdAt'>) => void
  deleteLog: (id: string) => void

  /** Get a single log for a specific category + month */
  getLog: (categoryId: string, year: number, month: number) => MonthlyExpenseLog | undefined
  /** Get all logs for a category sorted oldest→newest (for charts) */
  getLogsByCategory: (categoryId: string) => MonthlyExpenseLog[]
  /** Get all distinct categoryIds that have at least one log */
  getTrackedCategoryIds: () => string[]
  /** Add a category to be tracked (creates a placeholder-free entry — just marks it as tracked) */
  trackedCategoryIds: string[]
  trackCategory: (categoryId: string) => void
  untrackCategory: (categoryId: string) => void
}

export const useMonthlyExpenseStore = create<MonthlyExpenseStore>()(
  persist(
    (set, get) => ({
      logs: [],
      trackedCategoryIds: [],

      upsertLog: (log) =>
        set((s) => {
          const existing = s.logs.find(
            (l) => l.categoryId === log.categoryId && l.year === log.year && l.month === log.month
          )
          if (existing) {
            return {
              logs: s.logs.map((l) =>
                l.id === existing.id ? { ...l, amount: log.amount, note: log.note } : l
              ),
            }
          }
          return {
            logs: [
              ...s.logs,
              { ...log, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
            ],
          }
        }),

      deleteLog: (id) =>
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),

      getLog: (categoryId, year, month) =>
        get().logs.find(
          (l) => l.categoryId === categoryId && l.year === year && l.month === month
        ),

      getLogsByCategory: (categoryId) =>
        get()
          .logs.filter((l) => l.categoryId === categoryId)
          .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month),

      getTrackedCategoryIds: () => get().trackedCategoryIds,

      trackCategory: (categoryId) =>
        set((s) => ({
          trackedCategoryIds: s.trackedCategoryIds.includes(categoryId)
            ? s.trackedCategoryIds
            : [...s.trackedCategoryIds, categoryId],
        })),

      untrackCategory: (categoryId) =>
        set((s) => ({
          trackedCategoryIds: s.trackedCategoryIds.filter((id) => id !== categoryId),
          logs: s.logs.filter((l) => l.categoryId !== categoryId),
        })),
    }),
    { name: 'finance-monthly-expense-logs' }
  )
)
