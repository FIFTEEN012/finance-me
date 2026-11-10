'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SupplyItem } from '@/types'
import { todayKey } from '@/lib/recurring'

export type SupplyInput = Pick<SupplyItem, 'name' | 'startDate' | 'finishedDate' | 'price' | 'quantity' | 'unit' | 'note'>

interface SupplyStore {
  items: SupplyItem[]
  addItem: (input: SupplyInput) => void
  updateItem: (id: string, input: SupplyInput) => void
  deleteItem: (id: string) => void
  markFinished: (id: string, finishedDate: string) => void
  /** Undoes a finish recorded by mistake. */
  markInUse: (id: string) => void
  /** Starts a new item of the same product from today. */
  restock: (id: string) => void
}

export const useSupplyStore = create<SupplyStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (input) =>
        set((s) => ({
          items: [...s.items, { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }],
        })),
      updateItem: (id, input) =>
        set((s) => ({
          items: s.items.map((item) => (item.id === id ? { ...item, ...input } : item)),
        })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter((item) => item.id !== id) })),
      markFinished: (id, finishedDate) =>
        set((s) => ({
          items: s.items.map((item) => (item.id === id ? { ...item, finishedDate } : item)),
        })),
      markInUse: (id) =>
        set((s) => ({
          items: s.items.map((item) => (item.id === id ? { ...item, finishedDate: undefined } : item)),
        })),
      restock: (id) => {
        const source = get().items.find((item) => item.id === id)
        if (!source) return
        get().addItem({
          name: source.name,
          startDate: todayKey(),
          price: source.price,
          quantity: source.quantity,
          unit: source.unit,
        })
      },
    }),
    { name: 'finance-supplies' }
  )
)
