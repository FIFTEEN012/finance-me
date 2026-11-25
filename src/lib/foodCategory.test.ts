import { describe, expect, it } from 'vitest'
import type { Category } from '@/types'
import { foodCategories, isFoodCategory } from './foodCategory'

function category(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-custom',
    name: 'กาแฟ',
    type: 'EXPENSE',
    icon: 'Coffee',
    color: '#000000',
    isDefault: false,
    ...overrides,
  }
}

describe('isFoodCategory', () => {
  it('treats the default "อาหาร" category as food when the flag is absent (old data)', () => {
    expect(isFoodCategory(category({ id: 'cat-expense-1', name: 'อาหาร', isDefault: true }))).toBe(true)
  })

  it('treats other expense categories as not food when the flag is absent', () => {
    expect(isFoodCategory(category())).toBe(false)
    expect(isFoodCategory(category({ id: 'cat-expense-2', name: 'เดินทาง', isDefault: true }))).toBe(false)
  })

  it('treats an expense category the user switched on as food', () => {
    expect(isFoodCategory(category({ isFood: true }))).toBe(true)
  })

  it('lets the user switch the default "อาหาร" category off', () => {
    expect(isFoodCategory(category({ id: 'cat-expense-1', name: 'อาหาร', isFood: false }))).toBe(false)
  })

  it('never treats income or transfer categories as food', () => {
    expect(isFoodCategory(category({ type: 'INCOME', isFood: true }))).toBe(false)
    expect(isFoodCategory(category({ type: 'TRANSFER', isFood: true }))).toBe(false)
  })

  it('returns false for a missing category', () => {
    expect(isFoodCategory(undefined)).toBe(false)
    expect(isFoodCategory(null)).toBe(false)
  })
})

describe('foodCategories', () => {
  it('keeps only Food Categories, for the Photo Draft expense category field', () => {
    const list = [
      category({ id: 'cat-expense-1', name: 'อาหาร', isDefault: true }),
      category({ id: 'cat-expense-2', name: 'เดินทาง', isDefault: true }),
      category({ id: 'cat-coffee', name: 'กาแฟ', isFood: true }),
      category({ id: 'cat-income', type: 'INCOME', isFood: true }),
    ]
    expect(foodCategories(list).map((c) => c.id)).toEqual(['cat-expense-1', 'cat-coffee'])
  })
})