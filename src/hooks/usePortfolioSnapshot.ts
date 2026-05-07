'use client'

import { useEffect } from 'react'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { EXCHANGE_RATES } from '@/lib/exchangeRates'

const STORAGE_KEY = 'finance-last-portfolio-snapshot'

export function usePortfolioSnapshot() {
  const { holdings, takePortfolioSnapshot } = useInvestmentStore()

  useEffect(() => {
    if (holdings.length === 0) return

    const today = new Date().toISOString().slice(0, 10)
    try {
      if (localStorage.getItem(STORAGE_KEY) === today) return
    } catch { return }

    const rate = (cur: string) => EXCHANGE_RATES[cur] ?? 1
    const totalValueTHB = holdings.reduce((s, h) => s + h.units * h.currentPricePerUnit * rate(h.currency ?? 'THB'), 0)
    const totalCostTHB  = holdings.reduce((s, h) => s + h.units * h.avgCostPerUnit  * rate(h.currency ?? 'THB'), 0)

    takePortfolioSnapshot(totalValueTHB, totalCostTHB)
    try { localStorage.setItem(STORAGE_KEY, today) } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
