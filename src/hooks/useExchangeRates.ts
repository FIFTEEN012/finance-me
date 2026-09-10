'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ExchangeRates {
  THB: number
  USD: number
  EUR: number
  SGD: number
  JPY: number
  GBP: number
  [key: string]: number
}

const DEFAULT_RATES: ExchangeRates = {
  THB: 1,
  USD: 33.0,
  EUR: 38.5,
  SGD: 26.0,
  JPY: 0.22,
  GBP: 44.5,
}

let memoryRates: ExchangeRates = DEFAULT_RATES
let hasFetched = false

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>(memoryRates)
  const [loading, setLoading] = useState<boolean>(!hasFetched)

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/exchange-rates')
      if (res.ok) {
        const data = await res.json()
        if (data?.rates) {
          memoryRates = { ...DEFAULT_RATES, ...data.rates }
          setRates(memoryRates)
          hasFetched = true
        }
      }
    } catch {
      // Keep using default or cached rates
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasFetched) {
      void fetchRates()
    }
  }, [fetchRates])

  const convertToThb = useCallback(
    (amount: number, fromCurrency: string = 'THB'): number => {
      const cur = fromCurrency.toUpperCase()
      const rate = rates[cur] ?? DEFAULT_RATES[cur] ?? 1
      return amount * rate
    },
    [rates]
  )

  const convertFromThb = useCallback(
    (thbAmount: number, toCurrency: string = 'THB'): number => {
      const cur = toCurrency.toUpperCase()
      const rate = rates[cur] ?? DEFAULT_RATES[cur] ?? 1
      if (rate <= 0) return thbAmount
      return thbAmount / rate
    },
    [rates]
  )

  const convert = useCallback(
    (amount: number, fromCurrency: string, toCurrency: string): number => {
      if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount
      const inThb = convertToThb(amount, fromCurrency)
      return convertFromThb(inThb, toCurrency)
    },
    [convertToThb, convertFromThb]
  )

  return {
    rates,
    loading,
    refetch: fetchRates,
    convertToThb,
    convertFromThb,
    convert,
  }
}
