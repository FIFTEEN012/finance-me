'use client'

import { useMemo } from 'react'
import { CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency, calcRollover, cn } from '@/lib/utils'
import { THAI_MONTHS } from '@/lib/utils'

interface BudgetVsActualProps {
  year: number
  month: number | null  // null = use current month
}

interface RowData {
  categoryId: string
  categoryName: string
  categoryColor: string
  budget: number
  rollover: number
  effective: number
  spent: number
  remaining: number
  pct: number
  isOver: boolean
}

export function BudgetVsActual({ year, month }: BudgetVsActualProps) {
  const { getBudgetsByMonth } = useBudgetStore()
  const { getCategoryById } = useCategoryStore()
  const { transactions } = useTransactionStore()

  const now = new Date()
  const targetMonth = month ?? now.getMonth() + 1
  const targetYear = month !== null ? year : now.getFullYear()

  const rows: RowData[] = useMemo(() => {
    const budgets = getBudgetsByMonth(targetMonth, targetYear)
    return budgets
      .map((b) => {
        const cat = getCategoryById(b.categoryId)
        const rollover = calcRollover(b, transactions, getBudgetsByMonth)
        const effective = b.amount + rollover
        const spent = transactions
          .filter((t) => {
            const d = new Date(t.date)
            return (
              t.categoryId === b.categoryId &&
              t.type === 'EXPENSE' &&
              d.getMonth() + 1 === targetMonth &&
              d.getFullYear() === targetYear
            )
          })
          .reduce((s, t) => s + t.amount, 0)
        const remaining = effective - spent
        const pct = effective > 0 ? (spent / effective) * 100 : 0
        return {
          categoryId: b.categoryId,
          categoryName: cat?.name ?? 'ไม่ทราบ',
          categoryColor: cat?.color ?? '#94a3b8',
          budget: b.amount,
          rollover,
          effective,
          spent,
          remaining,
          pct,
          isOver: spent > effective,
        }
      })
      .sort((a, b) => b.pct - a.pct)
  }, [getBudgetsByMonth, getCategoryById, transactions, targetMonth, targetYear])

  const totalBudget = rows.reduce((s, r) => s + r.effective, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const totalRemaining = totalBudget - totalSpent
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const overCount = rows.filter((r) => r.isOver).length

  const monthLabel = `${THAI_MONTHS[targetMonth - 1]} ${targetYear + 543}`

  function StatusIcon({ pct, isOver }: { pct: number; isOver: boolean }) {
    if (isOver) return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
    if (pct >= 80) return <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
    return <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />
  }

  function barColor(pct: number, isOver: boolean) {
    if (isOver) return 'bg-red-500'
    if (pct >= 80) return 'bg-yellow-500'
    return 'bg-violet-500'
  }

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            งบประมาณ vs จริง · {monthLabel}
          </CardTitle>
          {month === null && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Info className="w-3 h-3" /> แสดงเดือนปัจจุบัน
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
            ไม่มีงบประมาณสำหรับ{monthLabel}
          </p>
        ) : (
          <>
            {/* Summary strip */}
            <div className={cn(
              'grid grid-cols-3 gap-3 rounded-xl p-3 text-center',
              totalPct > 100 ? 'bg-red-50 dark:bg-red-900/20' : totalPct >= 80 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-violet-50 dark:bg-violet-900/20'
            )}>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">ตั้งงบรวม</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatCurrency(totalBudget)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">ใช้จ่ายจริง</p>
                <p className={cn('text-sm font-bold', totalSpent > totalBudget ? 'text-red-500' : 'text-gray-800 dark:text-gray-200')}>
                  {formatCurrency(totalSpent)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                  {totalRemaining >= 0 ? 'คงเหลือ' : 'เกินงบ'}
                </p>
                <p className={cn('text-sm font-bold', totalRemaining < 0 ? 'text-red-500' : 'text-violet-600 dark:text-violet-400')}>
                  {totalRemaining < 0 ? '-' : ''}{formatCurrency(Math.abs(totalRemaining))}
                </p>
              </div>
            </div>

            {overCount > 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                {overCount} หมวดหมู่เกินงบประมาณ
              </p>
            )}

            {/* Row list */}
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.categoryId}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusIcon pct={row.pct} isOver={row.isOver} />
                    <span className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.categoryColor }} />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{row.categoryName}</span>
                      {row.rollover > 0 && (
                        <span className="text-[10px] text-blue-500 font-medium flex-shrink-0">
                          +{formatCurrency(row.rollover)}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                      <span className={cn('font-semibold', row.isOver ? 'text-red-500' : 'text-gray-800 dark:text-gray-200')}>
                        {formatCurrency(row.spent)}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">/ {formatCurrency(row.effective)}</span>
                      <span className={cn(
                        'w-12 text-right font-medium',
                        row.isOver ? 'text-red-500' : row.pct >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-violet-600 dark:text-violet-400'
                      )}>
                        {row.pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden ml-6">
                    <div
                      className={cn('h-full rounded-full transition-all', barColor(row.pct, row.isOver))}
                      style={{ width: `${Math.min(row.pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between ml-6 mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                    <span>{row.isOver ? `เกินงบ ${formatCurrency(Math.abs(row.remaining))}` : `คงเหลือ ${formatCurrency(row.remaining)}`}</span>
                    <span>{row.isOver ? `+${(row.pct - 100).toFixed(0)}%` : ''}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Overall progress */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span className="font-medium">ภาพรวมทั้งหมด</span>
                <span className={cn('font-semibold', totalPct > 100 ? 'text-red-500' : totalPct >= 80 ? 'text-yellow-600' : 'text-violet-600')}>
                  {totalPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', barColor(totalPct, totalSpent > totalBudget))}
                  style={{ width: `${Math.min(totalPct, 100)}%` }}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
