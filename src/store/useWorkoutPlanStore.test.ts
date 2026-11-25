import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutPlan } from '@/types'

const storage = vi.hoisted(() => {
  const data = new Map<string, string>()
  const ls = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  }
  // zustand's persist reads window.localStorage
  Object.defineProperty(globalThis, 'window', { value: { localStorage: ls }, configurable: true, writable: true })
  return data
})

import { useWorkoutPlanStore } from './useWorkoutPlanStore'
import { useNutritionStore } from './useNutritionStore'

const pushUps: WorkoutPlan = {
  activity: 'weights',
  moves: [
    { moveId: 'push-up', sets: 3, count: 10, restSeconds: 60 },
    { moveId: 'forearm-plank', sets: 2, count: 30, restSeconds: 30 },
  ],
}

beforeEach(() => {
  useWorkoutPlanStore.setState({ active: null, draft: null })
  useNutritionStore.setState({ exercise: [] })
})

describe('startPlan', () => {
  it('holds one Workout Plan at a time: starting another replaces it', () => {
    const store = useWorkoutPlanStore.getState()
    store.startPlan(pushUps)
    store.startPlan({ activity: 'yoga', moves: [{ moveId: 'forearm-plank', sets: 1, count: 20, restSeconds: 0 }] })

    const { active } = useWorkoutPlanStore.getState()
    expect(active?.plan.activity).toBe('yoga')
    expect(active?.plan.moves).toHaveLength(1)
  })
})

describe('finishPlan', () => {
  it('logs a Workout Session with the ticked sets of each Move and clears the plan', () => {
    const store = useWorkoutPlanStore.getState()
    store.startPlan(pushUps)
    store.toggleSet(0, 0)
    store.toggleSet(0, 1)
    store.toggleSet(1, 0)
    store.toggleSet(1, 1)
    store.toggleSet(1, 1) // un-tick

    useWorkoutPlanStore.getState().finishPlan({ date: '2026-11-25', minutes: 12, kcal: 70 })

    const [session] = useNutritionStore.getState().exercise
    expect(session).toMatchObject({
      date: '2026-11-25',
      activity: 'weights',
      minutes: 12,
      kcal: 70,
      moves: [
        { moveId: 'push-up', sets: 2, count: 10 },
        { moveId: 'forearm-plank', sets: 1, count: 30 },
      ],
    })
    expect(useWorkoutPlanStore.getState().active).toBeNull()
  })

  it('leaves out a Move with no ticked sets', () => {
    const store = useWorkoutPlanStore.getState()
    store.startPlan(pushUps)
    store.toggleSet(1, 0)

    useWorkoutPlanStore.getState().finishPlan({ date: '2026-11-25', minutes: 5, kcal: 25 })

    expect(useNutritionStore.getState().exercise[0].moves).toEqual([{ moveId: 'forearm-plank', sets: 1, count: 30 }])
  })
})

describe('cancelPlan', () => {
  it('drops the plan without logging a Workout Session', () => {
    const store = useWorkoutPlanStore.getState()
    store.startPlan(pushUps)
    store.toggleSet(0, 0)

    useWorkoutPlanStore.getState().cancelPlan()

    expect(useWorkoutPlanStore.getState().active).toBeNull()
    expect(useNutritionStore.getState().exercise).toEqual([])
  })
})

describe('persistence', () => {
  it('keeps the in-progress plan and its ticks after a reload', async () => {
    useWorkoutPlanStore.getState().startPlan(pushUps)
    useWorkoutPlanStore.getState().toggleSet(0, 2)
    expect(storage.has('finance-workout-plan')).toBe(true)

    vi.resetModules()
    const reloaded = (await import('./useWorkoutPlanStore')).useWorkoutPlanStore

    const { active } = reloaded.getState()
    expect(active?.plan).toEqual(pushUps)
    expect(active?.done[0]).toEqual([false, false, true])
  })
})
