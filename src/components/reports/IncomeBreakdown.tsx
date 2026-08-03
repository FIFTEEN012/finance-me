'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Banknote, GitBranch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency, THAI_MONTHS, THAI_MONTHS_SHORT, cn } from '@/lib/utils'

/* ─── Types ────────────────────────────────────────────────── */

interface SourceRow {
  categoryId: string
  name: string
  icon: string
  color: string
  amount: number
  pct: number
  txCount: number
  prevAmount: number
  changePct: number | null
}

/* ─── Helpers ──────────────────────────────────────────────── */

function compactFmt(v: number) {
  return new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

function hhi(sources: SourceRow[]): number {
  const total = sources.reduce((s, r) => s + r.amount, 0)
  if (total === 0) return 1
  return sources.reduce((s, r) => s + (r.amount / total) ** 2, 0)
}

function diversificationLabel(score: number, n: number): { text: string; color: string } {
  if (n === 0) return { text: '—', color: 'text-gray-400' }
  if (n === 1) return { text: 'พึ่งพาแหล่งเดียว', color: 'text-red-500' }
  if (score >= 60) return { text: 'กระจายดีมาก', color: 'text-violet-600 dark:text-violet-400' }
  if (score >= 35) return { text: 'กระจายพอสมควร', color: 'text-blue-600 dark:text-blue-400' }
  return { text: 'กระจายน้อย', color: 'text-yellow-600 dark:text-yellow-400' }
}

/* ─── Custom Tooltip ───────────────────────────────────────── */

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{p.name}</span>
          </span>
          <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && total > 0 && (
        <div className="flex justify-between pt-1 border-t border-gray-100 dark:border-gray-800 font-semibold text-gray-700 dark:text-gray-300">
          <span>รวม</span>
          <span>{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  )
}

/* ─── Props ────────────────────────────────────────────────── */

interface IncomeBreakdownProps {
  year: number
  month: number | null
}

/* ─── Main Component ───────────────────────────────────────── */

export function IncomeBreakdown({ year, month }: IncomeBreakdownProps) {
  const { transactions } = useTransactionStore()
  const { getCategoryById } = useCategoryStore()

  const now = new Date()

  /* ── Current & previous period ─────────────────────────── */
  const { currMonth, currYear, prevMonth, prevYear } = useMemo(() => {
    if (month !== null) {
      const pm = month === 1 ? 12 : month - 1
      const py = month === 1 ? year - 1 : year
      return { currMonth: month, currYear: year, prevMonth: pm, prevYear: py }
    }
    // "all year" → compare to previous year, use current calendar month as reference
    return { currMonth: null, currYear: year, prevMonth: null, prevYear: year - 1 }
  }, [month, year])

  /* ── Build source rows ──────────────────────────────────── */
  const sources: SourceRow[] = useMemo(() => {
    const curr: Record<string, { amount: number; txCount: number; cat: { name: string; icon: string; color: string } }> = {}
    const prev: Record<string, number> = {}

    for (const t of transactions) {
      if (t.type !== 'INCOME') continue
      const d = new Date(t.date)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const cat = getCategoryById(t.categoryId)
      if (!cat) continue

      const isCurr = y === currYear && (currMonth === null || m === currMonth)
      const isPrev = prevMonth === null
        ? y === prevYear
        : y === prevYear && m === prevMonth

      if (isCurr) {
        if (!curr[cat.id]) curr[cat.id] = { amount: 0, txCount: 0, cat: { name: cat.name, icon: cat.icon, color: cat.color } }
        curr[cat.id].amount += t.amount
        curr[cat.id].txCount++
      }
      if (isPrev) {
        prev[cat.id] = (prev[cat.id] ?? 0) + t.amount
      }
    }

    const total = Object.values(curr).reduce((s, v) => s + v.amount, 0)
    return Object.entries(curr)
      .map(([id, v]) => {
        const prevAmt = prev[id] ?? 0
        const changePct = prevAmt > 0 ? ((v.amount - prevAmt) / prevAmt) * 100 : null
        return {
          categoryId: id,
          name: v.cat.name,
          icon: v.cat.icon,
          color: v.cat.color,
          amount: v.amount,
          pct: total > 0 ? (v.amount / total) * 100 : 0,
          txCount: v.txCount,
          prevAmount: prevAmt,
          changePct,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, getCategoryById, currMonth, currYear, prevMonth, prevYear])

  /* ── Totals ─────────────────────────────────────────────── */
  const totalIncome = sources.reduce((s, r) => s + r.amount, 0)
  const prevTotalIncome = useMemo(() => {
    let sum = 0
    for (const t of transactions) {
      if (t.type !== 'INCOME') continue
      const d = new Date(t.date)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const isPrev = prevMonth === null
        ? y === prevYear
        : y === prevYear && m === prevMonth
      if (isPrev) sum += t.amount
    }
    return sum
  }, [transactions, prevMonth, prevYear])

  const totalChangePct = prevTotalIncome > 0
    ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100
    : null

  /* ── Diversification ────────────────────────────────────── */
  const hhiScore = hhi(sources)
  const divScore = sources.length <= 1 ? 0 : Math.round((1 - hhiScore) * 100)
  const divLabel = diversificationLabel(divScore, sources.length)
  const dominantSource = sources[0]
  const dominanceWarning = dominantSource && dominantSource.pct > 75 && sources.length > 1

  /* ── Monthly trend (12 months of selected year) ─────────── */
  const trendData = useMemo(() => {
    const topSources = sources.slice(0, 5) // limit to 5 series max
    return THAI_MONTHS_SHORT.map((name, i) => {
      const m = i + 1
      const point: Record<string, string | number> = { name }
      for (const src of topSources) {
        point[src.name] = transactions
          .filter((t) => {
            const d = new Date(t.date)
            return t.type === 'INCOME'
              && t.categoryId === src.categoryId
              && d.getMonth() + 1 === m
              && d.getFullYear() === year
          })
          .reduce((s, t) => s + t.amount, 0)
      }
      return point
    })
  }, [sources, transactions, year])

  const periodLabel = month !== null
    ? `${THAI_MONTHS[month - 1]} ${year + 543}`
    : `ปี ${year + 543}`

  const compPeriodLabel = prevMonth !== null
    ? `${THAI_MONTHS[prevMonth - 1]} ${prevYear + 543}`
    : `ปี ${prevYear + 543}`

  const hasData = sources.length > 0

  return (
    <Card className="overflow-hidden border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="min-w-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
            แหล่งรายได้ · {periodLabel}
          </CardTitle>
          <span className="text-xs text-gray-400 dark:text-gray-500">เทียบกับ {compPeriodLabel}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 overflow-hidden">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Banknote className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">ไม่มีรายได้ใน{periodLabel}</p>
          </div>
        ) : (
          <>
            <div className="grid min-w-0 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
              <div className="min-w-0 space-y-3">
                {/* ── Summary strip ──────────────────────────────── */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-1">
                  {/* Total income */}
                  <div className="col-span-2 min-w-0 rounded-xl bg-violet-50 p-2.5 text-center dark:bg-violet-900/20 sm:p-3 xl:col-span-1">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">รายได้รวม</p>
                    <p className="text-base font-bold text-violet-700 dark:text-violet-400">{formatCurrency(totalIncome)}</p>
                    {totalChangePct !== null && (
                      <p className={cn(
                        'text-[10px] mt-0.5 font-medium',
                        totalChangePct >= 0 ? 'text-violet-600 dark:text-violet-400' : 'text-red-500'
                      )}>
                        {totalChangePct >= 0 ? '▲' : '▼'} {Math.abs(totalChangePct).toFixed(1)}%
                      </p>
                    )}
                  </div>

                  {/* Number of sources */}
                  <div className="min-w-0 rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-800/60 sm:p-3">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">แหล่งรายได้</p>
                    <p className="truncate text-[13px] font-bold text-gray-800 dark:text-gray-200 sm:text-sm">{sources.length} แหล่ง</p>
                    <p className={cn('mt-0.5 truncate text-[10px] font-medium', divLabel.color)}>{divLabel.text}</p>
                  </div>

                  {/* Top source */}
                  <div className="min-w-0 rounded-xl bg-blue-50 p-2.5 text-center dark:bg-blue-900/20 sm:p-3">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">แหล่งหลัก</p>
                    <p className="truncate text-[13px] font-bold text-blue-700 dark:text-blue-400 sm:text-sm">{dominantSource?.name ?? '—'}</p>
                    <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-gray-500">
                      {dominantSource ? `${dominantSource.pct.toFixed(0)}% ของรายได้` : ''}
                    </p>
                  </div>
                </div>

                {/* ── Dominance warning ──────────────────────────── */}
                {dominanceWarning && (
                  <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
                    <GitBranch className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium">"{dominantSource.name}"</span> คิดเป็น{' '}
                      {dominantSource.pct.toFixed(0)}% ของรายได้ทั้งหมด
                      — พิจารณาเพิ่มแหล่งรายได้เพื่อกระจายความเสี่ยง
                    </span>
                  </div>
                )}
              </div>

              {/* ── Horizontal source cards ─────────────────────── */}
              <div className="min-w-0 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">สัดส่วนแหล่งรายได้</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">เรียงจากรายได้สูงสุด</p>
                </div>

                <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {sources.map((src) => {
                    const isUp = (src.changePct ?? 0) > 0
                    const isDown = (src.changePct ?? 0) < 0
                    const ChangeIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
                    return (
                      <div
                        key={src.categoryId}
                        className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white/80 p-3 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/30 dark:hover:bg-gray-800/50"
                      >
                        <div
                          className="absolute inset-y-3 left-0 w-1 rounded-r-full"
                          style={{ backgroundColor: src.color }}
                        />

                        <div className="flex min-w-0 items-center gap-3 pl-1.5">
                          {/* Icon */}
                          <div
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: src.color + '20' }}
                          >
                            <CategoryIcon name={src.icon} className="h-5 w-5" style={{ color: src.color }} />
                          </div>

                          {/* Name + stats */}
                          <div className="flex-1 min-w-0">
                            <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                              <p className="min-w-0 truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {src.name}
                              </p>
                              <span className="w-11 flex-shrink-0 text-right text-[10px] font-bold" style={{ color: src.color }}>
                                {src.pct.toFixed(1)}%
                              </span>
                            </div>

                            <p className="mb-1.5 text-sm font-bold leading-tight text-gray-900 dark:text-gray-100">
                              {formatCurrency(src.amount)}
                            </p>

                            <div className="flex min-w-0 items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${src.pct}%`, backgroundColor: src.color }}
                                />
                              </div>
                            </div>

                            <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
                              <span className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                                {src.txCount} รายการ
                              </span>
                              {src.changePct !== null && (
                                <span className={cn(
                                  'flex items-center gap-0.5 text-[10px] font-medium flex-shrink-0',
                                  isUp ? 'text-violet-600 dark:text-violet-400' : isDown ? 'text-red-500' : 'text-gray-400'
                                )}>
                                  <ChangeIcon className="w-3 h-3" />
                                  {Math.abs(src.changePct).toFixed(1)}%
                                </span>
                              )}
                              {src.changePct === null && src.prevAmount === 0 && (
                                <span className="text-[10px] text-blue-500 flex-shrink-0">ใหม่</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Monthly trend chart ─────────────────────────── */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                แนวโน้มรายเดือน — ปี {year + 543}
                {sources.length > 5 && (
                  <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">(แสดง 5 แหล่งหลัก)</span>
                )}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -6, bottom: 6 }}>
                  <defs>
                    {sources.slice(0, 5).map((src) => (
                      <linearGradient key={src.categoryId} id={`grad-${src.categoryId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={src.color} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={src.color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-gray-800" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={2}
                  />
                  <YAxis
                    tickFormatter={compactFmt}
                    tick={{ fontSize: 10 }}
                    width={46}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {sources.slice(0, 5).map((src) => (
                    <Area
                      key={src.categoryId}
                      type="monotone"
                      dataKey={src.name}
                      stackId="income"
                      stroke={src.color}
                      fill={`url(#grad-${src.categoryId})`}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* ── Diversification detail ──────────────────────── */}
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" />
                  ดัชนีการกระจายรายได้
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        divScore >= 60 ? 'bg-violet-500' : divScore >= 35 ? 'bg-blue-500' : divScore > 0 ? 'bg-yellow-500' : 'bg-red-400'
                      )}
                      style={{ width: `${Math.max(divScore, sources.length > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <span className={cn('text-xs font-bold', divLabel.color)}>{divScore}/100</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {sources.map((src) => (
                  <div key={src.categoryId} className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2.5 text-center">
                    <div className="flex items-center justify-center mb-1.5">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: src.color + '25' }}
                      >
                        <CategoryIcon name={src.icon} className="w-3 h-3" style={{ color: src.color }} />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium truncate">{src.name}</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: src.color }}>
                      {src.pct.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>

              {sources.length >= 2 && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                  {divScore >= 60
                    ? 'รายได้กระจายตัวดี ลดความเสี่ยงหากแหล่งใดแหล่งหนึ่งหยุดชะงัก'
                    : divScore >= 35
                    ? `"${sources[0].name}" ยังครองสัดส่วนหลัก — เพิ่มแหล่งรายได้เพื่อกระจายความเสี่ยง`
                    : `รายได้กระจุกตัวที่ "${sources[0].name}" — ควรพัฒนาแหล่งรายได้เสริม`
                  }
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
