'use client'

import { useEffect } from 'react'
import { useNetWorthStore } from '@/store/useNetWorthStore'

const STORAGE_KEY = 'finance-last-monthly-snapshot'

/**
 * Takes a net worth snapshot once per calendar month.
 * Stores the last snapshot month in localStorage to avoid duplicates.
 */
export function useMonthlySnapshot(portfolioValue = 0) {
  const { takeSnapshot, items } = useNetWorthStore()

  useEffect(() => {
    if (items.length === 0 && portfolioValue === 0) return

    const today = new Date()
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

    try {
      const lastMonth = localStorage.getItem(STORAGE_KEY)
      if (lastMonth === thisMonth) return  // already snapshotted this month

      takeSnapshot(portfolioValue)
      localStorage.setItem(STORAGE_KEY, thisMonth)
    } catch {
      // localStorage unavailable, skip
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // run once on mount
}
