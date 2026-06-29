'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Routine, RoutineExercise } from '@/types/workout'

interface RoutineStore {
  routines: Routine[]
  addRoutine: (data: Omit<Routine, 'id' | 'createdAt'>) => void
  updateRoutine: (id: string, data: Partial<Omit<Routine, 'id' | 'createdAt'>>) => void
  deleteRoutine: (id: string) => void
  addExerciseToRoutine: (routineId: string, exercise: RoutineExercise) => void
  removeExerciseFromRoutine: (routineId: string, exerciseId: string) => void
  getRoutineById: (id: string) => Routine | undefined
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useRoutineStore = create<RoutineStore>()(
  persist(
    (set, get) => ({
      routines: [],

      addRoutine: (data) => {
        const routine: Routine = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        set({ routines: [...get().routines, routine] })
      },

      updateRoutine: (id, data) => {
        set({
          routines: get().routines.map((r) =>
            r.id === id ? { ...r, ...data } : r
          ),
        })
      },

      deleteRoutine: (id) => {
        set({ routines: get().routines.filter((r) => r.id !== id) })
      },

      addExerciseToRoutine: (routineId, exercise) => {
        set({
          routines: get().routines.map((r) =>
            r.id === routineId
              ? { ...r, exercises: [...r.exercises, exercise] }
              : r
          ),
        })
      },

      removeExerciseFromRoutine: (routineId, exerciseId) => {
        set({
          routines: get().routines.map((r) =>
            r.id === routineId
              ? { ...r, exercises: r.exercises.filter((e) => e.exerciseId !== exerciseId) }
              : r
          ),
        })
      },

      getRoutineById: (id) => get().routines.find((r) => r.id === id),
    }),
    { name: 'finance-routines' }
  )
)
