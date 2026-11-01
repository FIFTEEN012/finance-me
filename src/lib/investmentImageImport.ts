import { z } from 'zod'
import type { AssetClass, InvestmentHolding } from '@/types'

export const investmentAssetClasses = ['stock', 'mutual_fund', 'etf', 'crypto', 'bond', 'other'] as const
export const investmentCurrencies = ['THB', 'USD', 'SGD', 'EUR', 'JPY', 'GBP'] as const
const assetColors: Record<AssetClass, string> = {
  stock: '#10b981',
  mutual_fund: '#6366f1',
  etf: '#f59e0b',
  crypto: '#f97316',
  bond: '#3b82f6',
  other: '#94a3b8',
}

const nullableText = z.string().trim().max(120).nullable()
const nullableAmount = z.number().finite().nonnegative().nullable()

export const imageHoldingSchema = z.object({
  name: nullableText,
  ticker: z.string().trim().max(30).nullable(),
  assetClass: z.enum(investmentAssetClasses).nullable(),
  currency: z.string().trim().max(10).nullable(),
  units: nullableAmount,
  avgCostPerUnit: nullableAmount,
  currentPricePerUnit: nullableAmount,
})

export const imageHoldingsResultSchema = z.object({
  holdings: z.array(imageHoldingSchema).max(50),
})

export type ImageHolding = z.infer<typeof imageHoldingSchema>
export type InvestmentImportRow = ImageHolding & {
  key: string
  included: boolean
  targetHoldingId: string | null
}

export type InvestmentImportAction = {
  targetHoldingId: string | null
  holding: {
    name: string
    ticker?: string
    assetClass: AssetClass
    currency: string
    units: number
    avgCostPerUnit: number
    currentPricePerUnit: number
  }
}

const normalized = (value: string | null | undefined) => (value ?? '').trim().toLocaleUpperCase()

export function sameHoldingCandidates(
  row: Pick<ImageHolding, 'name' | 'ticker' | 'assetClass' | 'currency'>,
  holdings: InvestmentHolding[]
) {
  if (!row.assetClass || !row.currency) return []
  const ticker = normalized(row.ticker)
  const name = normalized(row.name)
  return holdings.filter((holding) => {
    if (holding.assetClass !== row.assetClass || normalized(holding.currency) !== normalized(row.currency)) return false
    if (ticker) return normalized(holding.ticker) === ticker
    return !!name && normalized(holding.name) === name
  })
}

export function importIdentity(row: Pick<ImageHolding, 'name' | 'ticker' | 'assetClass' | 'currency'>) {
  const label = normalized(row.ticker) || normalized(row.name)
  return label && row.assetClass && row.currency
    ? [row.assetClass, normalized(row.currency), label].join(':')
    : null
}

export function prepareInvestmentImport(
  rows: InvestmentImportRow[],
  holdings: InvestmentHolding[]
): { actions: InvestmentImportAction[]; errors: Record<string, string[]> } {
  const selected = rows.filter((row) => row.included)
  const errors: Record<string, string[]> = {}
  const actions: InvestmentImportAction[] = []
  const identities = new Map<string, string>()
  const targetIds = new Map<string, string>()

  if (selected.length === 0) return { actions, errors: { _form: ['กรุณาเลือกอย่างน้อย 1 รายการ'] } }
  if (selected.length > 50) return { actions, errors: { _form: ['นำเข้าได้สูงสุด 50 รายการต่อครั้ง'] } }

  for (const row of selected) {
    const issues: string[] = []
    const name = row.name?.trim() ?? ''
    const ticker = row.ticker?.trim() ?? ''
    const currency = row.currency?.trim().toUpperCase() ?? ''
    if (!name) issues.push('กรุณาระบุชื่อสินทรัพย์')
    if (!row.assetClass || !investmentAssetClasses.includes(row.assetClass)) issues.push('กรุณาเลือกประเภทสินทรัพย์')
    if (!investmentCurrencies.some((item) => item === currency)) issues.push('กรุณาเลือกสกุลเงินที่รองรับ')
    if (row.units === null || !Number.isFinite(row.units) || row.units <= 0) issues.push('จำนวนหน่วยต้องมากกว่า 0')
    if (row.avgCostPerUnit === null || !Number.isFinite(row.avgCostPerUnit) || row.avgCostPerUnit < 0) issues.push('กรุณาระบุต้นทุนเฉลี่ย')
    if (row.currentPricePerUnit === null || !Number.isFinite(row.currentPricePerUnit) || row.currentPricePerUnit < 0) issues.push('กรุณาระบุราคาปัจจุบัน')

    const identity = importIdentity(row)
    if (identity) {
      const previous = identities.get(identity)
      if (previous) {
        issues.push('มีสินทรัพย์ซ้ำในภาพ กรุณาข้ามหนึ่งรายการหรือแก้ข้อมูล')
        errors[previous] = [...(errors[previous] ?? []), 'มีสินทรัพย์ซ้ำในภาพ กรุณาข้ามหนึ่งรายการหรือแก้ข้อมูล']
      } else identities.set(identity, row.key)
    }

    const candidates = sameHoldingCandidates(row, holdings)
    const target = row.targetHoldingId ? holdings.find((item) => item.id === row.targetHoldingId) : null
    if (row.targetHoldingId && (!target || !candidates.some((item) => item.id === target.id))) {
      issues.push('หุ้นเดิมที่เลือกไม่ตรงกับประเภท สกุลเงิน หรือชื่อหลักทรัพย์')
    }
    if (!row.targetHoldingId && candidates.length > 0) {
      issues.push('พบสินทรัพย์เดิม กรุณาเลือกอัปเดตหรือแก้ข้อมูลก่อนบันทึก')
    }
    if (row.targetHoldingId) {
      const previous = targetIds.get(row.targetHoldingId)
      if (previous) {
        issues.push('มีหลายแถวจะอัปเดตสินทรัพย์เดียวกัน')
        errors[previous] = [...(errors[previous] ?? []), 'มีหลายแถวจะอัปเดตสินทรัพย์เดียวกัน']
      } else targetIds.set(row.targetHoldingId, row.key)
    }

    if (issues.length) {
      errors[row.key] = [...(errors[row.key] ?? []), ...issues]
      continue
    }

    actions.push({
      targetHoldingId: row.targetHoldingId,
      holding: {
        name,
        ticker: ticker || undefined,
        assetClass: row.assetClass as AssetClass,
        currency,
        units: row.units as number,
        avgCostPerUnit: row.avgCostPerUnit as number,
        currentPricePerUnit: row.currentPricePerUnit as number,
      },
    })
  }

  return { actions: Object.keys(errors).length ? [] : actions, errors }
}

export function applyInvestmentImport(
  holdings: InvestmentHolding[],
  actions: InvestmentImportAction[],
  now: string,
  createId: () => string
): InvestmentHolding[] {
  const next = [...holdings]
  for (const action of actions) {
    if (action.targetHoldingId) {
      const index = next.findIndex((item) => item.id === action.targetHoldingId)
      if (index < 0) throw new Error('ไม่พบสินทรัพย์เดิม กรุณาตรวจสอบรายการอีกครั้ง')
      const existing = next[index]
      next[index] = {
        ...existing,
        ...action.holding,
        ticker: action.holding.ticker ?? existing.ticker,
        color: existing.color,
        lastPriceUpdate: now,
      }
    } else {
      next.push({
        ...action.holding,
        color: assetColors[action.holding.assetClass],
        id: createId(),
        createdAt: now,
        lastPriceUpdate: now,
      })
    }
  }
  return next
}
