'use client'

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

interface MonthlyBarChartProps {
  year: number
}

export function MonthlyBarChart({ year }: MonthlyBarChartProps) {
  const { getSumByTypeAndMonth } = useTransactionStore()

  const data = THAI_MONTHS_SHORT.map((name, i) => ({
    name,
    รายรับ: getSumByTypeAndMonth('INCOME', i + 1, year),
    รายจ่าย: getSumByTypeAndMonth('EXPENSE', i + 1, year),
  }))

  const totalIncome = data.reduce((s, d) => s + d.รายรับ, 0)
  const totalExpense = data.reduce((s, d) => s + d.รายจ่าย, 0)

  const formatValue = (value: number) =>
    new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">รายรับ - รายจ่าย รายเดือน</CardTitle>
        <div className="flex gap-4 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">รายรับรวม: <span className="text-violet-600 font-medium">{formatCurrency(totalIncome)}</span></span>
          <span className="text-xs text-gray-500 dark:text-gray-400">รายจ่ายรวม: <span className="text-red-500 font-medium">{formatCurrency(totalExpense)}</span></span>
          <span className="text-xs text-gray-500 dark:text-gray-400">ออมได้: <span className={`font-medium ${totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>{formatCurrency(totalIncome - totalExpense)}</span></span>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barCategoryGap="30%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 11 }} width={50} />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="รายรับ" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="รายจ่าย" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
