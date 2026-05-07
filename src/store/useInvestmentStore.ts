'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { InvestmentHolding, PortfolioSnapshot, DividendRecord } from '@/types'

interface InvestmentStore {
  holdings: InvestmentHolding[]
  portfolioSnapshots: PortfolioSnapshot[]
  dividends: DividendRecord[]

  addHolding: (h: Omit<InvestmentHolding, 'id' | 'createdAt' | 'lastPriceUpdate'>) => void
  updateHolding: (id: string, h: Partial<Omit<InvestmentHolding, 'id' | 'createdAt'>>) => void
  deleteHolding: (id: string) => void
  updatePrice: (id: string, newPrice: number) => void

  takePortfolioSnapshot: (totalValueTHB: number, totalCostTHB: number) => void

  addDividend: (d: Omit<DividendRecord, 'id' | 'createdAt'>) => void
  deleteDividend: (id: string) => void
}

export const useInvestmentStore = create<InvestmentStore>()(
  persist(
    (set) => ({
      holdings: [],
      portfolioSnapshots: [],
      dividends: [],

      addHolding: (h) =>
        set((s) => ({
          holdings: [
            ...s.holdings,
            {
              ...h,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              lastPriceUpdate: new Date().toISOString(),
            },
          ],
        })),

      updateHolding: (id, h) =>
        set((s) => ({
          holdings: s.holdings.map((item) =>
            item.id === id ? { ...item, ...h } : item
          ),
        })),

      deleteHolding: (id) =>
        set((s) => ({
          holdings: s.holdings.filter((h) => h.id !== id),
          dividends: s.dividends.filter((d) => d.holdingId !== id),
        })),

      updatePrice: (id, newPrice) =>
        set((s) => ({
          holdings: s.holdings.map((h) =>
            h.id === id
              ? { ...h, currentPricePerUnit: newPrice, lastPriceUpdate: new Date().toISOString() }
              : h
          ),
        })),

      takePortfolioSnapshot: (totalValueTHB, totalCostTHB) =>
        set((s) => {
          const today = new Date().toISOString().slice(0, 10)
          const snap: PortfolioSnapshot = { date: today, totalValueTHB, totalCostTHB }
          const filtered = s.portfolioSnapshots.filter((p) => p.date !== today)
          return { portfolioSnapshots: [...filtered, snap].slice(-365) }
        }),

      addDividend: (d) =>
        set((s) => ({
          dividends: [
            ...s.dividends,
            { ...d, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),

      deleteDividend: (id) =>
        set((s) => ({ dividends: s.dividends.filter((d) => d.id !== id) })),
    }),
    { name: 'finance-investments' }
  )
)
