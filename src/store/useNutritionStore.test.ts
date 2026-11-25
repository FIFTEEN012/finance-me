import { beforeEach, describe, expect, it } from 'vitest'
import { useNutritionStore } from './useNutritionStore'
import { waterOn } from '@/lib/nutrition'

beforeEach(() => {
  useNutritionStore.setState({ food: [], water: [], exercise: [], profile: null })
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
