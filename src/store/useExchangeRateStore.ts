'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STATIC_EXCHANGE_RATES } from '@/lib/exchangeRates'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface ExchangeRateStore {
  rates: Record<string, number>
  updatedAt: string | null
  isLoading: boolean
  error: string | null
  fetchRates: () => Promise<void>
  getRate: (currency: string) => number
  isStale: () => boolean
}

export const useExchangeRateStore = create<ExchangeRateStore>()(
  persist(
    (set, get) => ({
      rates: { ...STATIC_EXCHANGE_RATES },
      updatedAt: null,
      isLoading: false,
      error: null,

      isStale: () => {
        const { updatedAt } = get()
        if (!updatedAt) return true
        return Date.now() - new Date(updatedAt).getTime() > CACHE_TTL_MS
      },

      getRate: (currency: string) => {
        const { rates } = get()
        return rates[currency] ?? STATIC_EXCHANGE_RATES[currency] ?? 1
      },

      fetchRates: async () => {
        if (get().isLoading) return
        set({ isLoading: true, error: null })
        try {
          const res = await fetch('/api/exchange-rates')
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          set({ rates: data.rates, updatedAt: data.updatedAt, isLoading: false })
        } catch (err) {
          // keep existing rates (static fallback stays in place)
          set({
            error: err instanceof Error ? err.message : 'Fetch failed',
            isLoading: false,
          })
        }
      },
    }),
    { name: 'finance-exchange-rates' }
  )
)
