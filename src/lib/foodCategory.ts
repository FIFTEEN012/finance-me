import type { Category } from '@/types'

/** Id of the default "อาหาร" expense category (see defaultCategories.ts). */
export const DEFAULT_FOOD_CATEGORY_ID = 'cat-expense-1'

/**
 * Is this a Food Category (an expense Category marked as food)?
 * When `isFood` has never been set (old data), only the default "อาหาร" counts.
 */
export function isFoodCategory(category: Category | null | undefined): boolean {
  if (!category || category.type !== 'EXPENSE') return false
  if (typeof category.isFood === 'boolean') return category.isFood
  return category.id === DEFAULT_FOOD_CATEGORY_ID
}

/** The Food Categories among `categories`, in their order. */
export function foodCategories(categories: Category[]): Category[] {
  return categories.filter(isFoodCategory)
}
