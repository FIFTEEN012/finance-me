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
      addCategory: (c) => {
        const id = crypto.randomUUID()
        const newCat = { ...c, id, isDefault: false }
        set((s) => ({
          categories: [...s.categories, newCat],
        }))
        if (typeof window !== 'undefined') {
          fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCat),
          }).catch(() => {})
        }
      },
      updateCategory: (id, c) => {
        set((s) => ({
          categories: s.categories.map((cat) =>
            cat.id === id ? { ...cat, ...c } : cat
          ),
        }))
        if (typeof window !== 'undefined') {
          fetch(`/api/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c),
          }).catch(() => {})
        }
      },
      deleteCategory: (id) => {
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
        }))
        if (typeof window !== 'undefined') {
          fetch(`/api/categories/${id}`, { method: 'DELETE' }).catch(() => {})
        }
      },
      getCategoriesByType: (type) =>
        get().categories.filter((c) => c.type === type),
      getCategoryById: (id) =>
        get().categories.find((c) => c.id === id),
      replaceCategories: (categories) => set({ categories }),
    }),
    {
      name: 'finance-categories',
      version: 2,
      migrate: (persistedState) => {
        if (
          typeof persistedState !== 'object' ||
          persistedState === null ||
          !Array.isArray((persistedState as { categories?: unknown }).categories)
        ) {
          return { categories: defaultCategories }
        }

        const categories = (persistedState as { categories: Category[] }).categories
        const existingIds = new Set(categories.map((category) => category.id))
        const missingDefaults = defaultCategories.filter((category) => !existingIds.has(category.id))
        return { categories: [...categories, ...missingDefaults] }
      },
    }
  )
)
