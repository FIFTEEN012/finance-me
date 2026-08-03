'use client'

import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency } from '@/lib/utils'
import { TransactionType } from '@/types'

interface CategoryBreakdownProps {
  year: number
  month: number | null
}

export function CategoryBreakdown({ year, month }: CategoryBreakdownProps) {
  const [activeType, setActiveType] = useState<TransactionType>('EXPENSE')
  const { transactions } = useTransactionStore()
  const { getCategoryById } = useCategoryStore()

  const data = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {}
    transactions
      .filter((t) => {
        const d = new Date(t.date)
        const sameYear = d.getFullYear() === year
        const sameMonth = month === null || d.getMonth() + 1 === month
        return t.type === activeType && sameYear && sameMonth
      })
      .forEach((t) => {
        const cat = getCategoryById(t.categoryId)
        if (!cat) return
        if (!map[cat.id]) map[cat.id] = { name: cat.name, value: 0, color: cat.color }
        map[cat.id].value += t.amount
      })
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [transactions, getCategoryById, activeType, year, month])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card className="overflow-hidden border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">แยกตามหมวดหมู่</CardTitle>
          <div className="flex gap-1">
            {(['EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeType === t
                    ? t === 'EXPENSE'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-violet-100 text-violet-700'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t === 'EXPENSE' ? 'รายจ่าย' : 'รายรับ'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-gray-400 dark:text-gray-500">ไม่มีข้อมูล</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(150px,0.9fr)_minmax(0,1.1fr)]">
            <div className="min-w-0">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="min-w-0 space-y-1.5 overflow-y-auto pr-1 max-h-48">
              {data.map((d, i) => (
                <div key={i} className="flex min-w-0 items-center justify-between gap-2 py-1 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="truncate text-xs text-gray-700 dark:text-gray-300">{d.name}</span>
                  </span>
                  <div className="ml-2 flex-shrink-0 text-right">
                    <span className="block text-xs font-medium text-gray-900 dark:text-gray-100">{formatCurrency(d.value)}</span>
                    <span className="block text-xs text-gray-400 dark:text-gray-500">
                      ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
