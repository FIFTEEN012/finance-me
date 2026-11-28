import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNutritionStore, type FoodInput } from '@/store/useNutritionStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { savePhotoDraft } from './photoDraftExpense'
import { kcalForExpense } from '@/lib/nutrition'

const lunch = { date: '2026-11-25', meal: 'lunch' as const }
const ticked: FoodInput[] = [
  { ...lunch, name: 'ข้าวมันไก่', kcal: 600, proteinG: 25 },
  { ...lunch, name: 'ชาเย็น', kcal: 250 },
]

const fetchMock = vi.fn()

beforeEach(() => {
  useNutritionStore.setState({ food: [], water: [], exercise: [], profile: null })
  useTransactionStore.setState({ transactions: [] })
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saving a Photo Draft with "save expense too" on', () => {
  it('saves the Food Expense on the device and links every ticked Food Entry to it, without waiting for the server', async () => {
    const { expenseId, foodIds } = await savePhotoDraft(ticked, { amount: 85, categoryId: 'cat-expense-1' })

    // The sync engine uploads both later; nothing is sent from here.
    expect(fetchMock).not.toHaveBeenCalled()
    const [expense, ...others] = useTransactionStore.getState().transactions
    expect(others).toHaveLength(0)
    expect(expense).toMatchObject({ id: expenseId, type: 'EXPENSE', amount: 85, categoryId: 'cat-expense-1', date: '2026-11-25' })
    expect(expense.description).toBe('ข้าวมันไก่, ชาเย็น')

    const food = useNutritionStore.getState().food
    expect(food.map((e) => e.id)).toEqual(foodIds)
    expect(food.map((e) => e.foodExpenseId)).toEqual([expenseId, expenseId])
    expect(food[0].proteinG).toBe(25)
    expect(kcalForExpense(food, expenseId!)).toBe(850)
  })

  it.each([
    ['a zero amount', { amount: 0, categoryId: 'cat-expense-1' }],
    ['no category', { amount: 85, categoryId: '' }],
  ])('saves nothing and rejects with %s', async (_label, expense) => {
    await expect(savePhotoDraft(ticked, expense)).rejects.toThrow()

    expect(useTransactionStore.getState().transactions).toHaveLength(0)
    expect(useNutritionStore.getState().food).toHaveLength(0)
  })
})

describe('saving a Photo Draft with the switch off', () => {
  it('saves only the Food Entries, without calling the server', async () => {
    const { expenseId, foodIds } = await savePhotoDraft(ticked, null)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(expenseId).toBeUndefined()
    expect(useTransactionStore.getState().transactions).toHaveLength(0)
    const food = useNutritionStore.getState().food
    expect(food.map((e) => e.id)).toEqual(foodIds)
    expect(food.map((e) => e.foodExpenseId)).toEqual([undefined, undefined])
  })
})
