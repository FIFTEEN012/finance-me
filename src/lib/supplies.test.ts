import { describe, expect, it } from 'vitest'
import {
  addDays,
  averageLifespan,
  dailyUsage,
  daysBetween,
  forecast,
  formatAmount,
  formatDuration,
  guessShape,
  productKey,
  remaining,
  supplyShape,
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

describe('remaining', () => {
  const today = '2026-10-11'

  it('is unknown without history or expected days', () => {
    expect(remaining(item({ startDate: '2026-10-01' }), [], today)).toEqual({ level: null, needsRestock: false })
  })

  it('uses the expected days when the product has no history', () => {
    // 10 of 40 days used
    expect(remaining(item({ startDate: '2026-10-01', expectedDays: 40 }), [], today)).toEqual({ level: 0.75, needsRestock: false })
  })

  it('prefers the real history over the expected days', () => {
    const past = item({ startDate: '2026-09-01', finishedDate: '2026-09-21' }) // lasted 20 days
    const current = item({ startDate: '2026-10-01', expectedDays: 40 })
    expect(remaining(current, [past, current], today)).toEqual({ level: 0.5, needsRestock: false })
  })

  it('needs a restock once the usual lifespan is reached', () => {
    expect(remaining(item({ startDate: '2026-10-01', expectedDays: 10 }), [], today)).toEqual({ level: 0, needsRestock: true })
  })

  it('never drops below empty when used past the lifespan', () => {
    expect(remaining(item({ startDate: '2026-10-01', expectedDays: 4 }), [], today)).toEqual({ level: 0, needsRestock: true })
  })
})

describe('guessShape', () => {
  it('guesses from Thai names', () => {
    expect(guessShape('ยาสีฟัน คอลเกต')).toBe('tube')
    expect(guessShape('กระดาษชำระ')).toBe('roll')
    expect(guessShape('ผงซักฟอก')).toBe('bag')
    expect(guessShape('แชมพู')).toBe('bottle')
    expect(guessShape('นมผง')).toBe('can')
    expect(guessShape('ผงชงเกลือแร่')).toBe('sachet')
    expect(guessShape('ซีเรียล')).toBe('box')
  })

  it('guesses from English names, ignoring case', () => {
    expect(guessShape('Colgate Toothpaste')).toBe('tube')
    expect(guessShape('Sunscreen SPF50')).toBe('tube')
    expect(guessShape('Toilet Paper')).toBe('roll')
    expect(guessShape('Tissue box')).toBe('box')
    expect(guessShape('Rice 5kg')).toBe('bag')
    expect(guessShape('Deodorant spray')).toBe('can')
    expect(guessShape('Face mask sheet')).toBe('sachet')
    expect(guessShape('Shampoo')).toBe('bottle')
  })

  it('matches English keywords as whole words', () => {
    expect(guessShape('Canola oil')).toBe('bottle')
    expect(guessShape('Hand gel')).toBe('tube')
    expect(guessShape('Angel cake')).toBe('bottle')
  })

  it('is the stored shape, or a guess for items saved before shapes existed', () => {
    expect(supplyShape(item({ name: 'ยาสีฟัน', shape: 'box' }))).toBe('box')
    expect(supplyShape(item({ name: 'ยาสีฟัน' }))).toBe('tube')
  })

  it('falls back to a bottle when nothing matches', () => {
    expect(guessShape('ของจิปาถะ')).toBe('bottle')
    expect(guessShape('Widget')).toBe('bottle')
    expect(guessShape('')).toBe('bottle')
  })
})
