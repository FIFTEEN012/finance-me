'use client'

import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
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
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-gray-400 dark:text-gray-500">ไม่มีข้อมูล</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-1.5 overflow-auto max-h-48">
              {data.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-700 dark:text-gray-300 text-xs">{d.name}</span>
                  </span>
                  <div className="text-right ml-2">
                    <span className="font-medium text-xs text-gray-900 dark:text-gray-100">{formatCurrency(d.value)}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
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
