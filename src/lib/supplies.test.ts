import { describe, expect, it } from 'vitest'
import {
  addDays,
  averageLifespan,
  dailyUsage,
  daysBetween,
  forecast,
  formatAmount,
  formatDuration,
  productKey,
  usageDays,
} from './supplies'
import type { SupplyItem } from '@/types'

let seq = 0
function item(overrides: Partial<SupplyItem> = {}): SupplyItem {
  seq++
  return {
    id: `item-${seq}`,
    name: 'ครีมกันแดด',
    startDate: '2026-10-01',
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  }
}

describe('daysBetween / addDays', () => {
  it('counts calendar days across a month boundary', () => {
    expect(daysBetween('2026-10-25', '2026-11-04')).toBe(10)
  })

  it('counts a leap day', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
  })

  it('is zero for the same day', () => {
    expect(daysBetween('2026-11-04', '2026-11-04')).toBe(0)
  })

  it('adds days across a year boundary', () => {
    expect(addDays('2026-12-25', 10)).toBe('2027-01-04')
  })
})

describe('productKey', () => {
  it('ignores case and extra spaces', () => {
    expect(productKey('  Nivea   Sun ')).toBe(productKey('nivea sun'))
  })
})

describe('usageDays', () => {
  it('counts up to today while in use', () => {
    expect(usageDays(item({ startDate: '2026-10-01' }), '2026-11-04')).toBe(34)
  })

  it('stops at the finished date', () => {
    expect(usageDays(item({ startDate: '2026-10-01', finishedDate: '2026-10-21' }), '2026-11-04')).toBe(20)
  })
})

describe('averageLifespan', () => {
  it('averages finished items of the same product and skips the item itself', () => {
    const current = item({ startDate: '2026-11-01' })
    const items = [
      current,
      item({ name: 'ครีมกันแดด ', startDate: '2026-08-01', finishedDate: '2026-08-31' }), // 30
      item({ startDate: '2026-09-01', finishedDate: '2026-10-11' }), // 40
      item({ name: 'ยาสีฟัน', startDate: '2026-09-01', finishedDate: '2026-09-11' }),
      item({ startDate: '2026-10-15' }), // another one still in use
    ]
    expect(averageLifespan(current, items)).toEqual({ averageDays: 35, samples: 2 })
  })

  it('is null without finished history', () => {
    const current = item()
    expect(averageLifespan(current, [current, item()])).toBeNull()
  })
})

describe('forecast', () => {
  const history = item({ startDate: '2026-08-01', finishedDate: '2026-08-31' }) // 30 days

  it('predicts the end date from the usual lifespan', () => {
    const current = item({ startDate: '2026-11-01' })
    const plan = forecast(current, [current, history], '2026-11-16')
    expect(plan).toMatchObject({
      elapsedDays: 15,
      expectedEndDate: '2026-12-01',
      progress: 0.5,
      overdueDays: 0,
    })
  })

  it('reports days past the usual lifespan', () => {
    const current = item({ startDate: '2026-10-01' })
    const plan = forecast(current, [current, history], '2026-11-04')
    expect(plan?.progress).toBe(1)
    expect(plan?.overdueDays).toBe(4)
  })

  it('is null for a product never finished before', () => {
    const current = item()
    expect(forecast(current, [current], '2026-11-04')).toBeNull()
  })
})

describe('dailyUsage', () => {
  it('divides price and quantity by the days used', () => {
    const used = item({ startDate: '2026-10-01', finishedDate: '2026-10-21', price: 300, quantity: 200 })
    expect(dailyUsage(used, '2026-11-04')).toEqual({ costPerDay: 15, quantityPerDay: 10 })
  })

  it('treats a same-day finish as one day', () => {
    const used = item({ startDate: '2026-10-01', finishedDate: '2026-10-01', price: 40 })
    expect(dailyUsage(used, '2026-11-04').costPerDay).toBe(40)
  })

  it('leaves out what was not recorded', () => {
    expect(dailyUsage(item({ finishedDate: '2026-10-11' }), '2026-11-04')).toEqual({
      costPerDay: undefined,
      quantityPerDay: undefined,
    })
  })
})

describe('formatDuration', () => {
  it('formats short, monthly and yearly spans', () => {
    expect(formatDuration(0)).toBe('ไม่ถึง 1 วัน')
    expect(formatDuration(12)).toBe('12 วัน')
    expect(formatDuration(45)).toBe('45 วัน (ราว 1.5 เดือน)')
    expect(formatDuration(60)).toBe('60 วัน (ราว 2 เดือน)')
    expect(formatDuration(400)).toBe('400 วัน (ราว 1.1 ปี)')
  })
})

describe('formatAmount', () => {
  it('keeps small amounts readable', () => {
    expect(formatAmount(1234.6)).toBe('1,235')
    expect(formatAmount(4.44)).toBe('4.4')
    expect(formatAmount(0.25)).toBe('0.25')
    expect(formatAmount(0.5)).toBe('0.5')
  })
})
