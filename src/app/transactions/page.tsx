'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Upload, Download, X,
  Calendar, ChevronDown, Tag, TrendingUp, TrendingDown, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TransactionGroupedList } from '@/components/transactions/TransactionGroupedList'
import { TransactionForm }        from '@/components/transactions/TransactionForm'
import { CsvImportDialog }        from '@/components/transactions/CsvImportDialog'
import { ExportDialog }           from '@/components/transactions/ExportDialog'
import { useTransactionStore }    from '@/store/useTransactionStore'
import { useCategoryStore }       from '@/store/useCategoryStore'
import { Transaction }            from '@/types'
import { formatCurrency, cn }     from '@/lib/utils'
import { PressCard }              from '@/components/ui/PressCard'

/* ─── Date presets ─────────────────────────────────────── */

type Preset = { label: string; from: string; to: string }

function buildPresets(): Preset[] {
  const now  = new Date()
  const pad  = (n: number) => String(n).padStart(2, '0')
  const fmt  = (d: Date)   => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = fmt(now)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const prevMS     = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevME     = new Date(now.getFullYear(), now.getMonth(), 0)
  const last3Start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const yearStart  = new Date(now.getFullYear(), 0, 1)

  return [
    { label: 'วันนี้',         from: today,           to: today },
    { label: 'สัปดาห์นี้',     from: fmt(weekStart),  to: today },
    { label: 'เดือนนี้',       from: fmt(monthStart), to: fmt(monthEnd) },
    { label: 'เดือนที่แล้ว',   from: fmt(prevMS),     to: fmt(prevME) },
    { label: '3 เดือนล่าสุด',  from: fmt(last3Start), to: today },
    { label: 'ปีนี้',          from: fmt(yearStart),  to: today },
  ]
}

/* ─── Filter state ─────────────────────────────────────── */

interface Filter {
  search:     string
  type:       'ALL' | 'INCOME' | 'EXPENSE'
  categoryId: string
  tag:        string
  dateFrom:   string
  dateTo:     string
}

const INIT: Filter = { search: '', type: 'ALL', categoryId: '', tag: '', dateFrom: '', dateTo: '' }

/* ─── Page ─────────────────────────────────────────────── */

export default function TransactionsPage() {
  const { transactions, getAllTags } = useTransactionStore()
  const { categories }              = useCategoryStore()
  const router                      = useRouter()

  const [filter, setFilter]         = useState<Filter>(INIT)
  const [formOpen, setFormOpen]     = useState(false)
  const [csvOpen, setCsvOpen]       = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [editing, setEditing]       = useState<Transaction | null>(null)
  const searchRef                   = useRef<HTMLInputElement>(null)

  const allTags = getAllTags()
  const presets = buildPresets()

  const visibleCategories = filter.type === 'ALL'
    ? categories
    : categories.filter((c) => c.type === filter.type)

  const activeDatePreset = (filter.dateFrom || filter.dateTo)
    ? presets.find((p) => p.from === filter.dateFrom && p.to === filter.dateTo)?.label ?? 'กำหนดเอง'
    : null

  const hasExtra = !!(filter.categoryId || filter.tag || filter.dateFrom || filter.dateTo)

  const filtered = useMemo(() => {
    const q = filter.search.toLowerCase()
    return transactions.filter((t) => {
      if (filter.type !== 'ALL' && t.type !== filter.type) return false
      if (filter.categoryId && t.categoryId !== filter.categoryId) return false
      if (filter.tag && !(t.tags ?? []).includes(filter.tag)) return false
      if (q && !t.description.toLowerCase().includes(q) && !(t.note ?? '').toLowerCase().includes(q)) return false
      if (filter.dateFrom && t.date < filter.dateFrom) return false
      if (filter.dateTo   && t.date > filter.dateTo + 'T23:59:59') return false
      return true
    })
  }, [transactions, filter])

  const totalIncome  = filtered.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const net          = totalIncome - totalExpense

  const handleOpenAdd = () => { setEditing(null); setFormOpen(true) }
  const handleEdit    = (t: Transaction) => { setEditing(t); setFormOpen(true) }

  return (
    <div className="space-y-5 pb-20">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">รายการธุรกรรม</h2>
          <p className="text-sm font-semibold text-gray-400">{transactions.length} รายการ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}
            className="gap-1.5 border-gray-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08] text-xs px-2.5 py-1.5 sm:text-sm sm:px-3 sm:py-2">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/import')}
            className="gap-1.5 border-gray-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/[0.08] text-xs px-2.5 py-1.5 sm:text-sm sm:px-3 sm:py-2">
            <Upload className="w-3.5 h-3.5" /> Import
          </Button>
          <Button onClick={handleOpenAdd}
            className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_16px_rgba(124,58,237,0.30)] text-xs px-2.5 py-1.5 sm:text-sm sm:px-3 sm:py-2">
            <Plus className="w-4 h-4" /> เพิ่มรายการ
          </Button>
        </div>
      </div>

      {/* ── 3 Stat Cards (Duolingo press style) ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Income — emerald */}
        <PressCard
          shadow="0 4px 0 0 #065f46"
          shadowHover="0 2px 0 0 #065f46"
          className="border-emerald-400 bg-emerald-500 p-2 sm:p-4"
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-1.5 sm:mb-3">
            <TrendingUp className="w-4 h-4 sm:w-5 h-5 text-white" />
          </div>
          <p className="text-white/70 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider mb-1">รายรับ</p>
          <p className="text-white font-black text-xs sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(totalIncome)}>{formatCurrency(totalIncome)}</p>
        </PressCard>

        {/* Expense — rose */}
        <PressCard
          shadow="0 4px 0 0 #9f1239"
          shadowHover="0 2px 0 0 #9f1239"
          className="border-rose-400 bg-rose-500 p-2 sm:p-4"
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-1.5 sm:mb-3">
            <TrendingDown className="w-4 h-4 sm:w-5 h-5 text-white" />
          </div>
          <p className="text-white/70 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider mb-1">รายจ่าย</p>
          <p className="text-white font-black text-xs sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(totalExpense)}>{formatCurrency(totalExpense)}</p>
        </PressCard>

        {/* Net — violet or red depending on sign */}
        <PressCard
          shadow={net >= 0 ? '0 4px 0 0 #4c1d95' : '0 4px 0 0 #9f1239'}
          shadowHover={net >= 0 ? '0 2px 0 0 #4c1d95' : '0 2px 0 0 #9f1239'}
          className={net >= 0 ? 'border-violet-400 bg-violet-500 p-2 sm:p-4' : 'border-rose-400 bg-rose-500 p-2 sm:p-4'}
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-1.5 sm:mb-3">
            <Zap className="w-4 h-4 sm:w-5 h-5 text-white" />
          </div>
          <p className="text-white/70 text-[9px] sm:text-[11px] font-bold uppercase tracking-wider mb-1">ยอดสุทธิ</p>
          <p className="text-white font-black text-xs sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(net)}>{formatCurrency(net)}</p>
        </PressCard>
      </div>

      {/* ── Filter bar ── */}
      <PressCard
        shadow="0 4px 0 0 #d1d5db"
        shadowHover="0 2px 0 0 #d1d5db"
        className="border-gray-200 bg-white px-4 py-3 space-y-2.5"
      >
        {/* Row: search + type pills + extra filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              ref={searchRef}
              placeholder="ค้นหา..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="pl-9 h-9 text-sm bg-gray-50 border-gray-200 placeholder:text-gray-400"
            />
            {filter.search && (
              <button
                onClick={() => { setFilter({ ...filter, search: '' }); searchRef.current?.focus() }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type pills */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-0.5">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter({ ...filter, type: t, categoryId: '' })}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150',
                  filter.type === t
                    ? 'bg-violet-600 text-white shadow-[0_2px_0_0_#4c1d95]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white',
                )}
              >
                {t === 'ALL' ? 'ทั้งหมด' : t === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}
              </button>
            ))}
          </div>

          {/* Date picker */}
          <Popover>
            <PopoverTrigger className={cn(
              'inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer',
              activeDatePreset
                ? 'border-violet-400 text-violet-700 bg-violet-50'
                : 'border-gray-200 text-gray-500 bg-gray-50 hover:text-gray-700',
            )}>
              <Calendar className="w-3.5 h-3.5" />
              {activeDatePreset ?? 'ช่วงเวลา'}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="start">
              <div className="space-y-0.5">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setFilter({ ...filter, dateFrom: p.from, dateTo: p.to })}
                    className={cn(
                      'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors',
                      filter.dateFrom === p.from && filter.dateTo === p.to
                        ? 'bg-violet-50 text-violet-700 font-bold'
                        : 'hover:bg-gray-50 text-gray-700',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <div className="border-t border-gray-100 pt-2 mt-1 space-y-1 px-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">กำหนดเอง</p>
                  <div className="flex gap-1">
                    <Input type="date" value={filter.dateFrom} onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })} className="text-xs h-7 px-1.5" />
                    <Input type="date" value={filter.dateTo}   onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}   className="text-xs h-7 px-1.5" />
                  </div>
                  {(filter.dateFrom || filter.dateTo) && (
                    <button onClick={() => setFilter({ ...filter, dateFrom: '', dateTo: '' })} className="text-xs text-gray-400 hover:text-gray-600">ล้างวันที่</button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Category */}
          <Select value={filter.categoryId || 'ALL'} onValueChange={(v) => setFilter({ ...filter, categoryId: !v || v === 'ALL' ? '' : v })}>
            <SelectTrigger className={cn(
              'h-9 text-xs w-36 bg-gray-50 border-gray-200 font-bold',
              filter.categoryId ? 'border-violet-400 text-violet-700' : 'text-gray-500',
            )}>
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
            <Select value={filter.tag || 'ALL'} onValueChange={(v) => setFilter({ ...filter, tag: !v || v === 'ALL' ? '' : v })}>
              <SelectTrigger className={cn(
                'h-9 text-xs w-28 bg-gray-50 border-gray-200 font-bold',
                filter.tag ? 'border-violet-400 text-violet-700' : 'text-gray-500',
              )}>
                <Tag className="w-3 h-3 mr-1 opacity-60 flex-shrink-0" />
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

          {/* Clear */}
          {hasExtra && (
            <Button variant="ghost" size="sm" onClick={() => setFilter(INIT)}
              className="h-9 text-xs text-gray-500 hover:text-gray-700 gap-1">
              <X className="w-3.5 h-3.5" /> ล้าง
            </Button>
          )}

          {/* Count */}
          <span className="ml-auto text-xs font-bold text-gray-400 whitespace-nowrap">
            {filtered.length !== transactions.length
              ? `${filtered.length} / ${transactions.length}`
              : `${transactions.length} รายการ`}
          </span>
        </div>

        {/* Active filter chips */}
        {(filter.categoryId || filter.tag || activeDatePreset) && (
          <div className="flex flex-wrap gap-1.5">
            {activeDatePreset && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200">
                {activeDatePreset}
                <button onClick={() => setFilter({ ...filter, dateFrom: '', dateTo: '' })} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filter.categoryId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200">
                {categories.find((c) => c.id === filter.categoryId)?.name ?? ''}
                <button onClick={() => setFilter({ ...filter, categoryId: '' })} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filter.tag && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200">
                #{filter.tag}
                <button onClick={() => setFilter({ ...filter, tag: '' })} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </PressCard>

      {/* ── Transaction list ── */}
      <PressCard
        shadow="0 4px 0 0 #d1d5db"
        shadowHover="0 2px 0 0 #d1d5db"
        className="border-gray-200 overflow-hidden p-0"
      >
        <TransactionGroupedList
          transactions={filtered}
          onEdit={handleEdit}
          className="rounded-none border-0 shadow-none"
        />
      </PressCard>

      {/* ── Dialogs ── */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingTransaction={editing}
      />
      <CsvImportDialog  open={csvOpen}    onOpenChange={setCsvOpen} />
      <ExportDialog     open={exportOpen} onOpenChange={setExportOpen} filtered={filtered} />
    </div>
  )
}
