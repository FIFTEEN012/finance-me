'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FoodEntry, WaterEntry } from '@/types'
import { DEFAULT_CALORIE_GOAL, DEFAULT_WATER_GOAL } from '@/lib/nutrition'

export type FoodInput = Pick<FoodEntry, 'date' | 'meal' | 'name' | 'kcal'>

interface NutritionStore {
  food: FoodEntry[]
  water: WaterEntry[]
  calorieGoal: number
  waterGoal: number
  addFood: (input: FoodInput) => void
  updateFood: (id: string, input: FoodInput) => void
  deleteFood: (id: string) => void
  addWater: (date: string, ml: number) => void
  deleteWater: (id: string) => void
  setGoals: (calorieGoal: number, waterGoal: number) => void
}

export const useNutritionStore = create<NutritionStore>()(
  persist(
    (set) => ({
      food: [],
      water: [],
      calorieGoal: DEFAULT_CALORIE_GOAL,
      waterGoal: DEFAULT_WATER_GOAL,
      addFood: (input) =>
        set((s) => ({
          food: [...s.food, { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
        })),
      updateFood: (id, input) =>
        set((s) => ({ food: s.food.map((e) => (e.id === id ? { ...e, ...input } : e)) })),
      deleteFood: (id) => set((s) => ({ food: s.food.filter((e) => e.id !== id) })),
      addWater: (date, ml) =>
        set((s) => ({
          water: [...s.water, { id: crypto.randomUUID(), date, ml, createdAt: new Date().toISOString() }],
        })),
      deleteWater: (id) => set((s) => ({ water: s.water.filter((e) => e.id !== id) })),
      setGoals: (calorieGoal, waterGoal) => set({ calorieGoal, waterGoal }),
    }),
    { name: 'finance-nutrition' }
  )
)
