'use client'

import { ArrowLeftRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency, formatDateShort, cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export function RecentTransactions({ className }: { className?: string }) {
  const { transactions } = useTransactionStore()
  const { getCategoryById } = useCategoryStore()

  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <Card className={cn('border shadow-none', className)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">รายการล่าสุด</CardTitle>
        <Link href="/transactions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs text-gray-500 dark:text-gray-400 h-7')}>
          ดูทั้งหมด
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ArrowLeftRight className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">ยังไม่มีรายการ</p>
          </div>
        ) : (
          recent.map((tx) => {
            const cat = getCategoryById(tx.categoryId)
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {cat && (
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: cat.color + '20' }}
                    >
                      <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDateShort(tx.date)}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold ml-3 shrink-0',
                    tx.type === 'INCOME' ? 'text-violet-600' : 'text-red-500'
                  )}
                >
                  {tx.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </span>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
