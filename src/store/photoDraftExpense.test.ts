import { beforeEach, describe, expect, it } from 'vitest'
import { useNutritionStore, type FoodInput } from './useNutritionStore'
import { useTransactionStore } from './useTransactionStore'
import { savePhotoDraft } from './photoDraftExpense'
import { kcalForExpense } from '@/lib/nutrition'

const lunch = { date: '2026-11-25', meal: 'lunch' as const }
const ticked: FoodInput[] = [
  { ...lunch, name: 'ข้าวมันไก่', kcal: 600, proteinG: 25 },
  { ...lunch, name: 'ชาเย็น', kcal: 250 },
]

beforeEach(() => {
  useNutritionStore.setState({ food: [], water: [], exercise: [], profile: null })
  useTransactionStore.setState({ transactions: [] })
})

describe('saving a Photo Draft with "save expense too" on', () => {
  it('creates one Food Expense linked to every ticked Food Entry', () => {
    const { expenseId, foodIds } = savePhotoDraft(ticked, { amount: 85, categoryId: 'cat-expense-1' })

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
})

describe('saving a Photo Draft with the switch off', () => {
  it('saves only the Food Entries, as before', () => {
    const { expenseId, foodIds } = savePhotoDraft(ticked, null)

    expect(expenseId).toBeUndefined()
    expect(useTransactionStore.getState().transactions).toHaveLength(0)
    const food = useNutritionStore.getState().food
    expect(food.map((e) => e.id)).toEqual(foodIds)
    expect(food.map((e) => e.foodExpenseId)).toEqual([undefined, undefined])
  })
})
