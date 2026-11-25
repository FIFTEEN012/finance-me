'use client'

import type { Transaction } from '@/types'
import { useNutritionStore, type FoodInput } from '@/store/useNutritionStore'
import { useTransactionStore } from '@/store/useTransactionStore'

/** The "save expense too" part of a Photo Draft. */
export interface PhotoDraftExpense {
  amount: number
  /** Must be a Food Category. */
  categoryId: string
}

const MAX_DESCRIPTION = 100

/** Expense description from the food names, e.g. "ข้าวมันไก่, ชาเย็น". */
function describeFood(entries: FoodInput[]): string {
  const text = entries.map((e) => e.name).join(', ')
  return text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION - 1)}…` : text
}

/**
 * Saves the ticked rows of a Photo Draft as Food Entries. With `expense`, first saves one
 * Food Expense on the same day to the server and links every saved Food Entry to it.
 *
 * Rejects, saving neither the Food Entries nor the expense, when the server does not
 * save the expense (an error status or a network error).
 */
export async function savePhotoDraft(
  entries: FoodInput[],
  expense: PhotoDraftExpense | null,
): Promise<{ foodIds: string[]; expenseId?: string }> {
  if (!expense || entries.length === 0) {
    const nutrition = useNutritionStore.getState()
    return { foodIds: entries.map((input) => nutrition.addFood(input)) }
  }

  const payload: Omit<Transaction, 'id' | 'createdAt'> = {
    type: 'EXPENSE',
    categoryId: expense.categoryId,
    amount: expense.amount,
    description: describeFood(entries),
    date: entries[0].date,
  }
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create transaction')
  }
  const json = await res.json()
  const expenseId: string = json.transaction?.id || crypto.randomUUID()

  const transactions = useTransactionStore.getState()
  transactions.replaceTransactions([
    { ...payload, id: expenseId, createdAt: new Date().toISOString() },
    ...transactions.transactions,
  ])
  // Only after the Food Expense is saved: link the Food Entries to it.
  return { foodIds: useNutritionStore.getState().addFoodForExpense(expenseId, entries), expenseId }
}
