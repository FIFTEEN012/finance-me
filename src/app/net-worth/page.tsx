'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Scale, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { NetWorthForm, ASSET_CATEGORIES, LIABILITY_CATEGORIES } from '@/components/net-worth/NetWorthForm'
import { NetWorthHistoryChart } from '@/components/net-worth/NetWorthHistoryChart'
import { AssetAllocationChart } from '@/components/net-worth/AssetAllocationChart'
import { useNetWorthStore } from '@/store/useNetWorthStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { NetWorthItem, NetWorthItemType } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { EXCHANGE_RATES } from '@/lib/exchangeRates'
import { PressCard } from '@/components/ui/PressCard'

const NW_MILESTONES = [
  { value: 0, emoji: '🎯', label: 'Net Worth เป็นบวกแล้ว!' },
  { value: 100_000, emoji: '💎', label: 'Net Worth ถึง ฿100,000!' },
  { value: 500_000, emoji: '🚀', label: 'Net Worth ถึง ฿500,000!' },
  { value: 1_000_000, emoji: '🏆', label: 'เป็นเศรษฐีล้านแรก! Net Worth ฿1,000,000!' },
]

const MILESTONE_KEY = 'finance-nw-milestones'

function getCelebrated(): number[] {
  try { return JSON.parse(localStorage.getItem(MILESTONE_KEY) ?? '[]') } catch { return [] }
}
function saveCelebrated(vals: number[]) {
  try { localStorage.setItem(MILESTONE_KEY, JSON.stringify(vals)) } catch {}
}

export default function NetWorthPage() {
  const { items, deleteItem } = useNetWorthStore()
  const holdings = useInvestmentStore((s) => s.holdings)
  const [formOpen, setFormOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<NetWorthItemType>('ASSET')
  const [editingItem, setEditingItem] = useState<NetWorthItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NetWorthItem | null>(null)

  const portfolioValueTHB = useMemo(
    () => holdings.reduce((s, h) => s + h.units * h.currentPricePerUnit * (EXCHANGE_RATES[h.currency ?? 'THB'] ?? 1), 0),
    [holdings]
  )

  const assets = items.filter((i) => i.type === 'ASSET')
  const liabilities = items.filter((i) => i.type === 'LIABILITY')

  const totalAssets = assets.reduce((s, i) => s + i.amount, 0) + portfolioValueTHB
  const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0)
  const netWorth = totalAssets - totalLiabilities
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0

  const prevNetWorth = useRef<number | null>(null)
  useEffect(() => {
    if (items.length === 0) return
    const prev = prevNetWorth.current
    prevNetWorth.current = netWorth
    if (prev === null) return  // skip on first render

    const celebrated = getCelebrated()
    const newCelebrated = [...celebrated]
    let changed = false

    for (const m of NW_MILESTONES) {
      if (!celebrated.includes(m.value) && prev < m.value && netWorth >= m.value) {
        toast.success(`${m.emoji} ${m.label}`, { duration: 8000 })
        newCelebrated.push(m.value)
        changed = true
      }
    }

    if (changed) saveCelebrated(newCelebrated)
  }, [netWorth, items.length])

  function openAdd(type: NetWorthItemType) {
    setDefaultType(type)
    setEditingItem(null)
    setFormOpen(true)
  }

  function handleEdit(item: NetWorthItem) {
    setEditingItem(item)
    setFormOpen(true)
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingItem(null)
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteItem(deleteTarget.id)
    toast.success(`ลบ "${deleteTarget.name}" แล้ว`)
    setDeleteTarget(null)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Net Worth</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ติดตามสินทรัพย์และหนี้สินรวม</p>
      </div>

      {/* Net Worth hero */}
      {(items.length > 0 || portfolioValueTHB > 0) && (
        <PressCard
          shadow={netWorth >= 0 ? '0 5px 0 0 #4c1d95' : '0 5px 0 0 #9f1239'}
          shadowHover={netWorth >= 0 ? '0 3px 0 0 #4c1d95' : '0 3px 0 0 #9f1239'}
          className={`p-6 text-center ${netWorth >= 0 ? 'border-violet-400 bg-violet-500' : 'border-rose-400 bg-rose-500'}`}
        >
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">มูลค่าสุทธิ (Net Worth)</p>
          <p className="text-white font-black text-4xl leading-none num mb-1">
            {netWorth >= 0 ? '' : '-'}{formatCurrency(Math.abs(netWorth))}
          </p>
          <p className="text-white/50 text-xs mt-1">อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-white/20 border border-white/30 rounded-xl p-3">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs text-white/70">สินทรัพย์</span>
              </div>
              <p className="text-base font-black text-white num">{formatCurrency(totalAssets)}</p>
            </div>
            <div className="bg-white/20 border border-white/30 rounded-xl p-3">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs text-white/70">หนี้สิน</span>
              </div>
              <p className="text-base font-black text-white num">{formatCurrency(totalLiabilities)}</p>
            </div>
            <div className="bg-white/20 border border-white/30 rounded-xl p-3">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Scale className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs text-white/70">หนี้/ทรัพย์</span>
              </div>
              <p className="text-base font-black text-white num">{debtRatio.toFixed(1)}%</p>
            </div>
          </div>

          {/* Stacked bar */}
          {totalAssets > 0 && (
            <div className="mt-4 h-3 rounded-full overflow-hidden bg-white/20 flex">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${Math.min(100, ((totalAssets - totalLiabilities) / totalAssets) * 100)}%` }}
              />
              <div
                className="h-full bg-red-300 transition-all"
                style={{ width: `${Math.min(100, (totalLiabilities / totalAssets) * 100)}%` }}
              />
            </div>
          )}
          {totalAssets > 0 && (
            <div className="flex justify-between text-[10px] text-white/50 mt-1 px-0.5">
              <span>สินทรัพย์สุทธิ</span>
              <span>หนี้สิน</span>
            </div>
          )}
        </PressCard>
      )}

      {/* Empty state */}
      {items.length === 0 && portfolioValueTHB === 0 && (
        <EmptyState
          icon={Scale}
          title="ยังไม่มีข้อมูล Net Worth"
          description="เพิ่มสินทรัพย์และหนี้สินเพื่อติดตามมูลค่าสุทธิของคุณ"
          action={
            <div className="flex gap-2">
              <Button onClick={() => openAdd('ASSET')} className="bg-violet-600 hover:bg-violet-700 gap-2">
                <Plus className="w-4 h-4" /> เพิ่มสินทรัพย์
              </Button>
              <Button onClick={() => openAdd('LIABILITY')} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> เพิ่มหนี้สิน
              </Button>
            </div>
          }
        />
      )}

      {/* History chart */}
      {(items.length > 0 || portfolioValueTHB > 0) && <NetWorthHistoryChart />}

      {/* Asset allocation */}
      {items.length > 0 && <AssetAllocationChart />}

      {/* Portfolio linked card */}
      {portfolioValueTHB > 0 && (
        <PressCard shadow="0 4px 0 0 #1d4ed8" shadowHover="0 2px 0 0 #1d4ed8" className="border-blue-400 bg-blue-500 p-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white">พอร์ตการลงทุน</p>
              <p className="text-xs text-white/60 mt-0.5">
                {holdings.length} หลักทรัพย์ · ซิงค์อัตโนมัติ
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-black text-white num">{formatCurrency(portfolioValueTHB)}</p>
            </div>
            <Link href="/investments" className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </PressCard>
      )}

      {/* Assets section */}
      {(items.length > 0 || assets.length > 0) && (
        <NetWorthSection
          title="สินทรัพย์"
          type="ASSET"
          items={assets}
          total={assets.reduce((s, i) => s + i.amount, 0)}
          categoryList={ASSET_CATEGORIES}
          onAdd={() => openAdd('ASSET')}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />
      )}

      {/* Liabilities section */}
      {(items.length > 0 || liabilities.length > 0) && (
        <NetWorthSection
          title="หนี้สิน"
          type="LIABILITY"
          items={liabilities}
          total={totalLiabilities}
          categoryList={LIABILITY_CATEGORIES}
          onAdd={() => openAdd('LIABILITY')}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
        />
      )}

      <NetWorthForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editingItem={editingItem}
        defaultType={defaultType}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบรายการ"
        description={`ต้องการลบ "${deleteTarget?.name}" ใช่หรือไม่?`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

interface NetWorthSectionProps {
  title: string
  type: NetWorthItemType
  items: NetWorthItem[]
  total: number
  categoryList: Array<{ value: string; label: string; icon: string; color: string }>
  onAdd: () => void
  onEdit: (i: NetWorthItem) => void
  onDelete: (i: NetWorthItem) => void
}

function NetWorthSection({ title, type, items, total, categoryList, onAdd, onEdit, onDelete }: NetWorthSectionProps) {
  const isAsset = type === 'ASSET'

  // Group by category
  const grouped = categoryList
    .map((cat) => ({
      ...cat,
      items: items.filter((i) => i.category === cat.value),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
          <Badge variant="secondary" className="text-xs">{items.length} รายการ</Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${isAsset ? 'text-violet-600 dark:text-violet-400' : 'text-red-500'}`}>
            {formatCurrency(total)}
          </span>
          <Button size="sm" variant="outline" onClick={onAdd} className="h-7 text-xs gap-1">
            <Plus className="w-3 h-3" /> เพิ่ม
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          ยังไม่มี{title}
        </p>
      ) : (
        <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 overflow-hidden p-0">
      <div>
          {grouped.map((group, gi) => (
            <div key={group.value}>
              {/* Category header */}
              <div className={`flex items-center gap-2 px-4 py-2 ${gi > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''} bg-gray-50 dark:bg-gray-800/60`}>
                <CategoryIcon name={group.icon} className="w-3.5 h-3.5" style={{ color: group.color }} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{group.label}</span>
                <span className="ml-auto text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {formatCurrency(group.items.reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>

              {/* Items */}
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t border-gray-100 dark:border-gray-800/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                    {item.note && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.note}</p>}
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${isAsset ? 'text-violet-600 dark:text-violet-400' : 'text-red-500'}`}>
                    {formatCurrency(item.amount)}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </PressCard>
      )}
    </section>
  )
}
