import { describe, expect, it } from 'vitest'
import {
  averageOfLogged,
  formatMl,
  kcalByMeal,
  kcalOn,
  lastKcalFor,
  macrosOn,
  mealForHour,
  progress,
  recentDays,
  recentFoodNames,
  waterBottle,
  waterOn,
} from './nutrition'
import type { FoodEntry, WaterEntry } from '@/types'

let seq = 0
function food(overrides: Partial<FoodEntry> = {}): FoodEntry {
  seq++
  return {
    id: `f-${seq}`,
    date: '2026-11-19',
    meal: 'lunch',
    name: 'ข้าวมันไก่',
    kcal: 600,
    createdAt: `2026-11-19T05:00:${String(seq).padStart(2, '0')}Z`,
    ...overrides,
  }
}

function water(date: string, ml: number): WaterEntry {
  seq++
  return { id: `w-${seq}`, date, ml, createdAt: `${date}T03:00:00Z` }
}

describe('mealForHour', () => {
  it('picks the meal by time of day', () => {
    expect(mealForHour(7)).toBe('breakfast')
    expect(mealForHour(12)).toBe('lunch')
    expect(mealForHour(16)).toBe('snack')
    expect(mealForHour(19)).toBe('dinner')
    expect(mealForHour(23)).toBe('snack')
    expect(mealForHour(2)).toBe('snack')
  })
})

describe('daily totals', () => {
  const entries = [
    food({ kcal: 600 }),
    food({ meal: 'breakfast', kcal: 350 }),
    food({ meal: 'lunch', kcal: 150 }),
    food({ date: '2026-11-18', kcal: 999 }),
  ]

  it('sums calories for one day only', () => {
    expect(kcalOn(entries, '2026-11-19')).toBe(1100)
  })

  it('splits calories by meal', () => {
    expect(kcalByMeal(entries, '2026-11-19')).toEqual({ breakfast: 350, lunch: 750, dinner: 0, snack: 0 })
  })

  it('sums water for one day only', () => {
    expect(waterOn([water('2026-11-19', 250), water('2026-11-19', 500), water('2026-11-18', 1000)], '2026-11-19')).toBe(750)
  })
})

describe('progress', () => {
  it('caps at 1 and handles a zero goal', () => {
    expect(progress(500, 2000)).toBe(0.25)
    expect(progress(2500, 2000)).toBe(1)
    expect(progress(100, 0)).toBe(0)
  })
})

describe('recentDays', () => {
  it('lists the last 7 days oldest first, across a month boundary', () => {
    const days = recentDays([food({ date: '2026-11-01', kcal: 400 })], [water('2026-10-30', 300)], '2026-11-02')
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02',
    ])
    expect(days[5].kcal).toBe(400)
    expect(days[3].water).toBe(300)
  })
})

describe('averageOfLogged', () => {
  it('ignores days with nothing logged', () => {
    expect(averageOfLogged([0, 1800, 0, 2200])).toBe(2000)
    expect(averageOfLogged([0, 0])).toBeNull()
  })
})

describe('food history', () => {
  const entries = [
    food({ name: 'กาแฟเย็น', kcal: 180, createdAt: '2026-11-17T01:00:00Z' }),
    food({ name: 'กาแฟเย็น ', kcal: 220, createdAt: '2026-11-18T01:00:00Z' }),
    food({ name: 'ข้าวผัด', kcal: 650, createdAt: '2026-11-16T01:00:00Z' }),
  ]

  it('prefills the latest calories for a known food, ignoring case and spaces', () => {
    expect(lastKcalFor(entries, 'กาแฟเย็น')).toBe(220)
    expect(lastKcalFor(entries, 'ส้มตำ')).toBeUndefined()
    expect(lastKcalFor(entries, '  ')).toBeUndefined()
  })

  it('lists distinct names, newest first', () => {
    expect(recentFoodNames(entries)).toEqual(['กาแฟเย็น ', 'ข้าวผัด'])
  })
})

describe('formatMl', () => {
  it('switches to litres from 1,000 ml', () => {
    expect(formatMl(750)).toBe('750 มล.')
    expect(formatMl(1500)).toBe('1.5 ลิตร')
  })
})

describe('macrosOn', () => {
  it('sums protein, carbs and fat of the day, skipping blank fields and other days', () => {
    const entries = [
      food({ proteinG: 30, carbsG: 80, fatG: 20 }),
      food({ proteinG: 12.5 }),
      food({ carbsG: 40, fatG: undefined }),
      food({}),
      food({ date: '2026-11-18', proteinG: 99, carbsG: 99, fatG: 99 }),
    ]
    expect(macrosOn(entries, '2026-11-19')).toEqual({ proteinG: 42.5, carbsG: 120, fatG: 20, entriesWithMacros: 3 })
  })

  it('reports nothing logged for a day of entries saved before macros existed', () => {
    expect(macrosOn([food(), food()], '2026-11-19')).toEqual({ proteinG: 0, carbsG: 0, fatG: 0, entriesWithMacros: 0 })
  })
})

describe('waterBottle', () => {
  it('is full before anything is drunk', () => {
    expect(waterBottle(0, 2500)).toEqual({ level: 1, over: 0 })
  })

  it('drains as you drink', () => {
    expect(waterBottle(1000, 2500)).toEqual({ level: 0.6, over: 0 })
  })

  it('is empty once the target is reached', () => {
    expect(waterBottle(2500, 2500)).toEqual({ level: 0, over: 0 })
  })

  it('stays empty and reports the extra when drinking past the target', () => {
    expect(waterBottle(2800, 2500)).toEqual({ level: 0, over: 300 })
  })

  it('does not break when the target is 0', () => {
    expect(waterBottle(0, 0)).toEqual({ level: 0, over: 0 })
    expect(waterBottle(250, 0)).toEqual({ level: 0, over: 250 })
  })
})
