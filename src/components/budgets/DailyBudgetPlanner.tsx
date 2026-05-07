'use client'

import { useMemo } from 'react'
import { CalendarDays, TrendingDown, TrendingUp, Minus, Flame, CheckCircle2 } from 'lucide-react'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { formatCurrency, cn } from '@/lib/utils'
import { Budget } from '@/types'

interface BudgetWithSpent extends Budget {
  spent: number
  rollover?: number
}

interface Props {
  budgets: BudgetWithSpent[]
  month: number
  year: number
}

export function DailyBudgetPlanner({ budgets, month, year }: Props) {
  const { getCategoryById } = useCategoryStore()
  const { transactions } = useTransactionStore()

  const {
    daysInMonth,
    daysElapsed,
    daysRemaining,
    isCurrentMonth,
    todayStr,
  } = useMemo(() => {
    const now = new Date()
    const today = now.getDate()
    const days = new Date(year, month, 0).getDate()          // days in month
    const isCurrent = now.getMonth() + 1 === month && now.getFullYear() === year
    const elapsed  = isCurrent ? today : days                // days used
    const remaining = isCurrent ? days - today + 1 : 1      // including today
    const tStr = now.toISOString().slice(0, 10)
    return {
      daysInMonth: days,
      daysElapsed: elapsed,
      daysRemaining: remaining,
      isCurrentMonth: isCurrent,
      todayStr: tStr,
    }
  }, [month, year])

  const rows = useMemo(() => budgets.map((b) => {
    const cat = getCategoryById(b.categoryId)
    const effective = b.amount + (b.rollover ?? 0)
    const remaining = Math.max(0, effective - b.spent)

    // Daily allowance = remaining / days left (min 1 to avoid div-by-0)
    const dailyAllowance = remaining / Math.max(1, daysRemaining)

    // Original daily target = budget / days in month
    const originalDaily = b.amount / daysInMonth

    // Expected spent by today (linear pace)
    const expectedSpent = (effective / daysInMonth) * daysElapsed
    const onTrack = b.spent <= expectedSpent

    // Today's spending for this category
    const todaySpent = transactions
      .filter((t) =>
        t.categoryId === b.categoryId &&
        t.type === 'EXPENSE' &&
        t.date.slice(0, 10) === todayStr
      )
      .reduce((sum, t) => sum + t.amount, 0)

    // Status: over / at-limit / ok / zero
    const pct = effective > 0 ? (b.spent / effective) * 100 : 0

    return {
      b, cat, effective, remaining,
      dailyAllowance, originalDaily,
      onTrack, todaySpent, pct,
    }
  }), [budgets, getCategoryById, daysRemaining, daysInMonth, daysElapsed, transactions, todayStr])

  if (budgets.length === 0) return null

  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0)
  const totalDailyAllowance = rows.reduce((s, r) => s + r.dailyAllowance, 0)
  const totalTodaySpent = rows.reduce((s, r) => s + r.todaySpent, 0)
  const overBudgetCount = rows.filter((r) => r.pct >= 100).length
  const overPaceCount = rows.filter((r) => !r.onTrack && r.pct < 100).length

  return (
    <div className="space-y-3">
      {/* ── Summary header card ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-gray-800 dark:text-white/80">แผนงบประมาณรายวัน</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              เหลือ {daysRemaining} วัน
            </div>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5">คงเหลือรวม</p>
              <p className="text-base font-bold text-gray-800 dark:text-white/80">
                {formatCurrency(totalRemaining)}
              </p>
            </div>
            <div className="text-center border-x border-gray-100 dark:border-white/[0.05]">
              <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5">ใช้ได้วันละ</p>
              <p className="text-base font-bold text-primary">
                {formatCurrency(totalDailyAllowance)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5">ใช้ไปวันนี้</p>
              <p className={cn(
                'text-base font-bold',
                totalTodaySpent > totalDailyAllowance ? 'text-red-500' : 'text-gray-800 dark:text-white/80'
              )}>
                {formatCurrency(totalTodaySpent)}
              </p>
            </div>
          </div>
        </div>

        {/* Alert bar */}
        {isCurrentMonth && (overBudgetCount > 0 || overPaceCount > 0) && (
          <div className={cn(
            'px-5 py-2.5 flex items-center gap-2 text-xs',
            overBudgetCount > 0
              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
          )}>
            <Flame className="w-3.5 h-3.5 shrink-0" />
            {overBudgetCount > 0
              ? `${overBudgetCount} หมวดหมู่เกินงบแล้ว · ระวังการใช้จ่าย`
              : `${overPaceCount} หมวดหมู่ใช้เร็วกว่าแผน · ลองชะลอดู`
            }
          </div>
        )}
      </div>

      {/* ── Per-category rows ── */}
      <div className="divide-y divide-gray-100 dark:divide-white/[0.05] border border-gray-200 dark:border-white/[0.07] rounded-2xl overflow-hidden bg-white dark:bg-white/[0.02]">
        {rows.map(({ b, cat, effective, remaining, dailyAllowance, originalDaily, onTrack, todaySpent, pct }) => {
          const isOver = pct >= 100
          const barColor = pct < 70 ? 'bg-emerald-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500'
          const todayOverDaily = todaySpent > dailyAllowance && dailyAllowance > 0

          return (
            <div key={b.id} className="px-4 py-4">
              {/* Row header */}
              <div className="flex items-center gap-3 mb-3">
                {cat && (
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                    style={{ backgroundColor: cat.color + '18' }}
                  >
                    <CategoryIcon name={cat.icon} className="w-4.5 h-4.5" style={{ color: cat.color }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/80 truncate">
                    {cat?.name ?? 'ไม่ทราบ'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
                    งบ {formatCurrency(effective)} · เหลือ {formatCurrency(remaining)}
                  </p>
                </div>
                {/* On-track badge */}
                {isCurrentMonth && !isOver && (
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0',
                    onTrack
                      ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  )}>
                    {onTrack
                      ? <><CheckCircle2 className="w-3 h-3" /> ตามแผน</>
                      : <><TrendingDown className="w-3 h-3" /> ใช้เร็วกว่าแผน</>
                    }
                  </div>
                )}
                {isOver && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 bg-red-50 dark:bg-red-500/15 text-red-500">
                    <Flame className="w-3 h-3" /> เกินงบ
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden mb-3">
                <div
                  className={cn('h-full rounded-full transition-all', barColor)}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>

              {/* Daily allowance section */}
              <div className="grid grid-cols-3 gap-2">
                {/* Daily allowance (remaining) */}
                <div className="rounded-xl bg-primary/5 dark:bg-primary/10 px-3 py-2.5 text-center">
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5 leading-tight">
                    ใช้ได้/วัน<br/>
                    <span className="text-[9px]">(จากยอดคงเหลือ)</span>
                  </p>
                  <p className={cn(
                    'text-sm font-bold',
                    isOver ? 'text-red-500' : 'text-primary'
                  )}>
                    {isOver ? '฿0' : formatCurrency(dailyAllowance)}
                  </p>
                </div>

                {/* Original daily target */}
                <div className="rounded-xl bg-gray-50 dark:bg-white/[0.04] px-3 py-2.5 text-center">
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5 leading-tight">
                    เป้าหมาย/วัน<br/>
                    <span className="text-[9px]">(งบ ÷ {daysInMonth} วัน)</span>
                  </p>
                  <p className="text-sm font-bold text-gray-600 dark:text-white/50">
                    {formatCurrency(originalDaily)}
                  </p>
                </div>

                {/* Today's spending */}
                <div className={cn(
                  'rounded-xl px-3 py-2.5 text-center',
                  isCurrentMonth
                    ? todayOverDaily
                      ? 'bg-red-50 dark:bg-red-500/10'
                      : todaySpent > 0
                        ? 'bg-emerald-50 dark:bg-emerald-500/10'
                        : 'bg-gray-50 dark:bg-white/[0.04]'
                    : 'bg-gray-50 dark:bg-white/[0.04]'
                )}>
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5 leading-tight">
                    ใช้ไปวันนี้<br/>
                    <span className="text-[9px] opacity-0">-</span>
                  </p>
                  <p className={cn(
                    'text-sm font-bold',
                    !isCurrentMonth
                      ? 'text-gray-400 dark:text-white/25'
                      : todayOverDaily
                        ? 'text-red-500'
                        : todaySpent > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-400 dark:text-white/30'
                  )}>
                    {isCurrentMonth ? formatCurrency(todaySpent) : '—'}
                  </p>
                </div>
              </div>

              {/* Today status hint */}
              {isCurrentMonth && todaySpent > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  {todayOverDaily ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-red-400 shrink-0" />
                      <p className="text-[11px] text-red-400">
                        วันนี้ใช้เกิน {formatCurrency(todaySpent - dailyAllowance)} จากวงเงินรายวัน
                      </p>
                    </>
                  ) : (
                    <>
                      <Minus className="w-3 h-3 text-emerald-500 shrink-0" />
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        วันนี้เหลือ {formatCurrency(dailyAllowance - todaySpent)} จากวงเงินรายวัน
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
