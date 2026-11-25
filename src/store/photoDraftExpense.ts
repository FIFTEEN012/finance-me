'use client'

import { useNutritionStore, type FoodInput } from './useNutritionStore'
import { useTransactionStore } from './useTransactionStore'

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
 * Saves the ticked rows of a Photo Draft as Food Entries. With `expense`, also creates one
 * Food Expense on the same day and links every saved Food Entry to it.
 */
export function savePhotoDraft(
  entries: FoodInput[],
  expense: PhotoDraftExpense | null,
): { foodIds: string[]; expenseId?: string } {
  const nutrition = useNutritionStore.getState()
  if (!expense || entries.length === 0) {
    return { foodIds: entries.map((input) => nutrition.addFood(input)) }
  }
  const expenseId = useTransactionStore.getState().addTransaction({
    type: 'EXPENSE',
    categoryId: expense.categoryId,
    amount: expense.amount,
    description: describeFood(entries),
    date: entries[0].date,
  })
  return { foodIds: nutrition.addFoodForExpense(expenseId, entries), expenseId }
}
