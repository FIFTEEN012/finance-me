'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkoutSession, WorkoutExerciseEntry, WorkoutSet } from '@/types/workout'

interface WorkoutStore {
  sessions: WorkoutSession[]
  activeSession: WorkoutSession | null

  // Active workout
  startWorkout: (date?: string) => void
  addExerciseToActive: (exerciseId: string, exerciseName: string, initialSets?: { reps: number; weight: number }[]) => void
  removeExerciseFromActive: (entryId: string) => void
  addSet: (entryId: string) => void
  removeSet: (entryId: string, setIndex: number) => void
  updateSet: (entryId: string, setIndex: number, data: Partial<WorkoutSet>) => void
  toggleSetDone: (entryId: string, setIndex: number) => void
  finishWorkout: (note?: string) => void
  cancelWorkout: () => void

  // History
  getSessionsByDate: (date: string) => WorkoutSession[]
  getSessionsInRange: (startDate: string, endDate: string) => WorkoutSession[]
  deleteSession: (sessionId: string) => void

  // Stats
  getWorkoutStreak: () => number
  getWeeklyCount: () => number
  getTotalSetsThisWeek: () => number
  hasWorkedOutToday: () => boolean
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().slice(0, 10)
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSession: null,

      startWorkout: (date) => {
        set({
          activeSession: {
            id: generateId(),
            date: date ?? getToday(),
            startTime: new Date().toISOString(),
            exercises: [],
            createdAt: new Date().toISOString(),
          },
        })
      },

      addExerciseToActive: (exerciseId, exerciseName, initialSets) => {
        const { activeSession } = get()
        if (!activeSession) return
        const sets: WorkoutSet[] = initialSets && initialSets.length > 0
          ? initialSets.map(s => ({ reps: s.reps, weight: s.weight, done: false }))
          : [{ reps: 0, weight: 0, done: false }]
        const entry: WorkoutExerciseEntry = {
          id: generateId(),
          exerciseId,
          exerciseName,
          sets,
        }
        set({
          activeSession: {
            ...activeSession,
            exercises: [...activeSession.exercises, entry],
          },
        })
      },

      removeExerciseFromActive: (entryId) => {
        const { activeSession } = get()
        if (!activeSession) return
        set({
          activeSession: {
            ...activeSession,
            exercises: activeSession.exercises.filter((e) => e.id !== entryId),
          },
        })
      },

      addSet: (entryId) => {
        const { activeSession } = get()
        if (!activeSession) return
        set({
          activeSession: {
            ...activeSession,
            exercises: activeSession.exercises.map((e) =>
              e.id === entryId
                ? { ...e, sets: [...e.sets, { reps: 0, weight: 0, done: false }] }
                : e
            ),
          },
        })
      },

      removeSet: (entryId, setIndex) => {
        const { activeSession } = get()
        if (!activeSession) return
        set({
          activeSession: {
            ...activeSession,
            exercises: activeSession.exercises.map((e) =>
              e.id === entryId
                ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
                : e
            ),
          },
        })
      },

      updateSet: (entryId, setIndex, data) => {
        const { activeSession } = get()
        if (!activeSession) return
        set({
          activeSession: {
            ...activeSession,
            exercises: activeSession.exercises.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    sets: e.sets.map((s, i) =>
                      i === setIndex ? { ...s, ...data } : s
                    ),
                  }
                : e
            ),
          },
        })
      },

      toggleSetDone: (entryId, setIndex) => {
        const { activeSession } = get()
        if (!activeSession) return
        set({
          activeSession: {
            ...activeSession,
            exercises: activeSession.exercises.map((e) =>
              e.id === entryId
                ? {
                    ...e,
                    sets: e.sets.map((s, i) =>
                      i === setIndex ? { ...s, done: !s.done } : s
                    ),
                  }
                : e
            ),
          },
        })
      },

      finishWorkout: (note) => {
        const { activeSession, sessions } = get()
        if (!activeSession || activeSession.exercises.length === 0) return
        const completed: WorkoutSession = {
          ...activeSession,
          endTime: new Date().toISOString(),
          note,
        }
        set({
          sessions: [completed, ...sessions],
          activeSession: null,
        })
      },

      cancelWorkout: () => set({ activeSession: null }),

      getSessionsByDate: (date) =>
        get().sessions.filter((s) => s.date === date),

      getSessionsInRange: (startDate, endDate) =>
        get().sessions.filter((s) => s.date >= startDate && s.date <= endDate),

      deleteSession: (sessionId) =>
        set({ sessions: get().sessions.filter((s) => s.id !== sessionId) }),

      getWorkoutStreak: () => {
        const { sessions } = get()
        if (sessions.length === 0) return 0
        const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse()
        let streak = 0
        const today = getToday()
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

        // Check if streak includes today or yesterday
        if (dates[0] !== today && dates[0] !== yesterday) return 0

        let checkDate = dates[0] === today ? today : yesterday
        for (const date of dates) {
          if (date === checkDate) {
            streak++
            const d = new Date(checkDate)
            d.setDate(d.getDate() - 1)
            checkDate = d.toISOString().slice(0, 10)
          } else if (date < checkDate) {
            break
          }
        }
        return streak
      },

      getWeeklyCount: () => {
        const monday = getMonday()
        return get().getSessionsInRange(monday, getToday()).length
      },

      getTotalSetsThisWeek: () => {
        const monday = getMonday()
        return get()
          .getSessionsInRange(monday, getToday())
          .reduce(
            (total, s) =>
              total + s.exercises.reduce((t, e) => t + e.sets.filter((s) => s.done).length, 0),
            0
          )
      },

      hasWorkedOutToday: () => get().getSessionsByDate(getToday()).length > 0,
    }),
    { name: 'finance-workouts' }
  )
)
