// Static fallback rates (foreign currency → THB)
export const STATIC_EXCHANGE_RATES: Record<string, number> = {
  THB: 1,
  USD: 35.5,
  EUR: 38.2,
  JPY: 0.24,
  SGD: 26.3,
  GBP: 44.8,
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  SGD: 'S$',
  GBP: '£',
}

export const CURRENCY_NAMES: Record<string, string> = {
  THB: 'บาท',
  USD: 'ดอลลาร์สหรัฐ',
  EUR: 'ยูโร',
  JPY: 'เยน',
  SGD: 'ดอลลาร์สิงคโปร์',
  GBP: 'ปอนด์อังกฤษ',
}

/** แปลงจากสกุลเงินต่างๆ เป็น THB โดยใช้อัตราจาก store (ถ้ามี) หรือ static fallback */
export function convertToTHB(amount: number, fromCurrency: string): number {
  let rate: number
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useExchangeRateStore } = require('@/store/useExchangeRateStore')
    rate = useExchangeRateStore.getState().getRate(fromCurrency)
  } catch {
    rate = STATIC_EXCHANGE_RATES[fromCurrency] ?? 1
  }
  return Math.round(amount * rate * 100) / 100
}

/** Alias เดิม — deprecated แต่ยังใช้ได้เพื่อ backward compat */
export const EXCHANGE_RATES = STATIC_EXCHANGE_RATES
