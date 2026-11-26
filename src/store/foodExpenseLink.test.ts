import { beforeEach, describe, expect, it } from 'vitest'
import { useNutritionStore } from './useNutritionStore'
import { useTransactionStore } from './useTransactionStore'
import { useCategoryStore } from './useCategoryStore'
import { kcalForExpense } from '@/lib/nutrition'

const lunch = { date: '2026-11-25', meal: 'lunch' as const }

function addFoodExpense(amount = 120) {
  return useTransactionStore.getState().addTransaction({
    type: 'EXPENSE', categoryId: 'cat-expense-1', amount, description: 'ข้าวกลางวัน', date: '2026-11-25',
  })
}

beforeEach(() => {
  useNutritionStore.setState({ food: [], water: [], exercise: [], profile: null })
  useTransactionStore.setState({ transactions: [] })
})

describe('Food Expense with Food Entries', () => {
  it('links every Food Entry saved with the Food Expense', () => {
    const expenseId = addFoodExpense()

    const ids = useNutritionStore.getState().addFoodForExpense(expenseId, [
      { ...lunch, name: 'ข้าวมันไก่', kcal: 600 },
      { ...lunch, name: 'ชาเย็น', kcal: 250 },
    ])

    const food = useNutritionStore.getState().food
    expect(ids).toHaveLength(2)
    expect(food.map((e) => e.foodExpenseId)).toEqual([expenseId, expenseId])
    expect(kcalForExpense(food, expenseId)).toBe(850)
  })
})

describe('deleting either side only unlinks', () => {
  it('deleting the Food Expense keeps its Food Entries, unlinked', () => {
    const expenseId = addFoodExpense()
    useNutritionStore.getState().addFoodForExpense(expenseId, [{ ...lunch, name: 'ข้าวมันไก่', kcal: 600 }])

    useTransactionStore.getState().deleteTransaction(expenseId)

    const [entry] = useNutritionStore.getState().food
    expect(entry.name).toBe('ข้าวมันไก่')
    expect(entry.foodExpenseId).toBeUndefined()
  })

  it('deleting several expenses at once unlinks their Food Entries', () => {
    const a = addFoodExpense()
    const b = addFoodExpense()
    const keep = addFoodExpense()
    const store = useNutritionStore.getState()
    store.addFoodForExpense(a, [{ ...lunch, name: 'ก', kcal: 100 }])
    store.addFoodForExpense(b, [{ ...lunch, name: 'ข', kcal: 200 }])
    store.addFoodForExpense(keep, [{ ...lunch, name: 'ค', kcal: 300 }])

    useTransactionStore.getState().deleteTransactions([a, b])

    expect(useNutritionStore.getState().food.map((e) => e.foodExpenseId)).toEqual([undefined, undefined, keep])
  })

  it('deleting a Food Entry keeps the Food Expense', () => {
    const expenseId = addFoodExpense()
    const [foodId] = useNutritionStore.getState().addFoodForExpense(expenseId, [{ ...lunch, name: 'ข้าวมันไก่', kcal: 600 }])

    useNutritionStore.getState().deleteFood(foodId)

    expect(useTransactionStore.getState().transactions.map((t) => t.id)).toEqual([expenseId])
    expect(kcalForExpense(useNutritionStore.getState().food, expenseId)).toBe(0)
  })
})

describe('the link survives changes to the Food Expense', () => {
  it('stays when the expense moves to a non-food category', () => {
    const expenseId = addFoodExpense()
    useNutritionStore.getState().addFoodForExpense(expenseId, [{ ...lunch, name: 'ข้าวมันไก่', kcal: 600 }])

    useTransactionStore.getState().updateTransaction(expenseId, { categoryId: 'cat-expense-2' })
    useTransactionStore.getState().recategorizeTransactions([expenseId], 'cat-expense-3')

    expect(kcalForExpense(useNutritionStore.getState().food, expenseId)).toBe(600)
  })

  it('stays when its category is switched off as food', () => {
    const expenseId = addFoodExpense()
    useNutritionStore.getState().addFoodForExpense(expenseId, [{ ...lunch, name: 'ข้าวมันไก่', kcal: 600 }])

    useCategoryStore.getState().updateCategory('cat-expense-1', { isFood: false })

    expect(kcalForExpense(useNutritionStore.getState().food, expenseId)).toBe(600)
  })

  it('moves to the first row when the expense is split', () => {
    const expenseId = addFoodExpense(200)
    useNutritionStore.getState().addFoodForExpense(expenseId, [
      { ...lunch, name: 'ข้าวมันไก่', kcal: 600 },
      { ...lunch, name: 'ชาเย็น', kcal: 250 },
    ])

    const [first, second] = useTransactionStore.getState().splitTransaction(expenseId, [
      { categoryId: 'cat-expense-1', amount: 150, description: 'ข้าว' },
      { categoryId: 'cat-expense-2', amount: 50, description: 'ของใช้' },
    ])

    const { transactions } = useTransactionStore.getState()
    const food = useNutritionStore.getState().food
    expect(transactions.map((t) => t.id).sort()).toEqual([first, second].sort())
    expect(food.map((e) => e.foodExpenseId)).toEqual([first, first])
    expect(kcalForExpense(food, second)).toBe(0)
  })
})

describe('Food Entries without an expense', () => {
  it('still save on their own', () => {
    useNutritionStore.getState().addFood({ ...lunch, name: 'ผลไม้', kcal: 80 })
    expect(useNutritionStore.getState().food[0].foodExpenseId).toBeUndefined()
  })
})
