import { describe, expect, it } from 'vitest'
import { debtToDatabasePayload, normalizeDebt } from './debtRecord'

const remote = {
  id: 'debt-1', person: 'สมชาย', type: 'I_OWE',
  originalAmount: '5000.00', remainingAmount: '5000.00',
  payments: [], status: 'ACTIVE', createdAt: new Date('2026-09-01T12:00:00Z'),
  updatedAt: new Date('2026-09-01T12:00:00Z'),
}

describe('debt record sync', () => {
  it('maps database fields to the card model without NaN or an invalid date', () => {
    const debt = normalizeDebt(remote)
    expect(debt.personName).toBe('สมชาย')
    expect(debt.totalAmount).toBe(5000)
    expect(debt.paidAmount).toBe(0)
    expect(debt.startDate).toBe('2026-09-01')
    expect(debt.color).toBeTruthy()
  })

  it('recovers newer local repayments and preserves their exact start date', () => {
    const payment = { id: 'payment-1', debtId: 'debt-1', amount: 800, date: '2026-09-10', createdAt: '2026-09-10T12:00:00Z' }
    const debt = normalizeDebt(remote, {
      startDate: '2026-08-30', category: 'person', color: '#123456',
      payments: [payment], updatedAt: '2026-09-10T12:00:00Z',
    })
    expect(debt.paidAmount).toBe(800)
    expect(debt.payments).toEqual([payment])
    expect(debt.startDate).toBe('2026-08-30')
    expect(debtToDatabasePayload(debt).remainingAmount).toBe(4200)
  })

  it('uses server repayment state when it is newer', () => {
    const debt = normalizeDebt({ ...remote, remainingAmount: '0', status: 'SETTLED', updatedAt: new Date('2026-09-12T12:00:00Z') }, {
      payments: [{ id: 'old', amount: 800 }], updatedAt: '2026-09-10T12:00:00Z',
    })
    expect(debt.paidAmount).toBe(5000)
    expect(debt.isSettled).toBe(true)
  })

  it('does not propagate malformed legacy numbers or dates', () => {
    const debt = normalizeDebt({ ...remote, originalAmount: 'NaN', remainingAmount: 'NaN', startDate: 'bad', payments: [{ amount: null }] })
    expect(Number.isFinite(debt.totalAmount)).toBe(true)
    expect(Number.isFinite(debt.paidAmount)).toBe(true)
    expect(Number.isNaN(new Date(debt.startDate).getTime())).toBe(false)
  })
})
