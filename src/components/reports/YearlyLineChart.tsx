'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/useTransactionStore'
import { THAI_MONTHS_SHORT, formatCurrency } from '@/lib/utils'

interface YearlyLineChartProps {
  year: number
}

export function YearlyLineChart({ year }: YearlyLineChartProps) {
  const { getSumByTypeAndMonth } = useTransactionStore()

  const data = THAI_MONTHS_SHORT.map((name, i) => {
    const income = getSumByTypeAndMonth('INCOME', i + 1, year)
    const expense = getSumByTypeAndMonth('EXPENSE', i + 1, year)
    return { name, ยอดสุทธิ: income - expense }
  })

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">ยอดสุทธิรายเดือน (รายรับ - รายจ่าย)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) =>
                new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
              }
              tick={{ fontSize: 11 }}
              width={55}
            />
            <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'ยอดสุทธิ']} />
            <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="ยอดสุทธิ"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4, fill: '#6366f1' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
