'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ExerciseEntry, FoodEntry, HealthProfile, WaterEntry } from '@/types'
import { DEFAULT_CALORIE_GOAL, DEFAULT_WATER_GOAL } from '@/lib/nutrition'

export type FoodInput = Pick<FoodEntry, 'date' | 'meal' | 'name' | 'kcal' | 'proteinG' | 'carbsG' | 'fatG'>
export type ExerciseInput = Pick<ExerciseEntry, 'date' | 'activity' | 'name' | 'minutes' | 'kcal'>
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
  updateFood: (id: string, input: FoodInput) => void
  deleteFood: (id: string) => void
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
      updateFood: (id, input) =>
        set((s) => ({ food: s.food.map((e) => (e.id === id ? { ...e, ...input } : e)) })),
      deleteFood: (id) => set((s) => ({ food: s.food.filter((e) => e.id !== id) })),
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
