'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { InvestmentBuyDialog } from '@/components/investments/InvestmentBuyDialog'
import { InvestmentForm, ASSET_CLASS_META, CURRENCY_SYMBOLS } from '@/components/investments/InvestmentForm'
import { InvestmentMissionBoard, type GrowthProgressModel, type MissionSectionItem, type SummaryStatItem } from '@/components/investments/InvestmentMissionBoard'
import { UpdatePriceDialog } from '@/components/investments/UpdatePriceDialog'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { AssetClass, InvestmentHolding } from '@/types'
import { useExchangeRates } from '@/hooks/useExchangeRates'

// Map a holding's ticker + currency + assetClass to a Yahoo Finance symbol
function getYahooSymbol(h: InvestmentHolding): string | null {
  if (!h.ticker) return null
  const { ticker, currency, assetClass } = h
  if (assetClass === 'crypto') return `${ticker}-USD`
  const cur = currency ?? 'THB'
  if (cur === 'THB') return `${ticker}.BK`
  if (cur === 'USD') return ticker
  if (cur === 'SGD') return `${ticker}.SI`
  if (cur === 'JPY') return `${ticker}.T`
  if (cur === 'GBP') return `${ticker}.L`
  if (cur === 'EUR') return `${ticker}.DE`
  return ticker
}

export default function InvestmentsPage() {
  const { holdings, deleteHolding, updatePrice } = useInvestmentStore()
  const { convertToThb, convert } = useExchangeRates()
  const [displayCurrency, setDisplayCurrency] = useState<'THB' | 'USD'>('THB')

  const [formOpen, setFormOpen] = useState(false)
  const [buyOpen, setBuyOpen] = useState(false)
  const [editingHolding, setEditingHolding] = useState<InvestmentHolding | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingHolding, setUpdatingHolding] = useState<InvestmentHolding | null>(null)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const [isSyncingAll, setIsSyncingAll] = useState(false)

  const syncableHoldings = holdings.filter((h) => getYahooSymbol(h) !== null)

  // Fetch price for a single holding from Yahoo Finance via API route
  async function fetchPrice(h: InvestmentHolding): Promise<boolean> {
    const symbol = getYahooSymbol(h)
    if (!symbol) return false

    setSyncingIds((prev) => new Set(prev).add(h.id))
    try {
      const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(symbol)}`)
      const data = await res.json()
      if (!res.ok || !data.price) {
        toast.error(`ดึงราคา ${h.ticker} ไม่สำเร็จ`)
        return false
      }
      updatePrice(h.id, data.price as number)
      return true
    } catch {
      toast.error(`ดึงราคา ${h.ticker} ไม่สำเร็จ`)
      return false
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev)
        next.delete(h.id)
        return next
      })
    }
  }

  async function syncAllPrices() {
    if (syncableHoldings.length === 0) return
    setIsSyncingAll(true)
    const results = await Promise.allSettled(syncableHoldings.map(fetchPrice))
    const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value).length
    const failed = syncableHoldings.length - succeeded
    if (succeeded > 0 && failed === 0) {
      toast.success(`อัปเดตราคาสำเร็จ ${succeeded} หลักทรัพย์`)
    } else if (succeeded > 0) {
      toast.success(`อัปเดตสำเร็จ ${succeeded} / ล้มเหลว ${failed} หลักทรัพย์`)
    } else {
      toast.error('ดึงราคาไม่สำเร็จ ลองใหม่อีกครั้ง')
    }
    setIsSyncingAll(false)
  }

  // Compute totals with currency conversion
  const { totalCost, totalValue, totalGainLoss, totalReturn, allocationData, groupedHoldings } = useMemo(() => {
    const getConverted = (h: InvestmentHolding, isCost = false) => {
      const cur = h.currency ?? 'THB'
      const raw = h.units * (isCost ? h.avgCostPerUnit : h.currentPricePerUnit)
      if (displayCurrency === 'THB') {
        return convertToThb(raw, cur)
      } else {
        return convert(raw, cur, 'USD')
      }
    }

    const totalCost = holdings.reduce((s, h) => s + getConverted(h, true), 0)
    const totalValue = holdings.reduce((s, h) => s + getConverted(h, false), 0)
    const totalGainLoss = totalValue - totalCost
    const totalReturn = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    const classMap = new Map<string, number>()
    holdings.forEach((h) => {
      const val = getConverted(h, false)
      classMap.set(h.assetClass, (classMap.get(h.assetClass) ?? 0) + val)
    })
    const allocationData = Array.from(classMap.entries()).map(([cls, value]) => ({
      name: ASSET_CLASS_META[cls as keyof typeof ASSET_CLASS_META]?.label ?? cls,
      value,
      color: ASSET_CLASS_META[cls as keyof typeof ASSET_CLASS_META]?.color ?? '#94a3b8',
    }))

    const grouped = new Map<string, InvestmentHolding[]>()
    holdings.forEach((h) => {
      const arr = grouped.get(h.assetClass) ?? []
      arr.push(h)
      grouped.set(h.assetClass, arr)
    })

    return { totalCost, totalValue, totalGainLoss, totalReturn, allocationData, groupedHoldings: grouped }
  }, [holdings, displayCurrency, convertToThb, convert])

  const currencySymbol = displayCurrency === 'THB' ? '฿' : '$'
  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const formatSignedCurrency = (n: number) => `${n >= 0 ? '+' : '-'}${currencySymbol}${fmt(Math.abs(n))}`
  const formatSignedPercent = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
  const isPositive = totalGainLoss >= 0

  function handleDelete() {
    if (!deletingId) return
    deleteHolding(deletingId)
    toast.success('ลบหลักทรัพย์สำเร็จ')
    setDeletingId(null)
  }

  function fmtTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) +
      ' ' + d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }

  const growth: GrowthProgressModel = useMemo(() => {
    const levelStep = displayCurrency === 'THB' ? 30_000 : 1_000
    const levelBase = Math.floor(totalValue / levelStep) * levelStep
    const nextThreshold = levelBase + levelStep
    const progressPercent = totalValue > 0 ? ((totalValue - levelBase) / levelStep) * 100 : 0

    return {
      level: Math.floor(totalValue / levelStep) + 1,
      progressPercent,
      remainingLabel: `${currencySymbol}${fmt(Math.max(0, nextThreshold - totalValue))}`,
    }
  }, [totalValue, displayCurrency, currencySymbol])

  const summaryCards: SummaryStatItem[] = useMemo(() => [
    { accent: 'orange', label: 'ต้นทุนทั้งหมด', value: `${currencySymbol}${fmt(totalCost)}` },
    { accent: 'blue', label: 'มูลค่าปัจจุบัน', value: `${currencySymbol}${fmt(totalValue)}` },
    { accent: 'green', label: 'กำไร/ขาดทุน', value: formatSignedCurrency(totalGainLoss) },
  ], [totalCost, totalValue, totalGainLoss, currencySymbol])

  const missionSections: MissionSectionItem[] = (Object.keys(ASSET_CLASS_META) as AssetClass[])
    .filter((assetClass) => groupedHoldings.has(assetClass))
    .map((assetClass, index) => {
      const items = groupedHoldings.get(assetClass) ?? []
      const classValue = items.reduce((sum, holding) => {
        const cur = holding.currency ?? 'THB'
        const raw = holding.units * holding.currentPricePerUnit
        return sum + (displayCurrency === 'THB' ? convertToThb(raw, cur) : convert(raw, cur, 'USD'))
      }, 0)

      return {
        assetClass,
        stage: index + 1,
        totalValueLabel: `${currencySymbol}${fmt(classValue)}`,
        holdings: items.map((holding) => {
          const currency = holding.currency ?? 'THB'
          const symbol = CURRENCY_SYMBOLS[currency] ?? currency
          const valueNative = holding.units * holding.currentPricePerUnit
          const costNative = holding.units * holding.avgCostPerUnit
          const gainLoss = valueNative - costNative
          const returnPct = costNative > 0 ? (gainLoss / costNative) * 100 : 0
          const isSyncing = syncingIds.has(holding.id)
          const canSync = getYahooSymbol(holding) !== null

          const isForeign = currency !== 'THB'
          const convertedThbValue = isForeign ? convertToThb(valueNative, currency) : null

          return {
            canSync,
            currentValueLabel: `${symbol}${fmt(valueNative)}`,
            currentValueNativeLabel: convertedThbValue ? `≈ ฿${fmt(convertedThbValue)}` : undefined,
            gainLossLabel: `${gainLoss >= 0 ? '+' : '-'}${symbol}${fmt(Math.abs(gainLoss))}`,
            id: holding.id,
            isPositive: gainLoss >= 0,
            isSyncing,
            lastUpdatedLabel: fmtTime(holding.lastPriceUpdate),
            name: holding.name,
            onDelete: () => setDeletingId(holding.id),
            onEdit: () => {
              setEditingHolding(holding)
              setFormOpen(true)
            },
            onManualUpdate: () => setUpdatingHolding(holding),
            onSync: () => {
              if (canSync) {
                void fetchPrice(holding)
                return
              }

              setUpdatingHolding(holding)
            },
            priceLabel: `${symbol}${fmt(holding.currentPricePerUnit)}`,
            returnLabel: formatSignedPercent(returnPct),
            ticker: holding.ticker,
            unitsLabel: `${holding.units.toLocaleString('th-TH')} หน่วย`,
          }
        }),
      }
    })

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 pb-28 font-quest-body md:px-10 md:py-10 lg:pb-10">
      <InvestmentMissionBoard
        allocationData={allocationData}
        canSyncAll={syncableHoldings.length > 0}
        growth={growth}
        holdingsCount={holdings.length}
        isPositive={isPositive}
        onAddHolding={() => {
          setEditingHolding(null)
          setFormOpen(true)
        }}
        onBuyInvestment={() => setBuyOpen(true)}
        onSyncAll={() => {
          void syncAllPrices()
        }}
        sections={missionSections}
        summaryCards={summaryCards}
        syncingAll={isSyncingAll}
        totalGainLossLabel={formatSignedCurrency(totalGainLoss)}
        totalReturnLabel={formatSignedPercent(totalReturn)}
        totalValueLabel={`${currencySymbol}${fmt(totalValue)}`}
        displayCurrency={displayCurrency}
        onCurrencyChange={setDisplayCurrency}
      />

      <InvestmentForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingHolding(null) }}
        editingHolding={editingHolding}
      />

      <InvestmentBuyDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        holdings={holdings}
      />

      <UpdatePriceDialog
        open={!!updatingHolding}
        onOpenChange={(o) => { if (!o) setUpdatingHolding(null) }}
        holding={updatingHolding}
      />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="ลบหลักทรัพย์"
        description="ต้องการลบหลักทรัพย์นี้ใช่หรือไม่?"
        onConfirm={handleDelete}
      />
    </div>
  )
}
