'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ExerciseEntry, FoodEntry, HealthProfile, WaterEntry } from '@/types'
import { DEFAULT_CALORIE_GOAL, DEFAULT_WATER_GOAL } from '@/lib/nutrition'

export type FoodInput = Pick<FoodEntry, 'date' | 'meal' | 'name' | 'kcal' | 'proteinG' | 'carbsG' | 'fatG'>
export type ExerciseInput = Pick<ExerciseEntry, 'date' | 'activity' | 'name' | 'minutes' | 'kcal' | 'moves'>
export type ProfileInput = Omit<HealthProfile, 'updatedAt'>

interface NutritionStore {
  food: FoodEntry[]
  water: WaterEntry[]
  exercise: ExerciseEntry[]
  profile: HealthProfile | null
  calorieGoal: number
  waterGoal: number
  /** Returns the new Food Entry's id. */
  addFood: (input: FoodInput) => string
  /** Saves Food Entries linked to a Food Expense; returns their ids. */
  addFoodForExpense: (foodExpenseId: string, inputs: FoodInput[]) => string[]
  updateFood: (id: string, input: FoodInput) => void
  deleteFood: (id: string) => void
  /** Unlinks the Food Entries of these Food Expenses (the entries stay). */
  unlinkFoodExpenses: (foodExpenseIds: string[]) => void
  /** Re-points Food Entries from one Food Expense to another (e.g. after a split). */
  relinkFoodExpense: (fromId: string, toId: string) => void
  /** Returns the new entry's id (used to undo it). */
  addWater: (date: string, ml: number) => string
  deleteWater: (id: string) => void
  addExercise: (input: ExerciseInput) => void
  updateExercise: (id: string, input: ExerciseInput) => void
  deleteExercise: (id: string) => void
  setProfile: (input: ProfileInput) => void
  setGoals: (calorieGoal: number, waterGoal: number) => void
}

export const useNutritionStore = create<NutritionStore>()(
  persist(
    (set) => ({
      food: [],
      water: [],
      exercise: [],
      profile: null,
      calorieGoal: DEFAULT_CALORIE_GOAL,
      waterGoal: DEFAULT_WATER_GOAL,
      addFood: (input) => {
        const id = crypto.randomUUID()
        set((s) => ({
          food: [...s.food, { ...input, id, createdAt: new Date().toISOString() }],
        }))
        return id
      },
      addFoodForExpense: (foodExpenseId, inputs) => {
        const createdAt = new Date().toISOString()
        const entries = inputs.map((input) => ({ ...input, id: crypto.randomUUID(), foodExpenseId, createdAt }))
        set((s) => ({ food: [...s.food, ...entries] }))
        return entries.map((e) => e.id)
      },
      updateFood: (id, input) =>
        set((s) => ({ food: s.food.map((e) => (e.id === id ? { ...e, ...input } : e)) })),
      deleteFood: (id) => set((s) => ({ food: s.food.filter((e) => e.id !== id) })),
      unlinkFoodExpenses: (foodExpenseIds) =>
        set((s) => ({
          food: s.food.map((e) => {
            if (!e.foodExpenseId || !foodExpenseIds.includes(e.foodExpenseId)) return e
            const { foodExpenseId: _unlinked, ...rest } = e
            return rest
          }),
        })),
      relinkFoodExpense: (fromId, toId) =>
        set((s) => ({
          food: s.food.map((e) => (e.foodExpenseId === fromId ? { ...e, foodExpenseId: toId } : e)),
        })),
      addWater: (date, ml) => {
        const id = crypto.randomUUID()
        set((s) => ({ water: [...s.water, { id, date, ml, createdAt: new Date().toISOString() }] }))
        return id
      },
      deleteWater: (id) => set((s) => ({ water: s.water.filter((e) => e.id !== id) })),
      addExercise: (input) =>
        set((s) => ({
          exercise: [...s.exercise, { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
        })),
      updateExercise: (id, input) =>
        set((s) => ({ exercise: s.exercise.map((e) => (e.id === id ? { ...e, ...input } : e)) })),
      deleteExercise: (id) => set((s) => ({ exercise: s.exercise.filter((e) => e.id !== id) })),
      setProfile: (input) => set({ profile: { ...input, updatedAt: new Date().toISOString() } }),
      setGoals: (calorieGoal, waterGoal) => set({ calorieGoal, waterGoal }),
    }),
    { name: 'finance-nutrition' }
  )
)
