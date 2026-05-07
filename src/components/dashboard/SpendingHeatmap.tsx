'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Flame, CalendarDays, X } from 'lucide-react'
import { cn, formatCurrency, THAI_MONTHS_SHORT } from '@/lib/utils'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { Transaction } from '@/types'

/* ── Types ──────────────────────────────────────────────────── */

type Mode = 'expense' | 'income'

interface DayData {
  date:   string        // YYYY-MM-DD
  day:    number        // day of month
  month:  number        // 0-indexed
  amount: number
  txns:   Transaction[]
}

/* ── Color scale (5 levels) ─────────────────────────────────── */

function getLevel(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (amount === 0 || max === 0) return 0
  const r = amount / max
  if (r > 0.75) return 4
  if (r > 0.5)  return 3
  if (r > 0.25) return 2
  return 1
}

const EXPENSE_COLORS = [
  'bg-gray-100 dark:bg-white/[0.04]',                                        // 0
  'bg-violet-100 dark:bg-violet-900/40',                                     // 1
  'bg-violet-300 dark:bg-violet-700/60',                                     // 2
  'bg-violet-500 dark:bg-violet-500',                                        // 3
  'bg-violet-700 dark:bg-violet-400',                                        // 4
]
const INCOME_COLORS = [
  'bg-gray-100 dark:bg-white/[0.04]',
  'bg-emerald-100 dark:bg-emerald-900/40',
  'bg-emerald-300 dark:bg-emerald-700/60',
  'bg-emerald-500 dark:bg-emerald-500',
  'bg-emerald-700 dark:bg-emerald-400',
]

const DOW_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

/* ── Day-detail drawer ──────────────────────────────────────── */

function DayDetail({
  day, onClose,
}: {
  day: DayData | null
  onClose: () => void
}) {
  const { getCategoryById } = useCategoryStore()
  if (!day) return null

  const d     = new Date(day.date)
  const label = `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`

  return (
    <div className={cn(
      'border-t border-gray-100 dark:border-white/[0.06]',
      'bg-gray-50/50 dark:bg-white/[0.02]',
      'rounded-b-xl px-4 py-3',
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-white/80">{label}</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300">
            {formatCurrency(day.amount)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {day.txns.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-white/30 py-2">ไม่มีรายการในวันนี้</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {day.txns.map((t) => {
            const cat = getCategoryById(t.categoryId)
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.05]"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (cat?.color ?? '#94a3b8') + '20' }}
                >
                  <CategoryIcon name={cat?.icon ?? 'Circle'} className="w-3.5 h-3.5" style={{ color: cat?.color ?? '#94a3b8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-white/70 truncate">{t.description}</p>
                  {cat && <p className="text-[10px] text-gray-400 dark:text-white/30">{cat.name}</p>}
                </div>
                <span className={cn(
                  'text-xs font-semibold flex-shrink-0',
                  t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
                )}>
                  {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────── */

export function SpendingHeatmap() {
  const { transactions } = useTransactionStore()
  const now = new Date()

  const [year, setYear]         = useState(now.getFullYear())
  const [mode, setMode]         = useState<Mode>('expense')
  const [selected, setSelected] = useState<DayData | null>(null)

  /* ── Build day map ── */
  const { dayMap, maxAmount, stats } = useMemo(() => {
    const map: Record<string, DayData> = {}

    // Fill every day of the year
    const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365
    for (let d = 0; d < daysInYear; d++) {
      const date = new Date(year, 0, d + 1)
      const key  = date.toISOString().slice(0, 10)
      map[key] = { date: key, day: date.getDate(), month: date.getMonth(), amount: 0, txns: [] }
    }

    // Aggregate transactions
    transactions.forEach((t) => {
      if (!t.date.startsWith(String(year))) return
      if (mode === 'expense' && t.type !== 'EXPENSE') return
      if (mode === 'income'  && t.type !== 'INCOME')  return
      const key = t.date.slice(0, 10)
      if (!map[key]) return
      map[key].amount += t.amount
      map[key].txns.push(t)
    })

    const amounts  = Object.values(map).map((d) => d.amount)
    const maxAmount = Math.max(0, ...amounts)

    // Stats
    const activeDays = amounts.filter((a) => a > 0).length
    const totalAmount = amounts.reduce((s, a) => s + a, 0)

    // Longest streak (consecutive days with transactions)
    const keys = Object.keys(map).sort()
    let maxStreak = 0, curStreak = 0
    keys.forEach((k) => {
      if (map[k].amount > 0) { curStreak++; maxStreak = Math.max(maxStreak, curStreak) }
      else curStreak = 0
    })

    // Peak month
    const monthTotals = Array(12).fill(0)
    Object.values(map).forEach((d) => { monthTotals[d.month] += d.amount })
    const peakMonth = monthTotals.indexOf(Math.max(...monthTotals))

    return { dayMap: map, maxAmount, stats: { activeDays, totalAmount, maxStreak, peakMonth, monthTotals } }
  }, [transactions, year, mode])

  /* ── Build weeks grid ── */
  const { weeks, monthOffsets } = useMemo(() => {
    const days = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))

    // First day of year — what weekday (0=Sun, remap to 0=Mon)
    const firstDow = (new Date(year, 0, 1).getDay() + 6) % 7

    // Pad start with nulls
    const padded: (DayData | null)[] = [
      ...Array(firstDow).fill(null),
      ...days,
    ]

    // Group into weeks of 7
    const weeks: (DayData | null)[][] = []
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7))
    }
    // Last row may be shorter — pad to 7
    const last = weeks[weeks.length - 1]
    while (last.length < 7) last.push(null)

    // Month label offsets (column index where each month starts)
    const monthOffsets: { col: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, col) => {
      week.forEach((d) => {
        if (d && d.month !== lastMonth) {
          if (lastMonth === -1 || d.day <= 7) {
            monthOffsets.push({ col, label: THAI_MONTHS_SHORT[d.month] })
            lastMonth = d.month
          }
        }
      })
    })

    return { weeks, monthOffsets }
  }, [dayMap, year])

  const colors = mode === 'expense' ? EXPENSE_COLORS : INCOME_COLORS
  const accent = mode === 'expense' ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      'bg-white dark:bg-white/[0.02]',
      'border-gray-200 dark:border-white/[0.07]',
    )}>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-white/[0.05]">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setYear(y => y - 1); setSelected(null) }}
              className="p-1 rounded-md text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[48px] text-center">
              {year + 543}
            </span>
            <button
              onClick={() => { setYear(y => Math.min(now.getFullYear(), y + 1)); setSelected(null) }}
              disabled={year >= now.getFullYear()}
              className="p-1 rounded-md text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-white/[0.05]">
            <button
              onClick={() => { setMode('expense'); setSelected(null) }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                mode === 'expense'
                  ? 'bg-white dark:bg-violet-600 text-violet-700 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-white/40 hover:text-gray-700',
              )}
            >
              <TrendingDown className="w-3 h-3" /> รายจ่าย
            </button>
            <button
              onClick={() => { setMode('income'); setSelected(null) }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                mode === 'income'
                  ? 'bg-white dark:bg-emerald-600 text-emerald-700 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-white/40 hover:text-gray-700',
              )}
            >
              <TrendingUp className="w-3 h-3" /> รายรับ
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="text-right">
          <p className="text-xs text-gray-400 dark:text-white/30">{mode === 'expense' ? 'รายจ่ายรวม' : 'รายรับรวม'}</p>
          <p className={cn('text-sm font-bold', accent)}>{formatCurrency(stats.totalAmount)}</p>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-0 border-b border-gray-100 dark:border-white/[0.05]">
        {[
          { icon: CalendarDays, label: 'วันที่มีรายการ',  value: `${stats.activeDays} วัน`                              },
          { icon: Flame,        label: 'Streak ยาวสุด',  value: `${stats.maxStreak} วัน`                               },
          { icon: TrendingDown, label: 'เดือนที่สูงสุด', value: stats.totalAmount > 0 ? THAI_MONTHS_SHORT[stats.peakMonth] : '—' },
        ].map(({ icon: Icon, label, value }, i) => (
          <div
            key={label}
            className={cn(
              'flex flex-col items-center py-3 px-2 text-center',
              i < 2 && 'border-r border-gray-100 dark:border-white/[0.05]',
            )}
          >
            <Icon className={cn('w-3.5 h-3.5 mb-1', accent)} />
            <p className="text-[11px] text-gray-400 dark:text-white/30">{label}</p>
            <p className="text-sm font-bold text-gray-800 dark:text-white/80">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Heatmap grid ── */}
      <div className="px-4 pt-4 pb-3 overflow-x-auto">
        {/* Month labels */}
        <div className="relative h-5 mb-1" style={{ width: `${weeks.length * 14}px` }}>
          {monthOffsets.map(({ col, label }) => (
            <span
              key={label}
              className="absolute text-[10px] text-gray-400 dark:text-white/30 font-medium"
              style={{ left: `${col * 14}px` }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex gap-0.5">
          {/* DOW labels */}
          <div className="flex flex-col gap-0.5 mr-1.5 flex-shrink-0">
            {DOW_LABELS.map((d, i) => (
              <div key={d} className={cn(
                'w-5 h-[11px] flex items-center',
                (i % 2 === 0) ? 'text-[9px] text-gray-300 dark:text-white/20' : 'invisible',
              )}>
                {i % 2 === 0 ? d : ''}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => {
                  if (!day) {
                    return <div key={`pad-${di}`} className="w-[11px] h-[11px]" />
                  }
                  const level = getLevel(day.amount, maxAmount)
                  const isSelected = selected?.date === day.date
                  return (
                    <button
                      key={day.date}
                      onClick={() => setSelected(isSelected ? null : day)}
                      title={day.amount > 0
                        ? `${day.date}: ${formatCurrency(day.amount)} (${day.txns.length} รายการ)`
                        : day.date
                      }
                      className={cn(
                        'w-[11px] h-[11px] rounded-[2px] transition-all hover:scale-125 hover:z-10 relative',
                        colors[level],
                        isSelected && 'ring-2 ring-offset-1 ring-violet-500 dark:ring-violet-400 dark:ring-offset-gray-900 scale-125 z-10',
                        // Today highlight
                        day.date === now.toISOString().slice(0, 10) && !isSelected && 'ring-1 ring-blue-400 ring-offset-1 dark:ring-offset-gray-900',
                      )}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10px] text-gray-400 dark:text-white/25">น้อย</span>
          {colors.map((cls, i) => (
            <div key={i} className={cn('w-[11px] h-[11px] rounded-[2px]', cls)} />
          ))}
          <span className="text-[10px] text-gray-400 dark:text-white/25">มาก</span>

          {/* Month bar sparkline */}
          <div className="ml-auto hidden sm:flex items-end gap-0.5 h-5">
            {stats.monthTotals.map((amt, i) => {
              const maxMo = Math.max(...stats.monthTotals)
              const h = maxMo > 0 ? Math.max(2, Math.round((amt / maxMo) * 20)) : 2
              return (
                <div
                  key={i}
                  className={cn('w-3 rounded-t-sm transition-all', mode === 'expense' ? 'bg-violet-400/60 dark:bg-violet-500/50' : 'bg-emerald-400/60 dark:bg-emerald-500/50')}
                  style={{ height: `${h}px` }}
                  title={`${THAI_MONTHS_SHORT[i]}: ${formatCurrency(amt)}`}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Day detail ── */}
      {selected && (
        <DayDetail day={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
