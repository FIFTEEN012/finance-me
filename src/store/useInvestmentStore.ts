'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { InvestmentHolding, PortfolioSnapshot, DividendRecord, InvestmentOrder, AssetClass } from '@/types'

interface InvestmentStore {
  holdings: InvestmentHolding[]
  portfolioSnapshots: PortfolioSnapshot[]
  dividends: DividendRecord[]
  orders: InvestmentOrder[]

  addHolding: (h: Omit<InvestmentHolding, 'id' | 'createdAt' | 'lastPriceUpdate'>) => string
  updateHolding: (id: string, h: Partial<Omit<InvestmentHolding, 'id' | 'createdAt'>>) => void
  deleteHolding: (id: string) => void
  updatePrice: (id: string, newPrice: number) => void
  recordBuyOrder: (order: {
    id?: string
    holdingId?: string
    holding?: {
      name: string
      ticker?: string
      assetClass: AssetClass
      color: string
      note?: string
    }
    transactionId: string
    feeTransactionId?: string
    units: number
    pricePerUnit: number
    fee: number
    currency: string
    date: string
    note?: string
  }) => string | null
  deleteInvestmentOrder: (id: string) => void

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
      orders: [],

      addHolding: (h) => {
        const id = crypto.randomUUID()
        set((s) => ({
          holdings: [
            ...s.holdings,
            {
              ...h,
              id,
              createdAt: new Date().toISOString(),
              lastPriceUpdate: new Date().toISOString(),
            },
          ],
        }))
        return id
      },

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
          orders: s.orders.filter((order) => order.holdingId !== id),
        })),

      updatePrice: (id, newPrice) =>
        set((s) => ({
          holdings: s.holdings.map((h) =>
            h.id === id
              ? { ...h, currentPricePerUnit: newPrice, lastPriceUpdate: new Date().toISOString() }
              : h
          ),
        })),

      recordBuyOrder: (input) => {
        if (input.units <= 0 || input.pricePerUnit < 0) return null

        const now = new Date().toISOString()
        const orderId = input.id ?? crypto.randomUUID()
        let resolvedHoldingId = input.holdingId

        set((s) => {
          const existing = resolvedHoldingId
            ? s.holdings.find((holding) => holding.id === resolvedHoldingId)
            : undefined
          const nextHoldings = [...s.holdings]

          if (existing) {
            const previousCost = existing.units * existing.avgCostPerUnit
            const addedCost = input.units * input.pricePerUnit
            const nextUnits = existing.units + input.units
            const nextAvgCost = nextUnits > 0 ? (previousCost + addedCost) / nextUnits : input.pricePerUnit

            resolvedHoldingId = existing.id
            const index = nextHoldings.findIndex((holding) => holding.id === existing.id)
            nextHoldings[index] = {
              ...existing,
              units: nextUnits,
              avgCostPerUnit: nextAvgCost,
              currentPricePerUnit: input.pricePerUnit,
              currency: input.currency,
              lastPriceUpdate: now,
            }
          } else if (input.holding) {
            resolvedHoldingId = crypto.randomUUID()
            nextHoldings.push({
              ...input.holding,
              id: resolvedHoldingId,
              units: input.units,
              currency: input.currency,
              avgCostPerUnit: input.pricePerUnit,
              currentPricePerUnit: input.pricePerUnit,
              createdAt: now,
              lastPriceUpdate: now,
            })
          }

          if (!resolvedHoldingId) return s

          const order: InvestmentOrder = {
            id: orderId,
            holdingId: resolvedHoldingId,
            transactionId: input.transactionId,
            feeTransactionId: input.feeTransactionId,
            type: 'BUY',
            units: input.units,
            pricePerUnit: input.pricePerUnit,
            fee: Math.max(0, input.fee),
            currency: input.currency,
            date: input.date,
            note: input.note,
            createdAt: now,
          }

          return {
            holdings: nextHoldings,
            orders: [...s.orders, order],
          }
        })

        return resolvedHoldingId ?? null
      },

      deleteInvestmentOrder: (id) =>
        set((s) => ({ orders: s.orders.filter((order) => order.id !== id) })),

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
    {
      name: 'finance-investments',
      version: 2,
      migrate: (persistedState) => {
        if (typeof persistedState !== 'object' || persistedState === null) {
          return { holdings: [], portfolioSnapshots: [], dividends: [], orders: [] }
        }

        const state = persistedState as Partial<InvestmentStore>
        return {
          holdings: Array.isArray(state.holdings) ? state.holdings : [],
          portfolioSnapshots: Array.isArray(state.portfolioSnapshots) ? state.portfolioSnapshots : [],
          dividends: Array.isArray(state.dividends) ? state.dividends : [],
          orders: Array.isArray(state.orders) ? state.orders : [],
        }
      },
    }
  )
)
