'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency, cn } from '@/lib/utils'

export function CategoryPieChart({ className }: { className?: string }) {
  const { transactions } = useTransactionStore()
  const { getCategoryById } = useCategoryStore()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const data = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {}
    transactions
      .filter((t) => {
        const d = new Date(t.date)
        return (
          t.type === 'EXPENSE' &&
          d.getMonth() + 1 === month &&
          d.getFullYear() === year
        )
      })
      .forEach((t) => {
        const cat = getCategoryById(t.categoryId)
        if (!cat) return
        if (!map[cat.id]) {
          map[cat.id] = { name: cat.name, value: 0, color: cat.color }
        }
        map[cat.id].value += t.amount
      })
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [transactions, getCategoryById, month, year])

  if (data.length === 0) {
    return (
      <Card className={cn('border shadow-none', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">รายจ่ายตามหมวดหมู่เดือนนี้</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-sm text-gray-400 dark:text-gray-500">ยังไม่มีรายจ่ายเดือนนี้</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border shadow-none', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">รายจ่ายตามหมวดหมู่เดือนนี้</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
