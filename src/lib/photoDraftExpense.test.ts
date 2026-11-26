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
const SERVER_ID = '22222222-2222-4222-8222-222222222222'

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

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

describe('saving a Photo Draft with "save expense too" on', () => {
  it('POSTs the Food Expense, then links every ticked Food Entry to the saved id', async () => {
    respond(201, { transaction: { id: SERVER_ID } })

    const { expenseId, foodIds } = await savePhotoDraft(ticked, { amount: 85, categoryId: 'cat-expense-1' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/transactions')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toMatchObject({
      type: 'EXPENSE',
      amount: 85,
      categoryId: 'cat-expense-1',
      date: '2026-11-25',
      description: 'ข้าวมันไก่, ชาเย็น',
    })

    expect(expenseId).toBe(SERVER_ID)
    const [expense, ...others] = useTransactionStore.getState().transactions
    expect(others).toHaveLength(0)
    expect(expense).toMatchObject({ id: SERVER_ID, type: 'EXPENSE', amount: 85, categoryId: 'cat-expense-1', date: '2026-11-25' })
    expect(expense.description).toBe('ข้าวมันไก่, ชาเย็น')

    const food = useNutritionStore.getState().food
    expect(food.map((e) => e.id)).toEqual(foodIds)
    expect(food.map((e) => e.foodExpenseId)).toEqual([SERVER_ID, SERVER_ID])
    expect(food[0].proteinG).toBe(25)
    expect(kcalForExpense(food, SERVER_ID)).toBe(850)
  })

  it('saves nothing and rejects when the server refuses the expense', async () => {
    respond(500, { error: 'boom' })

    await expect(savePhotoDraft(ticked, { amount: 85, categoryId: 'cat-expense-1' })).rejects.toThrow()

    expect(useTransactionStore.getState().transactions).toHaveLength(0)
    expect(useNutritionStore.getState().food).toHaveLength(0)
  })

  it('saves nothing and rejects on a network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(savePhotoDraft(ticked, { amount: 85, categoryId: 'cat-expense-1' })).rejects.toThrow()

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
