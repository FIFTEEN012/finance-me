'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { THAI_MONTHS, formatCurrency } from '@/lib/utils'

const DAYS_OF_WEEK = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

interface DayCell {
  date: number        // day of month (1-28/29/30/31), 0 = padding
  items: DayItem[]
}

interface DayItem {
  id: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  categoryIcon: string
  categoryColor: string
  frequency: string
}

export function RecurringCalendar() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const { recurrings } = useRecurringStore()
  const { getCategoryById } = useCategoryStore()

  /* ── Only active recurrings for this view ── */
  const active = recurrings.filter((r) => {
    if (!r.isActive) return false
    // yearly: only show in the month that matches start date's month
    if (r.frequency === 'yearly') {
      const start = new Date(r.startDate)
      return start.getMonth() === month
    }
    return true
  })

  /* ── Build calendar grid ── */
  const daysInMonth   = new Date(year, month + 1, 0).getDate()
  const firstWeekDay  = new Date(year, month, 1).getDay()  // 0=Sun

  const cells: DayCell[] = []
  // Leading empty cells
  for (let i = 0; i < firstWeekDay; i++) {
    cells.push({ date: 0, items: [] })
  }
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const items: DayItem[] = active
      .filter((r) => r.dayOfMonth === d || (d === daysInMonth && r.dayOfMonth > daysInMonth))
      .map((r) => {
        const cat = getCategoryById(r.categoryId)
        return {
          id: r.id,
          description: r.description,
          amount: r.amount,
          type: r.type,
          categoryIcon: cat?.icon ?? 'Circle',
          categoryColor: cat?.color ?? '#94a3b8',
          frequency: r.frequency,
        }
      })
    cells.push({ date: d, items })
  }

  /* ── Navigation ── */
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else              setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else               setMonth(m => m + 1)
  }

  /* ── Month totals ── */
  const monthlyIncome  = active.filter(r => r.type === 'INCOME').reduce((s, r) => s + (r.frequency === 'monthly' ? r.amount : r.amount / 12), 0)
  const monthlyExpense = active.filter(r => r.type === 'EXPENSE').reduce((s, r) => s + (r.frequency === 'monthly' ? r.amount : r.amount / 12), 0)

  /* ── Week rows ── */
  const weeks: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  // Ensure last row fills to 7
  const lastRow = weeks[weeks.length - 1]
  while (lastRow.length < 7) lastRow.push({ date: 0, items: [] })

  const today = now.getDate()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month

  return (
    <div className="space-y-4">
      {/* Month header + totals */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-white/40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/80 min-w-[120px] text-center">
            {THAI_MONTHS[month]} {year + 543}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-white/40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Monthly summary chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
            <TrendingUp className="w-3 h-3 text-violet-500" />
            <span className="text-xs font-medium text-violet-700 dark:text-violet-400">{formatCurrency(monthlyIncome)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
            <TrendingDown className="w-3 h-3 text-red-500" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">{formatCurrency(monthlyExpense)}</span>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
        {/* Day labels */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-white/[0.03]">
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-medium text-gray-400 dark:text-white/30">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 divide-x divide-gray-100 dark:divide-white/[0.04]">
              {week.map((cell, di) => {
                const isToday = isCurrentMonth && cell.date === today
                return (
                  <div
                    key={di}
                    className={cn(
                      'min-h-[72px] p-1.5 bg-white dark:bg-transparent',
                      cell.date === 0 && 'bg-gray-50/50 dark:bg-white/[0.01]',
                    )}
                  >
                    {cell.date > 0 && (
                      <>
                        {/* Day number */}
                        <div className="flex justify-end mb-1">
                          <span className={cn(
                            'text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full',
                            isToday
                              ? 'bg-violet-600 text-white'
                              : 'text-gray-400 dark:text-white/30',
                          )}>
                            {cell.date}
                          </span>
                        </div>

                        {/* Events */}
                        <div className="space-y-0.5">
                          {cell.items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                'flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-medium truncate',
                                item.type === 'INCOME'
                                  ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                                  : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
                              )}
                            >
                              <CategoryIcon
                                name={item.categoryIcon}
                                className="w-2.5 h-2.5 flex-shrink-0"
                                style={{ color: item.categoryColor }}
                              />
                              <span className="truncate">{item.description}</span>
                            </div>
                          ))}
                          {cell.items.length > 3 && (
                            <div className="text-[9px] text-gray-400 dark:text-white/25 pl-1">
                              +{cell.items.length - 3} อื่นๆ
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-white/30">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-violet-100 dark:bg-violet-500/20" />
          <span>รายรับ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-red-100 dark:bg-red-500/20" />
          <span>รายจ่าย</span>
        </div>
        {active.some(r => r.frequency === 'yearly') && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20">ปีละครั้ง</span>
          </div>
        )}
      </div>

      {/* Week summary table */}
      {active.length > 0 && (
        <WeekSummary cells={cells} daysInMonth={daysInMonth} />
      )}
    </div>
  )
}

/* ── Week-by-week summary ─────────────────────────────────────────── */

function WeekSummary({ cells, daysInMonth }: { cells: DayCell[]; daysInMonth: number }) {
  const actualDays = cells.filter(c => c.date > 0)

  // Group into weeks of 7
  const weeks: DayCell[][] = []
  for (let i = 0; i < actualDays.length; i += 7) {
    weeks.push(actualDays.slice(i, Math.min(i + 7, actualDays.length)))
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/[0.04]">
        <p className="text-xs font-semibold text-gray-500 dark:text-white/40">สรุปรายสัปดาห์</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
        {weeks.map((week, wi) => {
          const allItems = week.flatMap(c => c.items)
          const weekIncome  = allItems.filter(i => i.type === 'INCOME').reduce((s, i) => s + i.amount, 0)
          const weekExpense = allItems.filter(i => i.type === 'EXPENSE').reduce((s, i) => s + i.amount, 0)
          const start = week[0].date
          const end   = week[week.length - 1].date

          return (
            <div key={wi} className="flex items-center px-4 py-2.5 bg-white dark:bg-transparent">
              <span className="text-xs text-gray-500 dark:text-white/40 w-20 flex-shrink-0">
                {start}–{end}
              </span>
              <div className="flex-1 flex items-center gap-3">
                {weekIncome > 0 && (
                  <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                    +{formatCurrency(weekIncome)}
                  </span>
                )}
                {weekExpense > 0 && (
                  <span className="text-xs font-medium text-red-500 dark:text-red-400">
                    -{formatCurrency(weekExpense)}
                  </span>
                )}
                {weekIncome === 0 && weekExpense === 0 && (
                  <span className="text-xs text-gray-300 dark:text-white/20">ไม่มีรายการ</span>
                )}
              </div>
              <span className={cn(
                'text-xs font-semibold ml-auto',
                weekIncome - weekExpense >= 0
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-red-500 dark:text-red-400',
              )}>
                {weekIncome - weekExpense >= 0 ? '+' : ''}
                {formatCurrency(weekIncome - weekExpense)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
