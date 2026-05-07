'use client'

import { useRef } from 'react'
import { Search, X, ChevronDown, Calendar, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const triggerCls = (active: boolean) =>
  cn(
    'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium transition-colors',
    'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800',
    active
      ? 'border-violet-400 text-violet-700 dark:text-violet-400'
      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
  )
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { cn } from '@/lib/utils'

export interface TransactionFilter {
  search:     string
  type:       'ALL' | 'INCOME' | 'EXPENSE'
  categoryId: string
  tag:        string
  dateFrom:   string
  dateTo:     string
  amountMin:  string
  amountMax:  string
}

export const DEFAULT_FILTER: TransactionFilter = {
  search: '', type: 'ALL', categoryId: '', tag: '',
  dateFrom: '', dateTo: '', amountMin: '', amountMax: '',
}

/* ─── Quick date presets ──────────────────────────────────── */

type Preset = { label: string; from: string; to: string }

function buildPresets(): Preset[] {
  const now   = new Date()
  const pad   = (n: number) => String(n).padStart(2, '0')
  const fmt   = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const todayStr = fmt(now)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0)

  const last3Start = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const yearStart = new Date(now.getFullYear(), 0, 1)

  return [
    { label: 'วันนี้',         from: todayStr,           to: todayStr },
    { label: 'สัปดาห์นี้',     from: fmt(weekStart),     to: todayStr },
    { label: 'เดือนนี้',       from: fmt(monthStart),    to: fmt(monthEnd) },
    { label: 'เดือนที่แล้ว',   from: fmt(prevMonthStart),to: fmt(prevMonthEnd) },
    { label: '3 เดือนล่าสุด',  from: fmt(last3Start),    to: todayStr },
    { label: 'ปีนี้',          from: fmt(yearStart),     to: todayStr },
  ]
}

/* ─── Active filter chip ──────────────────────────────────── */

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-violet-900 dark:hover:text-violet-100 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

/* ─── Main component ──────────────────────────────────────── */

interface TransactionFiltersProps {
  filters:   TransactionFilter
  onChange:  (f: TransactionFilter) => void
  total:     number
  filtered:  number
}

export function TransactionFilters({ filters, onChange, total, filtered }: TransactionFiltersProps) {
  const { categories } = useCategoryStore()
  const { getAllTags } = useTransactionStore()
  const allTags = getAllTags()
  const searchRef = useRef<HTMLInputElement>(null)

  const visibleCategories = filters.type === 'ALL'
    ? categories
    : categories.filter((c) => c.type === filters.type)

  const presets = buildPresets()

  const hasFilters = filters.search || filters.type !== 'ALL' || filters.categoryId || filters.tag ||
    filters.dateFrom || filters.dateTo || filters.amountMin || filters.amountMax

  const reset = () => onChange({ ...DEFAULT_FILTER })

  /* Active date preset label */
  const activeDatePreset = filters.dateFrom || filters.dateTo
    ? presets.find((p) => p.from === filters.dateFrom && p.to === filters.dateTo)?.label ?? 'กำหนดเอง'
    : null

  /* Chips */
  const chips: Array<{ label: string; clear: () => void }> = []
  if (filters.type !== 'ALL')
    chips.push({ label: filters.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย', clear: () => onChange({ ...filters, type: 'ALL', categoryId: '' }) })
  if (filters.categoryId) {
    const cat = categories.find((c) => c.id === filters.categoryId)
    if (cat) chips.push({ label: cat.name, clear: () => onChange({ ...filters, categoryId: '' }) })
  }
  if (filters.tag)
    chips.push({ label: `#${filters.tag}`, clear: () => onChange({ ...filters, tag: '' }) })
  if (activeDatePreset)
    chips.push({ label: activeDatePreset, clear: () => onChange({ ...filters, dateFrom: '', dateTo: '' }) })
  if (filters.amountMin)
    chips.push({ label: `≥ ฿${filters.amountMin}`, clear: () => onChange({ ...filters, amountMin: '' }) })
  if (filters.amountMax)
    chips.push({ label: `≤ ฿${filters.amountMax}`, clear: () => onChange({ ...filters, amountMax: '' }) })

  return (
    <div className="space-y-2.5">
      {/* Row 1: search + type + category + date preset + more */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            ref={searchRef}
            placeholder="ค้นหารายการ / หมายเหตุ..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-8 w-52 text-sm h-9"
          />
          {filters.search && (
            <button
              onClick={() => { onChange({ ...filters, search: '' }); searchRef.current?.focus() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type */}
        <Select value={filters.type} onValueChange={(v) => onChange({ ...filters, type: v as TransactionFilter['type'], categoryId: '' })}>
          <SelectTrigger className="w-32 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทั้งหมด</SelectItem>
            <SelectItem value="INCOME">รายรับ</SelectItem>
            <SelectItem value="EXPENSE">รายจ่าย</SelectItem>
          </SelectContent>
        </Select>

        {/* Category */}
        <Select value={filters.categoryId || 'ALL'} onValueChange={(v) => onChange({ ...filters, categoryId: !v || v === 'ALL' ? '' : v })}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="ทุกหมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ทุกหมวดหมู่</SelectItem>
            {visibleCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <Select value={filters.tag || 'ALL'} onValueChange={(v) => onChange({ ...filters, tag: !v || v === 'ALL' ? '' : v })}>
            <SelectTrigger className={cn('h-9 text-sm', filters.tag ? 'w-36 border-violet-400 text-violet-700 dark:text-violet-400' : 'w-32')}>
              <Tag className="w-3.5 h-3.5 mr-1.5 opacity-60 flex-shrink-0" />
              <SelectValue placeholder="แท็ก" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ทุกแท็ก</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>#{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date preset */}
        <Popover>
          <PopoverTrigger className={triggerCls(!!activeDatePreset)}>
            <Calendar className="w-3.5 h-3.5" />
            {activeDatePreset ?? 'ช่วงเวลา'}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            <div className="space-y-0.5">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => onChange({ ...filters, dateFrom: p.from, dateTo: p.to })}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors',
                    filters.dateFrom === p.from && filters.dateTo === p.to
                      ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  )}
                >
                  {p.label}
                </button>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-1.5 mt-1.5 space-y-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 px-2 mb-1">กำหนดเอง</p>
                <div className="flex gap-1 px-1">
                  <Input type="date" value={filters.dateFrom} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })} className="text-xs h-7 px-1.5" />
                  <Input type="date" value={filters.dateTo} onChange={(e) => onChange({ ...filters, dateTo: e.target.value })} className="text-xs h-7 px-1.5" />
                </div>
                {(filters.dateFrom || filters.dateTo) && (
                  <button onClick={() => onChange({ ...filters, dateFrom: '', dateTo: '' })} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 px-2">
                    ล้างวันที่
                  </button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Amount range */}
        <Popover>
          <PopoverTrigger className={triggerCls(!!(filters.amountMin || filters.amountMax))}>
            ฿ จำนวน
            <ChevronDown className="w-3 h-3 opacity-60" />
          </PopoverTrigger>
          <PopoverContent className="w-52 p-3" align="start">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">ช่วงจำนวนเงิน</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">ขั้นต่ำ (฿)</label>
                <Input
                  type="number" min="0" placeholder="0"
                  value={filters.amountMin}
                  onChange={(e) => onChange({ ...filters, amountMin: e.target.value })}
                  className="h-8 text-sm mt-0.5"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">สูงสุด (฿)</label>
                <Input
                  type="number" min="0" placeholder="ไม่จำกัด"
                  value={filters.amountMax}
                  onChange={(e) => onChange({ ...filters, amountMax: e.target.value })}
                  className="h-8 text-sm mt-0.5"
                />
              </div>
              {(filters.amountMin || filters.amountMax) && (
                <button onClick={() => onChange({ ...filters, amountMin: '', amountMax: '' })} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600">
                  ล้าง
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-9 text-gray-500 dark:text-gray-400 hover:text-gray-700">
            <X className="w-3.5 h-3.5 mr-1" /> ล้างทั้งหมด
          </Button>
        )}

        {/* Result count */}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {hasFilters ? `${filtered} จาก ${total} รายการ` : `${total} รายการ`}
        </span>
      </div>

      {/* Row 2: active chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Chip key={chip.label} label={chip.label} onRemove={chip.clear} />
          ))}
        </div>
      )}
    </div>
  )
}
