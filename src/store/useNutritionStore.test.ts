import { beforeEach, describe, expect, it } from 'vitest'
import { useNutritionStore } from './useNutritionStore'

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
