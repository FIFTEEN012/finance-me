'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/useTransactionStore'
import { THAI_MONTHS_SHORT, formatCurrency } from '@/lib/utils'

export function IncomeExpenseChart() {
  const { getSumByTypeAndMonth } = useTransactionStore()

  const data = useMemo(() => {
    const now = new Date()
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      result.push({
        name: THAI_MONTHS_SHORT[d.getMonth()],
        รายรับ: getSumByTypeAndMonth('INCOME', m, y),
        รายจ่าย: getSumByTypeAndMonth('EXPENSE', m, y),
      })
    }
    return result
  }, [getSumByTypeAndMonth])

  const formatValue = (value: number) =>
    new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">รายรับ - รายจ่าย 6 เดือนล่าสุด</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barCategoryGap="30%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 11 }} width={50} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="รายรับ" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
