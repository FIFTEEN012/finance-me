'use client'

import { PiggyBank } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency, cn, calcRollover } from '@/lib/utils'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export function BudgetProgressList({ className }: { className?: string }) {
  const { getBudgetsByMonth, getBudgetsByMonth: getBudgetsByMonthFn } = useBudgetStore()
  const { getCategoryById } = useCategoryStore()
  const { transactions } = useTransactionStore()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const budgets = getBudgetsByMonth(month, year)

  const budgetsWithSpent = budgets.map((b) => {
    const spent = transactions
      .filter((t) => {
        const d = new Date(t.date)
        return (
          t.categoryId === b.categoryId &&
          t.type === 'EXPENSE' &&
          d.getMonth() + 1 === month &&
          d.getFullYear() === year
        )
      })
      .reduce((sum, t) => sum + t.amount, 0)
    const rollover = calcRollover(b, transactions, getBudgetsByMonthFn)
    return { ...b, spent, rollover }
  })

  return (
    <Card className={cn('border shadow-none', className)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">งบประมาณเดือนนี้</CardTitle>
        <Link href="/budgets" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs text-gray-500 dark:text-gray-400 h-7')}>
          จัดการ
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {budgetsWithSpent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PiggyBank className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">ยังไม่ได้ตั้งงบประมาณ</p>
            <Link href="/budgets" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs text-violet-600 mt-1')}>
              ตั้งงบประมาณ
            </Link>
          </div>
        ) : (
          budgetsWithSpent.map((b) => {
            const cat = getCategoryById(b.categoryId)
            const effective = b.amount + b.rollover
            const pct = effective > 0 ? Math.min((b.spent / effective) * 100, 100) : 0
            const isOver = b.spent > effective
            const color = pct < 70 ? 'bg-violet-500' : pct < 90 ? 'bg-yellow-500' : 'bg-red-500'
            return (
              <div key={b.id}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{cat?.name ?? 'ไม่ทราบ'}</span>
                    {b.rollover > 0 && (
                      <span className="text-[10px] text-blue-500 font-medium">+{formatCurrency(b.rollover)}</span>
                    )}
                  </div>
                  <span className={cn('text-xs font-medium', isOver ? 'text-red-500' : 'text-gray-500 dark:text-gray-400')}>
                    {formatCurrency(b.spent)} / {formatCurrency(effective)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', color)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
