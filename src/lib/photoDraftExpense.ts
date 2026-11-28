'use client'

import { useNutritionStore, type FoodInput } from '@/store/useNutritionStore'
import { saveNewTransaction } from '@/lib/saveTransaction'

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
 * Saves the ticked rows of a Photo Draft as Food Entries. With `expense`, also saves one
 * Food Expense on the same day and links every saved Food Entry to it (see
 * `saveNewTransaction`: the sync engine uploads them together).
 *
 * Rejects, saving neither the Food Entries nor the expense, when the expense cannot be
 * saved (e.g. an amount that is not above zero).
 */
export async function savePhotoDraft(
  entries: FoodInput[],
  expense: PhotoDraftExpense | null,
): Promise<{ foodIds: string[]; expenseId?: string }> {
  if (!expense || entries.length === 0) {
    const nutrition = useNutritionStore.getState()
    return { foodIds: entries.map((input) => nutrition.addFood(input)) }
  }

  const { id, foodIds } = saveNewTransaction(
    {
      type: 'EXPENSE',
      categoryId: expense.categoryId,
      amount: expense.amount,
      description: describeFood(entries),
      date: entries[0].date,
    },
    entries,
  )
  return { foodIds, expenseId: id }
}
