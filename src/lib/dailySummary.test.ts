import { describe, expect, it } from 'vitest'
import { summarizeByDay } from './dailySummary'
import type { Transaction } from '@/types'

function tx(type: Transaction['type'], amount: number, date: string): Transaction {
  return {
    id: `${type}-${amount}-${date}`,
    categoryId: 'c',
    type,
    amount,
    description: 'x',
    date,
    createdAt: '2026-11-01T00:00:00Z',
  }
}

describe('summarizeByDay', () => {
  it('reports income, expense and remaining for each day separately', () => {
    const summary = summarizeByDay([
      tx('INCOME', 1000, '2026-11-04'),
      tx('EXPENSE', 50, '2026-11-04'),
      tx('EXPENSE', 25.5, '2026-11-04'),
      tx('EXPENSE', 100, '2026-11-03'),
    ])

    expect(summary.get('2026-11-04')).toEqual({ income: 1000, expense: 75.5, remaining: 924.5 })
    expect(summary.get('2026-11-03')).toEqual({ income: 0, expense: 100, remaining: -100 })
  })

  it('leaves transfers out of the totals', () => {
    const summary = summarizeByDay([tx('TRANSFER', 500, '2026-11-04')])

    expect(summary.get('2026-11-04')).toEqual({ income: 0, expense: 0, remaining: 0 })
  })

  it('does not accumulate floating point noise', () => {
    const summary = summarizeByDay([tx('EXPENSE', 0.1, '2026-11-04'), tx('EXPENSE', 0.2, '2026-11-04')])

    expect(summary.get('2026-11-04')).toEqual({ income: 0, expense: 0.3, remaining: -0.3 })
  })
})
