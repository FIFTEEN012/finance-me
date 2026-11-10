import { SupplyItem } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

function toUtc(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Whole calendar days from `from` to `to`, both YYYY-MM-DD. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

export function addDays(date: string, days: number): string {
  const d = new Date(toUtc(date) + days * DAY_MS)
  return d.toISOString().slice(0, 10)
}

/** Items with the same name, ignoring case and extra spaces, count as one product. */
export function productKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('th-TH')
}

/** Days an item lasted, or has been in use so far when it is not finished. */
export function usageDays(item: SupplyItem, today: string): number {
  return Math.max(0, daysBetween(item.startDate, item.finishedDate ?? today))
}

/** Average days of the finished items of this product, other than `item` itself. */
export function averageLifespan(item: SupplyItem, items: SupplyItem[]): { averageDays: number; samples: number } | null {
  const key = productKey(item.name)
  const durations = items
    .filter((other) => other.id !== item.id && other.finishedDate && productKey(other.name) === key)
    .map((other) => usageDays(other, other.finishedDate as string))

  if (durations.length === 0) return null
  const total = durations.reduce((sum, d) => sum + d, 0)
  return { averageDays: total / durations.length, samples: durations.length }
}

export interface SupplyForecast {
  elapsedDays: number
  averageDays: number
  samples: number
  expectedEndDate: string
  /** Share of the usual lifespan already used, 0 to 1. */
  progress: number
  /** Days past the usual lifespan, 0 while it is still within it. */
  overdueDays: number
}

export function forecast(item: SupplyItem, items: SupplyItem[], today: string): SupplyForecast | null {
  const history = averageLifespan(item, items)
  if (!history) return null

  const elapsedDays = usageDays(item, today)
  const rounded = Math.max(1, Math.round(history.averageDays))
  return {
    elapsedDays,
    averageDays: history.averageDays,
    samples: history.samples,
    expectedEndDate: addDays(item.startDate, rounded),
    progress: Math.min(1, elapsedDays / rounded),
    overdueDays: Math.max(0, elapsedDays - rounded),
  }
}

/** Cost and amount used per day. A same-day finish counts as one day. */
export function dailyUsage(item: SupplyItem, today: string): { costPerDay?: number; quantityPerDay?: number } {
  const days = Math.max(1, usageDays(item, today))
  return {
    costPerDay: item.price ? item.price / days : undefined,
    quantityPerDay: item.quantity ? item.quantity / days : undefined,
  }
}

function trimNumber(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '')
}

export function formatDuration(days: number): string {
  const whole = Math.round(days)
  if (whole <= 0) return 'ไม่ถึง 1 วัน'
  if (whole < 30) return `${whole} วัน`
  if (whole < 365) return `${whole} วัน (ราว ${trimNumber(whole / 30)} เดือน)`
  return `${whole} วัน (ราว ${trimNumber(whole / 365)} ปี)`
}

export function formatAmount(n: number): string {
  if (n >= 10) return Math.round(n).toLocaleString('th-TH')
  if (n >= 1) return trimNumber(n)
  return n.toFixed(2).replace(/\.?0+$/, '') || '0'
}
