'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { NetWorthItem, NetWorthSnapshot } from '@/types'

interface NetWorthStore {
  items: NetWorthItem[]
  snapshots: NetWorthSnapshot[]
  addItem: (item: Omit<NetWorthItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateItem: (id: string, item: Partial<Omit<NetWorthItem, 'id' | 'createdAt'>>) => void
  deleteItem: (id: string) => void
  takeSnapshot: (extraAssets?: number) => void
}

function calcTotals(items: NetWorthItem[]) {
  const totalAssets = items.filter((i) => i.type === 'ASSET').reduce((s, i) => s + i.amount, 0)
  const totalLiabilities = items.filter((i) => i.type === 'LIABILITY').reduce((s, i) => s + i.amount, 0)
  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities }
}

function pushSnapshot(snapshots: NetWorthSnapshot[], items: NetWorthItem[], extraAssets = 0): NetWorthSnapshot[] {
  const today = new Date().toISOString().slice(0, 10)
  const { totalAssets, totalLiabilities, netWorth } = calcTotals(items)
  const snap: NetWorthSnapshot = {
    date: today,
    totalAssets: totalAssets + extraAssets,
    totalLiabilities,
    netWorth: netWorth + extraAssets,
  }
  // replace same-date snapshot, keep at most 365 entries
  const filtered = snapshots.filter((s) => s.date !== today)
  return [...filtered, snap].slice(-365)
}

export const useNetWorthStore = create<NetWorthStore>()(
  persist(
    (set) => ({
      items: [],
      snapshots: [],
      addItem: (item) =>
        set((s) => {
          const items = [
            ...s.items,
            {
              ...item,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]
          return { items, snapshots: pushSnapshot(s.snapshots, items) }
        }),
      updateItem: (id, item) =>
        set((s) => {
          const items = s.items.map((i) =>
            i.id === id ? { ...i, ...item, updatedAt: new Date().toISOString() } : i
          )
          return { items, snapshots: pushSnapshot(s.snapshots, items) }
        }),
      deleteItem: (id) =>
        set((s) => {
          const items = s.items.filter((i) => i.id !== id)
          return { items, snapshots: pushSnapshot(s.snapshots, items) }
        }),
      takeSnapshot: (extraAssets = 0) =>
        set((s) => ({ snapshots: pushSnapshot(s.snapshots, s.items, extraAssets) })),
    }),
    { name: 'finance-networth' }
  )
)
