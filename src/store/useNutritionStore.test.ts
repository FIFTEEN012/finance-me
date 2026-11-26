import { beforeEach, describe, expect, it } from 'vitest'
import { useNutritionStore } from './useNutritionStore'
import { waterOn } from '@/lib/nutrition'
import { burnedOn, minutesOn, weekMinutes } from '@/lib/fitness'

beforeEach(() => {
  useNutritionStore.setState({ food: [], water: [], exercise: [], profile: null })
})

describe('addFood', () => {
  it('returns the id of the new Food Entry and keeps its macros', () => {
    const id = useNutritionStore.getState().addFood({
      date: '2026-11-19', meal: 'lunch', name: 'ข้าวมันไก่', kcal: 600, proteinG: 25, carbsG: 70, fatG: 22,
    })
    const [entry] = useNutritionStore.getState().food
    expect(entry.id).toBe(id)
    expect(entry).toMatchObject({ name: 'ข้าวมันไก่', kcal: 600, proteinG: 25, carbsG: 70, fatG: 22 })
  })

  it('accepts a Food Entry without macros', () => {
    useNutritionStore.getState().addFood({ date: '2026-11-19', meal: 'snack', name: 'กาแฟเย็น', kcal: 180 })
    const [entry] = useNutritionStore.getState().food
    expect(entry.proteinG).toBeUndefined()
  })
})

describe('updateFood', () => {
  it('clears a macro that the edit leaves blank', () => {
    const id = useNutritionStore.getState().addFood({
      date: '2026-11-19', meal: 'lunch', name: 'ข้าวมันไก่', kcal: 600, proteinG: 25, carbsG: 70, fatG: 22,
    })
    useNutritionStore.getState().updateFood(id, {
      date: '2026-11-19', meal: 'lunch', name: 'ข้าวมันไก่', kcal: 600, proteinG: 30, carbsG: undefined, fatG: undefined,
    })
    expect(useNutritionStore.getState().food[0]).toMatchObject({ proteinG: 30, carbsG: undefined, fatG: undefined })
  })
})

describe('Workout Sessions', () => {
  it('keeps the Moves of a session, and an edit from the quick form leaves them alone', () => {
    const store = useNutritionStore.getState()
    store.addExercise({
      date: '2026-11-25', activity: 'weights', name: 'เวทเทรนนิ่ง', minutes: 20, kcal: 100,
      moves: [{ moveId: 'push-up', sets: 3, count: 10 }],
    })
    const [session] = useNutritionStore.getState().exercise
    useNutritionStore.getState().updateExercise(session.id, {
      date: '2026-11-25', activity: 'weights', name: 'เวทเทรนนิ่ง', minutes: 25, kcal: 125,
    })
    expect(useNutritionStore.getState().exercise[0]).toMatchObject({
      minutes: 25,
      moves: [{ moveId: 'push-up', sets: 3, count: 10 }],
    })
  })

  it('counts a session with Moves and a quick log without them the same way', () => {
    const store = useNutritionStore.getState()
    store.addExercise({ date: '2026-11-25', activity: 'run', name: 'วิ่ง', minutes: 30, kcal: 290 })
    store.addExercise({
      date: '2026-11-25', activity: 'weights', name: 'เวทเทรนนิ่ง', minutes: 20, kcal: 100,
      moves: [{ moveId: 'push-up', sets: 3, count: 10 }],
    })
    const { exercise } = useNutritionStore.getState()
    expect(minutesOn(exercise, '2026-11-25')).toBe(50)
    expect(burnedOn(exercise, '2026-11-25')).toBe(390)
    expect(weekMinutes(exercise, '2026-11-25')).toBe(50)
  })
})

describe('water undo', () => {
  it('undoing a sip removes only that sip', () => {
    const store = useNutritionStore.getState()
    store.addWater('2026-11-25', 500)
    const id = store.addWater('2026-11-25', 250)

    useNutritionStore.getState().deleteWater(id)

    expect(waterOn(useNutritionStore.getState().water, '2026-11-25')).toBe(500)
  })
})
