import { describe, expect, it } from 'vitest'
import { applyInvestmentImport, prepareInvestmentImport, sameHoldingCandidates, type InvestmentImportRow } from './investmentImageImport'
import type { InvestmentHolding } from '@/types'

const holding: InvestmentHolding = {
  id: 'existing',
  name: 'Apple',
  ticker: 'AAPL',
  assetClass: 'stock',
  currency: 'USD',
  units: 5,
  avgCostPerUnit: 100,
  currentPricePerUnit: 120,
  color: '#10b981',
  note: 'เดิม',
  lastPriceUpdate: '2026-01-01',
  createdAt: '2025-01-01',
}

const row = (patch: Partial<InvestmentImportRow> = {}): InvestmentImportRow => ({
  key: 'one',
  included: true,
  targetHoldingId: null,
  name: 'Apple',
  ticker: 'AAPL',
  assetClass: 'stock',
  currency: 'USD',
  units: 8,
  avgCostPerUnit: 105,
  currentPricePerUnit: 130,
  ...patch,
})

describe('investment screenshot review', () => {
  it('matches an existing holding by ticker, asset class and currency', () => {
    expect(sameHoldingCandidates(row(), [holding])).toEqual([holding])
    expect(sameHoldingCandidates(row({ currency: 'THB' }), [holding])).toEqual([])
    expect(sameHoldingCandidates(row({ ticker: 'TSLA' }), [holding])).toEqual([])
  })

  it('requires missing image values and does not guess prices', () => {
    const result = prepareInvestmentImport([row({ targetHoldingId: 'existing', avgCostPerUnit: null })], [holding])
    expect(result.actions).toEqual([])
    expect(result.errors.one).toContain('กรุณาระบุต้นทุนเฉลี่ย')
  })

  it('requires a choice when the existing holding is unresolved', () => {
    const result = prepareInvestmentImport([row()], [holding])
    expect(result.actions).toEqual([])
    expect(result.errors.one[0]).toMatch(/สินทรัพย์เดิม/)
  })

  it('rejects duplicate screenshot rows and saves no partial actions', () => {
    const result = prepareInvestmentImport([
      row({ targetHoldingId: 'existing' }),
      row({ key: 'two', targetHoldingId: 'existing', units: 12 }),
    ], [holding])
    expect(result.actions).toEqual([])
    expect(result.errors.one).toBeDefined()
    expect(result.errors.two).toBeDefined()
  })

  it('updates old holdings and creates other asset classes in one prepared batch', () => {
    const selected = [
      row({ targetHoldingId: 'existing' }),
      row({ key: 'two', name: 'Fund One', ticker: 'FUND1', assetClass: 'mutual_fund', currency: 'THB', units: 10, avgCostPerUnit: 11, currentPricePerUnit: 12 }),
      row({ key: 'three', included: false, name: 'Ignored', ticker: 'IGN' }),
    ]
    const prepared = prepareInvestmentImport(selected, [holding])
    expect(prepared.errors).toEqual({})
    expect(prepared.actions).toHaveLength(2)
    const next = applyInvestmentImport([holding], prepared.actions, '2026-10-27', () => 'created')
    expect(next).toHaveLength(2)
    expect(next[0]).toMatchObject({ id: 'existing', units: 8, avgCostPerUnit: 105, note: 'เดิม', createdAt: '2025-01-01' })
    expect(next[1]).toMatchObject({ id: 'created', assetClass: 'mutual_fund', units: 10 })
    expect(holding.units).toBe(5)
  })

  it('does not change the original holdings when an update target disappeared', () => {
    const actions = prepareInvestmentImport([row({ targetHoldingId: 'existing' })], [holding]).actions
    const existing = [holding]
    expect(() => applyInvestmentImport(existing, actions, 'now', () => 'new')).not.toThrow()
    expect(() => applyInvestmentImport([], actions, 'now', () => 'new')).toThrow(/ไม่พบสินทรัพย์เดิม/)
    expect(existing).toEqual([holding])
  })
})
