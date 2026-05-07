'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Category, TransactionType } from '@/types'
import { defaultCategories } from '@/lib/defaultCategories'

interface CategoryStore {
  categories: Category[]
  addCategory: (c: Omit<Category, 'id' | 'isDefault'>) => void
  updateCategory: (id: string, c: Partial<Category>) => void
  deleteCategory: (id: string) => void
  getCategoriesByType: (type: TransactionType) => Category[]
  getCategoryById: (id: string) => Category | undefined
  replaceCategories: (categories: Category[]) => void
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      categories: defaultCategories,
      addCategory: (c) =>
        set((s) => ({
          categories: [
            ...s.categories,
            { ...c, id: crypto.randomUUID(), isDefault: false },
          ],
        })),
      updateCategory: (id, c) =>
        set((s) => ({
          categories: s.categories.map((cat) =>
            cat.id === id ? { ...cat, ...c } : cat
          ),
        })),
      deleteCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
        })),
      getCategoriesByType: (type) =>
        get().categories.filter((c) => c.type === type),
      getCategoryById: (id) =>
        get().categories.find((c) => c.id === id),
      replaceCategories: (categories) => set({ categories }),
    }),
    { name: 'finance-categories' }
  )
)
