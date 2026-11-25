'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExerciseEntry, SessionMove, WorkoutPlan } from '@/types'
import { exerciseLabel } from '@/lib/fitness'
import { planFromSession } from '@/lib/workoutPlan'
import { useNutritionStore } from '@/store/useNutritionStore'

/** A Workout Plan being done now, with which sets are ticked off. */
export interface ActivePlan {
  plan: WorkoutPlan
  startedAt: string
  /** done[moveIndex][setIndex] */
  done: boolean[][]
}

/** The Moves of an active plan as a Workout Session records them: ticked sets only. */
export function sessionMoves(active: ActivePlan): SessionMove[] {
  return active.plan.moves
    .map((m, i) => ({ moveId: m.moveId, sets: (active.done[i] ?? []).filter(Boolean).length, count: m.count }))
    .filter((m) => m.sets > 0)
}

export interface FinishInput {
  date: string
  minutes: number
  kcal: number
}

export const WORKOUT_PLAN_STORE_KEY = 'finance-workout-plan'

interface WorkoutPlanStore {
  /** The one in-progress Workout Plan, or null. */
  active: ActivePlan | null
  /** A Workout Plan being edited before it starts, or null. */
  draft: WorkoutPlan | null
  /** Puts a plan in the editor (used by the builder and "repeat"). */
  setDraft: (plan: WorkoutPlan | null) => void
  /** Starts `plan` as the one in-progress plan, replacing any other, and clears the draft. */
  startPlan: (plan: WorkoutPlan) => void
  /**
   * Starts a new Workout Plan like a logged Workout Session (replacing any
   * active plan; ask first). False, and nothing changes, when it has no Moves to repeat.
   */
  repeatSession: (entry: ExerciseEntry) => boolean
  /** Ticks or un-ticks one set of the active plan. */
  toggleSet: (moveIndex: number, setIndex: number) => void
  /** Logs the active plan as a Workout Session (ticked sets only) and clears it. */
  finishPlan: (input: FinishInput) => void
  /** Drops the active plan without logging anything. */
  cancelPlan: () => void
}

export const useWorkoutPlanStore = create<WorkoutPlanStore>()(
  persist(
    (set, get) => ({
      active: null,
      draft: null,
      setDraft: (plan) => set({ draft: plan }),
      startPlan: (plan) =>
        set({
          draft: null,
          active: {
            plan,
            startedAt: new Date().toISOString(),
            done: plan.moves.map((m) => Array.from({ length: m.sets }, () => false)),
          },
        }),
      repeatSession: (entry) => {
        const plan = planFromSession(entry)
        if (!plan) return false
        get().startPlan(plan)
        return true
      },
      toggleSet: (moveIndex, setIndex) =>
        set((s) => {
          if (!s.active) return s
          const done = s.active.done.map((sets, i) =>
            i === moveIndex ? sets.map((d, j) => (j === setIndex ? !d : d)) : sets
          )
          return { active: { ...s.active, done } }
        }),
      finishPlan: ({ date, minutes, kcal }) => {
        const active = get().active
        if (!active) return
        useNutritionStore.getState().addExercise({
          date,
          activity: active.plan.activity,
          name: exerciseLabel(active.plan.activity),
          minutes,
          kcal,
          moves: sessionMoves(active),
        })
        set({ active: null })
      },
      cancelPlan: () => set({ active: null }),
    }),
    { name: WORKOUT_PLAN_STORE_KEY }
  )
)
