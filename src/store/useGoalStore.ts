'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Goal } from '@/types'

const MILESTONES = [25, 50, 75, 100]

interface GoalStore {
  goals: Goal[]
  addGoal: (g: Omit<Goal, 'id' | 'createdAt'>) => void
  updateGoal: (id: string, g: Partial<Omit<Goal, 'id' | 'createdAt'>>) => void
  deleteGoal: (id: string) => void
  /** Returns array of milestone percentages newly crossed (e.g. [50, 75]) */
  addSaving: (id: string, amount: number) => number[]
  /** Sync all linkedPortfolio goals with the current portfolio value. Returns map of goalId → newly crossed milestones */
  syncPortfolioGoals: (portfolioValueTHB: number) => Record<string, number[]>
  replaceGoals: (goals: Goal[]) => void
}

// Changes reach the server through the sync engine (src/lib/sync/appKinds.ts).
export const useGoalStore = create<GoalStore>()(
  persist(
    (set, get) => ({
      goals: [],
      replaceGoals: (goals) => set({ goals }),
      addGoal: (g) => {
        const id = crypto.randomUUID()
        const newGoal = { ...g, id, createdAt: new Date().toISOString() }
        set((s) => ({
          goals: [...s.goals, newGoal],
        }))
      },
      updateGoal: (id, g) => {
        set((s) => ({
          goals: s.goals.map((goal) => (goal.id === id ? { ...goal, ...g } : goal)),
        }))
      },
      deleteGoal: (id) => {
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
      },
      addSaving: (id, amount) => {
        const goal = get().goals.find((g) => g.id === id)
        if (!goal) return []

        const prevPct     = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0
        const newSaved    = Math.max(0, goal.savedAmount + amount)
        const newPct      = goal.targetAmount > 0 ? (newSaved / goal.targetAmount) * 100 : 0
        const celebrated  = goal.milestonesCelebrated ?? []
        const newlyReached = MILESTONES.filter(
          (m) => prevPct < m && newPct >= m && !celebrated.includes(m)
        )

        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id
              ? {
                  ...g,
                  savedAmount: newSaved,
                  milestonesCelebrated: [...celebrated, ...newlyReached],
                }
              : g
          ),
        }))

        return newlyReached
      },
      syncPortfolioGoals: (portfolioValueTHB) => {
        const linked = get().goals.filter((g) => g.linkedPortfolio)
        if (linked.length === 0) return {}

        const results: Record<string, number[]> = {}

        set((s) => ({
          goals: s.goals.map((g) => {
            if (!g.linkedPortfolio) return g

            const prevPct    = g.targetAmount > 0 ? (g.savedAmount / g.targetAmount) * 100 : 0
            const newPct     = g.targetAmount > 0 ? (portfolioValueTHB / g.targetAmount) * 100 : 0
            const celebrated = g.milestonesCelebrated ?? []
            const newlyReached = MILESTONES.filter(
              (m) => prevPct < m && newPct >= m && !celebrated.includes(m)
            )

            results[g.id] = newlyReached

            const savedAmount = Math.round(portfolioValueTHB)
            if (savedAmount === g.savedAmount && newlyReached.length === 0) return g

            return {
              ...g,
              savedAmount,
              milestonesCelebrated: [...celebrated, ...newlyReached],
            }
          }),
        }))

        return results
      },
    }),
    { name: 'finance-goals' }
  )
)
