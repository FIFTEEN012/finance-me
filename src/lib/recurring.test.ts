import { describe, expect, it } from 'vitest'
import {
  computeDueTransactions,
  MAX_OCCURRENCES_PER_RUN,
  nextOccurrence,
  occurrenceDate,
  recurringTransactionId,
  resumeCursor,
} from './recurring'
import type { RecurringTransaction } from '@/types'

const RULE_ID = '11111111-1111-4111-8111-111111111111'

function rule(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: RULE_ID,
    categoryId: 'cat-expense-1',
    type: 'EXPENSE',
    amount: 500,
    description: 'ค่าเน็ต',
    frequency: 'monthly',
    startDate: '2026-09-15',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

const NOW = '2026-11-20T01:00:00.000Z'

describe('occurrenceDate', () => {
  it('steps weekly across a month boundary', () => {
    expect(occurrenceDate('2026-10-29', 'weekly', 1)).toBe('2026-11-05')
  })

  it('clamps to the month end without drifting afterwards', () => {
    expect(occurrenceDate('2027-01-31', 'monthly', 1)).toBe('2027-02-28')
    expect(occurrenceDate('2027-01-31', 'monthly', 2)).toBe('2027-03-31')
  })

  it('clamps a leap day in later years', () => {
    expect(occurrenceDate('2028-02-29', 'yearly', 1)).toBe('2029-02-28')
    expect(occurrenceDate('2028-02-29', 'yearly', 4)).toBe('2032-02-29')
  })
})

describe('computeDueTransactions', () => {
  it('catches up on every occurrence missed while the app was closed, on its own date', () => {
    const { transactions, cursors } = computeDueTransactions([rule()], '2026-11-20', new Set(), NOW)

    expect(transactions.map((t) => t.date)).toEqual(['2026-09-15', '2026-10-15', '2026-11-15'])
    expect(cursors).toEqual({ [RULE_ID]: '2026-11-15' })
    expect(transactions[0]).toMatchObject({
      type: 'EXPENSE',
      amount: 500,
      description: 'ค่าเน็ต',
      categoryId: 'cat-expense-1',
      createdAt: NOW,
    })
  })

  it('records an occurrence on its due date but not before', () => {
    expect(computeDueTransactions([rule()], '2026-09-14', new Set(), NOW).transactions).toEqual([])
    expect(computeDueTransactions([rule()], '2026-09-15', new Set(), NOW).transactions).toHaveLength(1)
  })

  it('does nothing on a second run', () => {
    const first = computeDueTransactions([rule()], '2026-11-20', new Set(), NOW)
    const again = computeDueTransactions(
      [rule({ lastGeneratedDate: first.cursors[RULE_ID] })],
      '2026-11-20',
      new Set(first.transactions.map((t) => t.id)),
      NOW,
    )

    expect(again).toEqual({ transactions: [], cursors: {} })
  })

  it('does not bring back a generated transaction the user deleted', () => {
    const { transactions } = computeDueTransactions(
      [rule({ lastGeneratedDate: '2026-11-15' })],
      '2026-11-20',
      new Set(),
      NOW,
    )

    expect(transactions).toEqual([])
  })

  it('uses the same id for the same occurrence so another tab or device cannot duplicate it', () => {
    const a = computeDueTransactions([rule()], '2026-09-15', new Set(), NOW).transactions[0]
    const b = computeDueTransactions([rule()], '2026-09-15', new Set(), '2030-01-01T00:00:00Z').transactions[0]

    expect(a.id).toBe(b.id)
    expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(recurringTransactionId(RULE_ID, '2026-09-15')).toBe(a.id)
    expect(recurringTransactionId(RULE_ID, '2026-10-15')).not.toBe(a.id)
  })

  it('skips an occurrence that already exists but still advances the cursor', () => {
    const existing = new Set([recurringTransactionId(RULE_ID, '2026-09-15')])
    const { transactions, cursors } = computeDueTransactions([rule()], '2026-09-20', existing, NOW)

    expect(transactions).toEqual([])
    expect(cursors).toEqual({ [RULE_ID]: '2026-09-15' })
  })

  it('ignores a paused rule', () => {
    expect(computeDueTransactions([rule({ isActive: false })], '2026-11-20', new Set(), NOW))
      .toEqual({ transactions: [], cursors: {} })
  })

  it('caps one run and continues from the cursor on the next', () => {
    const weekly = rule({ frequency: 'weekly', startDate: '2000-01-01' })
    const first = computeDueTransactions([weekly], '2026-11-20', new Set(), NOW)

    expect(first.transactions).toHaveLength(MAX_OCCURRENCES_PER_RUN)

    const lastDate = first.transactions[first.transactions.length - 1].date
    expect(first.cursors[RULE_ID]).toBe(lastDate)

    const second = computeDueTransactions(
      [{ ...weekly, lastGeneratedDate: lastDate }],
      '2026-11-20',
      new Set(),
      NOW,
    )
    expect(second.transactions[0].date > lastDate).toBe(true)
  })
})

describe('nextOccurrence', () => {
  it('is the start date for a rule that has not run', () => {
    expect(nextOccurrence(rule())).toBe('2026-09-15')
  })

  it('is the first occurrence after the cursor', () => {
    expect(nextOccurrence(rule({ lastGeneratedDate: '2026-10-15' }))).toBe('2026-11-15')
  })
})

describe('resumeCursor', () => {
  it('skips what fell due during the pause but still records today', () => {
    const cursor = resumeCursor(rule({ lastGeneratedDate: '2026-09-15', isActive: false }), '2026-11-15')

    expect(cursor).toBe('2026-11-14')
    const { transactions } = computeDueTransactions(
      [rule({ lastGeneratedDate: cursor })],
      '2026-11-15',
      new Set(),
      NOW,
    )
    expect(transactions.map((t) => t.date)).toEqual(['2026-11-15'])
  })

  it('never moves the cursor backwards', () => {
    expect(resumeCursor(rule({ lastGeneratedDate: '2026-11-15' }), '2026-11-15')).toBe('2026-11-15')
  })
})
