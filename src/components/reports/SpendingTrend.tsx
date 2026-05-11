'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency, THAI_MONTHS_SHORT, cn } from '@/lib/utils'

/* ─── Linear regression ───────────────────────────────────── */

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length
  if (n === 0) return { slope: 0, intercept: 0 }
  const xs = values.map((_, i) => i)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * values[i], 0)
  const sumX2 = xs.reduce((s, x) => s + x * x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n }
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function forecast(values: number[], stepsAhead = 1): number {
  const { slope, intercept } = linearRegression(values)
  return Math.max(0, intercept + slope * (values.length - 1 + stepsAhead))
}

/* ─── Helpers ─────────────────────────────────────────────── */

function compactFormat(v: number) {
  return new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

function pctChange(prev: number, curr: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────── */

export function SpendingTrend() {
  const { getSumByTypeAndMonth, transactions } = useTransactionStore()
  const { getCategoryById } = useCategoryStore()

  const now = new Date()

  /* Build last-6-months data */
  const history = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      return {
        label: THAI_MONTHS_SHORT[d.getMonth()],
        month: m,
        year: y,
        income: getSumByTypeAndMonth('INCOME', m, y),
        expense: getSumByTypeAndMonth('EXPENSE', m, y),
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSumByTypeAndMonth])

  /* Forecast next month */
  const forecastData = useMemo(() => {
    const incomes = history.map((h) => h.income)
    const expenses = history.map((h) => h.expense)
    const nextIncome = forecast(incomes)
    const nextExpense = forecast(expenses)
    const nextD = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return {
      label: `${THAI_MONTHS_SHORT[nextD.getMonth()]} (คาดการณ์)`,
      income: nextIncome,
      expense: nextExpense,
      savings: nextIncome - nextExpense,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history])

  /* Chart data: 6 actual + 1 forecast */
  const chartData = useMemo(() => {
    type ChartPoint = {
      name: string
      รายรับ: number | undefined
      รายจ่าย: number | undefined
      'รายรับ (คาด)': number | undefined
      'รายจ่าย (คาด)': number | undefined
      isForecast: boolean
    }
    const actual: ChartPoint[] = history.map((h) => ({
      name: h.label,
      รายรับ: h.income,
      รายจ่าย: h.expense,
      'รายรับ (คาด)': undefined,
      'รายจ่าย (คาด)': undefined,
      isForecast: false,
    }))
    // Bridge: repeat last actual point so dashed line connects smoothly
    const last = history[history.length - 1]
    actual[actual.length - 1] = {
      ...actual[actual.length - 1],
      'รายรับ (คาด)': last.income,
      'รายจ่าย (คาด)': last.expense,
    }
    actual.push({
      name: forecastData.label,
      รายรับ: undefined,
      รายจ่าย: undefined,
      'รายรับ (คาด)': forecastData.income,
      'รายจ่าย (คาด)': forecastData.expense,
      isForecast: true,
    })
    return actual
  }, [history, forecastData])

  /* MoM change (last 2 months) */
  const momExpense = pctChange(history[4]?.expense ?? 0, history[5]?.expense ?? 0)
  const momIncome = pctChange(history[4]?.income ?? 0, history[5]?.income ?? 0)

  /* Top growing expense categories (this month vs last month) */
  const categoryTrends = useMemo(() => {
    const curr = history[5]
    const prev = history[4]
    const map: Record<string, { name: string; color: string; prev: number; curr: number }> = {}
    for (const t of transactions) {
      const d = new Date(t.date)
      if (t.type !== 'EXPENSE') continue
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const cat = getCategoryById(t.categoryId)
      if (!cat) continue
      if (!map[cat.id]) map[cat.id] = { name: cat.name, color: cat.color, prev: 0, curr: 0 }
      if (m === prev.month && y === prev.year) map[cat.id].prev += t.amount
      if (m === curr.month && y === curr.year) map[cat.id].curr += t.amount
    }
    return Object.values(map)
      .filter((c) => c.prev > 0 || c.curr > 0)
      .map((c) => ({ ...c, change: c.curr - c.prev, pct: pctChange(c.prev, c.curr) }))
      .sort((a, b) => b.change - a.change)
      .slice(0, 5)
  }, [transactions, getCategoryById, history])

  /* Auto-generated insights */
  const insights = useMemo(() => {
    const list: string[] = []
    const curr = history[5]
    const prev = history[4]

    if (momExpense !== null) {
      if (momExpense > 20) list.push(`รายจ่ายเดือนนี้สูงขึ้น ${momExpense.toFixed(1)}% จากเดือนก่อน`)
      else if (momExpense < -10) list.push(`รายจ่ายลดลง ${Math.abs(momExpense).toFixed(1)}% — แนวโน้มดีขึ้น`)
      else if (Math.abs(momExpense) <= 5) list.push('รายจ่ายเดือนนี้ทรงตัวใกล้เคียงเดือนก่อน')
    }
    if (curr.income > 0) {
      const savingsRate = ((curr.income - curr.expense) / curr.income) * 100
      if (savingsRate >= 20) list.push(`อัตราออมเดือนนี้ ${savingsRate.toFixed(1)}% — ดีเยี่ยม`)
      else if (savingsRate < 0) list.push('รายจ่ายเดือนนี้เกินรายรับ — ควรตรวจสอบ')
    }
    const topGrowing = categoryTrends.find((c) => (c.pct ?? 0) > 30 && c.change > 1000)
    if (topGrowing) list.push(`"${topGrowing.name}" ใช้จ่ายเพิ่มขึ้น ${(topGrowing.pct ?? 0).toFixed(0)}% จากเดือนก่อน`)

    if (forecastData.expense > curr.expense * 1.1)
      list.push(`คาดว่าเดือนหน้ารายจ่ายจะสูงขึ้น — เตรียมงบไว้ที่ ${formatCurrency(forecastData.expense)}`)
    else if (forecastData.expense < curr.expense * 0.9)
      list.push(`แนวโน้มบ่งชี้รายจ่ายเดือนหน้าอาจลดลงเหลือ ${formatCurrency(forecastData.expense)}`)

    return list.slice(0, 3)
  }, [history, momExpense, categoryTrends, forecastData])

  const hasData = history.some((h) => h.income > 0 || h.expense > 0)

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          แนวโน้มและคาดการณ์การใช้จ่าย
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasData ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">ยังไม่มีข้อมูลเพียงพอสำหรับวิเคราะห์แนวโน้ม</p>
        ) : (
          <>
            {/* Trend chart */}
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-gray-800" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={compactFormat} tick={{ fontSize: 11 }} width={52} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {/* Forecast zone */}
                <ReferenceLine x={forecastData.label} stroke="#e5e7eb" strokeDasharray="4 2" label={{ value: 'คาดการณ์', position: 'insideTopRight', fontSize: 10, fill: '#9ca3af' }} />
                {/* Actual lines */}
                <Area type="monotone" dataKey="รายรับ" stroke="#10b981" fill="#d1fae5" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Area type="monotone" dataKey="รายจ่าย" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                {/* Forecast dashed lines */}
                <Line type="monotone" dataKey="รายรับ (คาด)" stroke="#10b981" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }} connectNulls legendType="none" />
                <Line type="monotone" dataKey="รายจ่าย (คาด)" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, fill: '#fff', stroke: '#ef4444', strokeWidth: 2 }} connectNulls legendType="none" />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Forecast cards */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                คาดการณ์เดือนหน้า (Linear Regression)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'รายรับ', value: forecastData.income, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', mom: momIncome, positiveGood: true },
                  { label: 'รายจ่าย', value: forecastData.expense, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', mom: momExpense, positiveGood: false },
                  { label: 'ออม', value: forecastData.savings, color: forecastData.savings >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500', bg: 'bg-blue-50 dark:bg-blue-900/20', mom: null, positiveGood: true },
                ].map((c) => (
                  <div key={c.label} className={`rounded-xl p-3 text-center ${c.bg}`}>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
                    <p className={`text-sm font-bold ${c.color}`}>{formatCurrency(c.value)}</p>
                    {c.mom !== null && (
                      <p className={cn('text-[10px] mt-0.5', c.positiveGood ? (c.mom >= 0 ? 'text-violet-500' : 'text-red-400') : (c.mom >= 0 ? 'text-red-400' : 'text-violet-500'))}>
                        {c.mom >= 0 ? '▲' : '▼'} {Math.abs(c.mom).toFixed(1)}% MoM
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Category trends */}
            {categoryTrends.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">การเปลี่ยนแปลงรายหมวด (เดือนนี้ vs เดือนก่อน)</p>
                <div className="space-y-1.5">
                  {categoryTrends.map((c) => {
                    const isUp = c.change > 0
                    const Icon = isUp ? TrendingUp : c.change < 0 ? TrendingDown : Minus
                    return (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{c.name}</span>
                        <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', isUp ? 'text-red-400' : 'text-violet-500')} />
                        <span className={cn('font-medium w-16 text-right flex-shrink-0', isUp ? 'text-red-500' : 'text-violet-600 dark:text-violet-400')}>
                          {isUp ? '+' : ''}{formatCurrency(c.change)}
                        </span>
                        {c.pct !== null && (
                          <span className="text-gray-400 dark:text-gray-500 w-14 text-right flex-shrink-0">
                            ({c.pct >= 0 ? '+' : ''}{c.pct.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <div className="space-y-1.5">
                {insights.map((text, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                    {text}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
