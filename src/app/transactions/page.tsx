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
  type:       'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'
  categoryId: string
  tag:        string
  dateFrom:   string
  dateTo:     string
}

const INIT: Filter = { search: '', type: 'ALL', categoryId: '', tag: '', dateFrom: '', dateTo: '' }

export default function TransactionsPage() {
  const { transactions, getAllTags } = useTransactionStore()
  const { categories }              = useCategoryStore()
  const router                      = useRouter()

  const [filter, setFilter]         = useState<Filter>(INIT)
  const [formOpen, setFormOpen]     = useState(false)
  const [csvOpen, setCsvOpen]       = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [editing, setEditing]       = useState<Transaction | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
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
  const activeFiltersCount = [filter.categoryId, filter.tag, filter.dateFrom || filter.dateTo].filter(Boolean).length

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
  const totalTransfer = filtered.filter((t) => t.type === 'TRANSFER').reduce((s, t) => s + t.amount, 0)
  const net          = totalIncome - totalExpense

  const handleOpenAdd = () => { setEditing(null); setFormOpen(true) }
  const handleEdit    = (t: Transaction) => { setEditing(t); setFormOpen(true) }

  return (
    <div className="space-y-6 pb-28 text-slate-800 dark:text-slate-100">

      {/* ── 1. HEADER / HERO CARD ── */}
      <PressCard
        shadow="0 6px 0 0 var(--quest-primary)"
        shadowHover="0 3px 0 0 var(--quest-primary)"
        className="relative overflow-hidden border-2 border-[var(--quest-primary)] bg-[var(--quest-primary-container)] p-6 text-[var(--quest-on-primary-container)] rounded-3xl"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0 text-3xl animate-pulse">
              🪙
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black leading-tight">ธุรกรรมของฉัน</h2>
              <p className="text-xs font-bold text-white/90 uppercase tracking-widest mt-1 opacity-90">
                บันทึกรายรับ-รายจ่ายให้ครบ เพื่อสะสมเควสการเงิน
              </p>
            </div>
          </div>
          
          <div className="flex gap-2.5 w-full md:w-auto">
            <button
              onClick={handleOpenAdd}
              className="flex-1 md:flex-none font-black text-sm px-6 py-3 rounded-2xl bg-white text-[var(--quest-primary)] border-2 border-[var(--quest-primary)] border-b-4 shadow-[0_3px_0_0_var(--quest-primary)] transform transition-all active:translate-y-[2px] active:border-b-2 hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3px]" /> เพิ่มธุรกรรม
            </button>
          </div>
        </div>
      </PressCard>

      {/* ── 2. QUICK ACTIONS & DATA MANIPULATION BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Count summary label */}
        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
          ทั้งหมด: {filtered.length} / {transactions.length} รายการ
        </p>

        {/* CSV and Export Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setExportOpen(true)}
            className="flex-1 sm:flex-none font-bold text-xs px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-800 border-b-4 shadow-[0_3px_0_0_#e5e5e5] dark:shadow-[0_3px_0_0_#020617] transform transition-all active:translate-y-[2px] active:border-b-2 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> ส่งออกข้อมูล
          </button>
          <button
            onClick={() => router.push('/import')}
            className="flex-1 sm:flex-none font-bold text-xs px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-800 border-b-4 shadow-[0_3px_0_0_#e5e5e5] dark:shadow-[0_3px_0_0_#020617] transform transition-all active:translate-y-[2px] active:border-b-2 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> นำเข้า CSV
          </button>
        </div>
      </div>

      {/* ── 3. TRANSACTION SUMMARY STRIP (Duolingo Card Style) ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Income Card - Emerald */}
        <PressCard
          shadow="0 5px 0 0 #065f46"
          shadowHover="0 3px 0 0 #065f46"
          className="border-emerald-400 bg-emerald-500 text-white p-3.5 flex flex-col justify-between h-28 rounded-2xl"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">รายรับ</span>
            <TrendingUp className="w-4 h-4 text-emerald-100" />
          </div>
          <p className="font-black text-sm sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(totalIncome)}>
            {formatCurrency(totalIncome)}
          </p>
        </PressCard>

        {/* Expense Card - Rose */}
        <PressCard
          shadow="0 5px 0 0 #9f1239"
          shadowHover="0 3px 0 0 #9f1239"
          className="border-rose-400 bg-rose-500 text-white p-3.5 flex flex-col justify-between h-28 rounded-2xl"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-100">รายจ่าย</span>
            <TrendingDown className="w-4 h-4 text-rose-100" />
          </div>
          <p className="font-black text-sm sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(totalExpense)}>
            {formatCurrency(totalExpense)}
          </p>
        </PressCard>

        <PressCard
          shadow="0 5px 0 0 #0369a1"
          shadowHover="0 3px 0 0 #0369a1"
          className="border-sky-400 bg-sky-500 text-white p-3.5 flex flex-col justify-between h-28 rounded-2xl"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-100">โอนย้าย</span>
            <Zap className="w-4 h-4 text-sky-100" />
          </div>
          <p className="font-black text-sm sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(totalTransfer)}>
            {formatCurrency(totalTransfer)}
          </p>
        </PressCard>

        {/* Net Card - Violet or Rose */}
        <PressCard
          shadow={net >= 0 ? '0 5px 0 0 #4c1d95' : '0 5px 0 0 #9f1239'}
          shadowHover={net >= 0 ? '0 3px 0 0 #4c1d95' : '0 3px 0 0 #9f1239'}
          className={cn(
            'text-white p-3.5 flex flex-col justify-between h-28 rounded-2xl border-2',
            net >= 0 ? 'border-violet-400 bg-violet-500' : 'border-rose-400 bg-rose-500'
          )}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/80">ยอดสุทธิ</span>
            <Zap className="w-4 h-4 text-white/85" />
          </div>
          <p className="font-black text-sm sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(net)}>
            {formatCurrency(net)}
          </p>
        </PressCard>
      </div>

      {/* ── 4. FILTER CAP CONTAINER ── */}
      <PressCard
        shadow="0 6px 0 0 #e5e5e5"
        shadowHover="0 3px 0 0 #e5e5e5"
        className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-3xl space-y-4"
      >
        {/* Search, Segmented filter, Collapsible Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar input wrapper */}
          <div className="relative flex-grow min-w-[200px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchRef}
              placeholder="ค้นหารายการ..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-[var(--quest-primary-container)] transition-colors placeholder:text-slate-400 dark:text-white"
            />
            {filter.search && (
              <button
                onClick={() => { setFilter({ ...filter, search: '' }); searchRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Segmented Type Filter pills */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border-2 border-slate-200 dark:border-slate-700/80 gap-1">
            {(['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'] as const).map((t) => {
              const active = filter.type === t
              return (
                <button
                  key={t}
                  onClick={() => setFilter({ ...filter, type: t, categoryId: '' })}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold transition-all duration-100 select-none border-b-2',
                    active
                      ? t === 'ALL'
                        ? 'bg-indigo-500 text-white border-indigo-700 shadow-[0_2px_0_0_#4338ca]'
                        : t === 'INCOME'
                          ? 'bg-emerald-500 text-white border-emerald-700 shadow-[0_2px_0_0_#047857]'
                          : t === 'EXPENSE'
                            ? 'bg-rose-500 text-white border-rose-700 shadow-[0_2px_0_0_#be123c]'
                            : 'bg-sky-500 text-white border-sky-700 shadow-[0_2px_0_0_#0369a1]'
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-700'
                  )}
                >
                  {t === 'ALL' ? 'ทั้งหมด' : t === 'INCOME' ? 'รายรับ' : t === 'EXPENSE' ? 'รายจ่าย' : 'โอนย้าย'}
                </button>
              )
            })}
          </div>

          {/* Toggle Collapsible Filters */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              'flex items-center gap-1.5 h-10 px-4 rounded-2xl font-bold text-xs border-2 transition-all select-none border-b-4',
              filtersOpen || hasExtra
                ? 'bg-[var(--quest-primary-container)]/10 border-[var(--quest-primary-container)] text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)] shadow-[0_2px_0_0_var(--quest-primary-container)]'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 shadow-[0_3px_0_0_#e5e5e5] dark:shadow-[0_3px_0_0_#020617] active:translate-y-[2px] active:border-b-2'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            ตัวกรองเพิ่มเติม
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--quest-primary-container)] text-white text-[9px] font-black leading-none flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={cn('w-3 h-3 opacity-60 transition-transform duration-200', filtersOpen && 'rotate-180')} />
          </button>

          {/* Reset Filter Button */}
          {hasExtra && (
            <button
              onClick={() => setFilter(INIT)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Collapsible content (Advanced Filters) */}
        {filtersOpen && (
          <div className="pt-4 border-t-2 border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Select Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
                หมวดหมู่การเงิน
              </label>
              <Select value={filter.categoryId || 'ALL'} onValueChange={(v) => setFilter({ ...filter, categoryId: !v || v === 'ALL' ? '' : v })}>
                <SelectTrigger className={cn(
                  'h-10 text-xs w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-bold rounded-xl focus:ring-0',
                  filter.categoryId ? 'border-[var(--quest-primary-container)] text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]' : 'text-slate-500',
                )}>
                  <SelectValue placeholder="ทุกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                  <SelectItem value="ALL">ทุกหมวดหมู่</SelectItem>
                  {visibleCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tag Selection Filter */}
            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
                  แท็กสัญลักษณ์
                </label>
                <Select value={filter.tag || 'ALL'} onValueChange={(v) => setFilter({ ...filter, tag: !v || v === 'ALL' ? '' : v })}>
                  <SelectTrigger className={cn(
                    'h-10 text-xs w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-bold rounded-xl focus:ring-0',
                    filter.tag ? 'border-[var(--quest-primary-container)] text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]' : 'text-slate-500',
                  )}>
                    <Tag className="w-3 h-3 mr-1 opacity-60 flex-shrink-0" />
                    <SelectValue placeholder="ทุกแท็ก" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    <SelectItem value="ALL">ทุกแท็ก</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>#{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Date Inputs */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
                กำหนดช่วงเวลาเอง
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filter.dateFrom}
                  onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none dark:text-white"
                />
                <input
                  type="date"
                  value={filter.dateTo}
                  onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Date presets horizontal scrolling chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {presets.map((p) => {
            const active = filter.dateFrom === p.from && filter.dateTo === p.to
            return (
              <button
                key={p.label}
                onClick={() => setFilter({ ...filter, dateFrom: p.from, dateTo: p.to })}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full border-2 text-xs font-black transition-all border-b-4 select-none',
                  active
                    ? 'bg-[var(--quest-primary-container)] text-white border-[var(--quest-primary)] shadow-[0_2px_0_0_var(--quest-primary)]'
                    : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 shadow-sm hover:translate-y-[1px]'
                )}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </PressCard>

      {/* ── 5. TRANSACTION GROUPED FEED ── */}
      <div className="space-y-2">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
          รายการภารกิจการเงิน
        </h3>
        <PressCard
          shadow="0 6px 0 0 #e5e5e5"
          shadowHover="0 3px 0 0 #e5e5e5"
          className="border-slate-200 dark:border-slate-800 overflow-hidden p-0 rounded-3xl bg-white dark:bg-slate-900"
        >
          {filtered.length > 0 ? (
            <TransactionGroupedList
              transactions={filtered}
              onEdit={handleEdit}
              className="rounded-none border-0 shadow-none bg-transparent"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
              <span className="text-5xl">🔍</span>
              <div className="space-y-1">
                <p className="font-black text-base text-slate-700 dark:text-slate-300">ไม่พบรายการที่ค้นหา</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  ทดลองเปลี่ยนตัวกรอง ค้นหาคำอื่น หรือเพิ่มรายการธุรกรรมใหม่
                </p>
              </div>
              <button
                onClick={handleOpenAdd}
                className="font-black text-xs px-4 py-2.5 rounded-2xl bg-[var(--quest-primary-container)] text-white border-2 border-[var(--quest-primary)] border-b-4 shadow-[0_2px_0_0_var(--quest-primary)] active:translate-y-[2px] active:border-b-2 hover:opacity-95 flex items-center gap-1.5 transition-all select-none"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3px]" /> เริ่มบันทึกธุรกรรม
              </button>
            </div>
          )}
        </PressCard>
      </div>

      {/* ── DIALOGS ── */}
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
