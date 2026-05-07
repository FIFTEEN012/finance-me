'use client'

import { useState, useMemo } from 'react'
import { Plus, TrendingUp, TrendingDown, Pencil, Trash2, RefreshCw, CloudDownload } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { InvestmentForm, ASSET_CLASS_META } from '@/components/investments/InvestmentForm'
import { UpdatePriceDialog } from '@/components/investments/UpdatePriceDialog'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { InvestmentHolding } from '@/types'
import { cn } from '@/lib/utils'
import { EXCHANGE_RATES, CURRENCY_SYMBOLS } from '@/lib/exchangeRates'
import { PressCard } from '@/components/ui/PressCard'

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
  const [formOpen, setFormOpen] = useState(false)
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
      // For crypto: Yahoo returns USD price; convert if holding currency is THB
      let price = data.price as number
      if (h.assetClass === 'crypto' && (h.currency ?? 'THB') === 'THB') {
        price = price * (EXCHANGE_RATES['USD'] ?? 35.5)
      }
      updatePrice(h.id, price)
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

  // Compute totals (all in THB)
  const { totalCost, totalValue, totalGainLoss, totalReturn, allocationData, groupedHoldings } = useMemo(() => {
    const rate = (cur: string) => EXCHANGE_RATES[cur] ?? 1
    const totalCost = holdings.reduce((s, h) => s + h.units * h.avgCostPerUnit * rate(h.currency ?? 'THB'), 0)
    const totalValue = holdings.reduce((s, h) => s + h.units * h.currentPricePerUnit * rate(h.currency ?? 'THB'), 0)
    const totalGainLoss = totalValue - totalCost
    const totalReturn = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    const classMap = new Map<string, number>()
    holdings.forEach((h) => {
      const val = h.units * h.currentPricePerUnit * rate(h.currency ?? 'THB')
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
  }, [holdings])

  const toTHB = (amount: number, currency: string) => amount * (EXCHANGE_RATES[currency] ?? 1)
  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">พอร์ตการลงทุน</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{holdings.length} หลักทรัพย์</p>
        </div>
        <div className="flex items-center gap-2">
          {syncableHoldings.length > 0 && (
            <Button
              variant="outline"
              onClick={syncAllPrices}
              disabled={isSyncingAll}
              className="gap-1.5 text-sm"
            >
              <CloudDownload className={cn('w-4 h-4', isSyncingAll && 'animate-pulse')} />
              {isSyncingAll ? 'กำลังดึง...' : 'ดึงราคาล่าสุด'}
            </Button>
          )}
          <Button onClick={() => { setEditingHolding(null); setFormOpen(true) }} className="bg-primary hover:bg-primary/90 gap-1.5">
            <Plus className="w-4 h-4" />
            เพิ่มหลักทรัพย์
          </Button>
        </div>
      </div>

      {holdings.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="ยังไม่มีหลักทรัพย์"
          description="เพิ่มหุ้น กองทุน หรือ crypto เพื่อติดตาม portfolio ของคุณ"
          action={
            <Button onClick={() => setFormOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" /> เพิ่มหลักทรัพย์แรก
            </Button>
          }
        />
      ) : (
        <>
          {/* Portfolio summary card */}
          <PressCard
            shadow={isPositive ? '0 5px 0 0 #065f46' : '0 5px 0 0 #9f1239'}
            shadowHover={isPositive ? '0 3px 0 0 #065f46' : '0 3px 0 0 #9f1239'}
            className={isPositive ? 'border-emerald-400 bg-emerald-500 p-5' : 'border-rose-400 bg-rose-500 p-5'}
          >
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">มูลค่าพอร์ตรวม</p>
            <div className="flex items-end gap-3 mb-4">
              <p className="text-3xl font-black text-white num">฿{fmt(totalValue)}</p>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold mb-0.5 bg-white/20 border border-white/30 text-white">
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isPositive ? '+' : ''}฿{fmt(totalGainLoss)} ({isPositive ? '+' : ''}{totalReturn.toFixed(2)}%)
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/20 border border-white/30 rounded-xl p-3">
                <p className="text-white/60 text-xs mb-0.5">ต้นทุนรวม</p>
                <p className="text-base font-black text-white num">฿{fmt(totalCost)}</p>
              </div>
              <div className="bg-white/20 border border-white/30 rounded-xl p-3">
                <p className="text-white/60 text-xs mb-0.5">กำไร/ขาดทุน</p>
                <p className="text-base font-black text-white num">{isPositive ? '+' : ''}฿{fmt(totalGainLoss)}</p>
              </div>
            </div>
          </PressCard>

          {/* Allocation chart */}
          {allocationData.length > 1 && (
            <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-white/70 mb-3">สัดส่วนการลงทุน</p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={allocationData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={2} dataKey="value">
                      {allocationData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`฿${fmt(Number(val ?? 0))}`, '']}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 flex-1">
                  {allocationData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-gray-600 dark:text-white/50 flex-1">{item.name}</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-white/60">
                        {totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : 0}%
                      </span>
                      <span className="text-xs text-gray-400 dark:text-white/30 w-28 text-right">฿{fmt(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </PressCard>
          )}

          {/* Holdings grouped by class */}
          <div className="space-y-4">
            {(Object.keys(ASSET_CLASS_META) as Array<keyof typeof ASSET_CLASS_META>)
              .filter((cls) => groupedHoldings.has(cls))
              .map((cls) => {
                const items = groupedHoldings.get(cls)!
                const meta = ASSET_CLASS_META[cls]
                const classValue = items.reduce((s, h) => s + toTHB(h.units * h.currentPricePerUnit, h.currency ?? 'THB'), 0)

                return (
                  <section key={cls}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span>{meta.emoji}</span>
                      <h2 className="text-sm font-semibold text-gray-700 dark:text-white/60">{meta.label}</h2>
                      <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                      <span className="ml-auto text-sm font-bold text-gray-700 dark:text-white/70">฿{fmt(classValue)}</span>
                    </div>

                    <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 overflow-hidden p-0">
                    <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {items.map((h) => {
                        const cur = h.currency ?? 'THB'
                        const sym = CURRENCY_SYMBOLS[cur] ?? cur
                        const isForeign = cur !== 'THB'
                        const costNative = h.units * h.avgCostPerUnit
                        const valueNative = h.units * h.currentPricePerUnit
                        const costTHB = toTHB(costNative, cur)
                        const valueTHB = toTHB(valueNative, cur)
                        const glTHB = valueTHB - costTHB
                        const ret = costTHB > 0 ? (glTHB / costTHB) * 100 : 0
                        const isUp = glTHB >= 0
                        const isSyncing = syncingIds.has(h.id)
                        const hasYahooSymbol = getYahooSymbol(h) !== null

                        return (
                          <div key={h.id} className="flex items-center gap-3 px-4 py-3.5">
                            {/* Color dot */}
                            <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800 dark:text-white/80 truncate">{h.name}</span>
                                {h.ticker && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/[0.07] text-gray-500 dark:text-white/40 shrink-0">{h.ticker}</span>
                                )}
                                {isForeign && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">{cur}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
                                {h.units.toLocaleString('th-TH')} หน่วย × {sym}{fmt(h.currentPricePerUnit)}
                                {isForeign && <span className="ml-1 text-gray-300 dark:text-white/20">≈ ฿{toTHB(h.currentPricePerUnit, cur).toLocaleString('th-TH', { maximumFractionDigits: 2 })}</span>}
                              </p>
                              <p className="text-[10px] text-gray-300 dark:text-white/20 mt-0.5">
                                อัปเดต {fmtTime(h.lastPriceUpdate)}
                              </p>
                            </div>

                            {/* Value + GL */}
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-800 dark:text-white/80">
                                ฿{fmt(valueTHB)}
                                {isForeign && <span className="text-xs font-normal text-gray-400 dark:text-white/30 ml-1">({sym}{fmt(valueNative)})</span>}
                              </p>
                              <p className={cn('text-xs font-medium', isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                                {isUp ? '+' : ''}฿{fmt(glTHB)} ({isUp ? '+' : ''}{ret.toFixed(2)}%)
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              {/* Auto-fetch if ticker exists, otherwise open manual dialog */}
                              <button
                                onClick={() => hasYahooSymbol ? fetchPrice(h) : setUpdatingHolding(h)}
                                disabled={isSyncing}
                                className={cn(
                                  'p-1.5 rounded-md transition-colors',
                                  isSyncing
                                    ? 'text-primary/50 cursor-not-allowed'
                                    : hasYahooSymbol
                                      ? 'text-gray-400 hover:text-primary hover:bg-primary/10'
                                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                                )}
                                title={hasYahooSymbol ? `ดึงราคาจาก Yahoo Finance (${getYahooSymbol(h)})` : 'อัปเดตราคา'}
                              >
                                <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
                              </button>
                              <button
                                onClick={() => setUpdatingHolding(h)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                                title="แก้ไขราคาด้วยตนเอง"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingId(h.id)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                title="ลบ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    </PressCard>
                  </section>
                )
              })}
          </div>
        </>
      )}

      <InvestmentForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingHolding(null) }}
        editingHolding={editingHolding}
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
