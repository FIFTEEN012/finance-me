'use client'

import { useMemo, useState } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import { Target, Flame, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency, THAI_MONTHS, THAI_MONTHS_SHORT, cn } from '@/lib/utils'

/* ─── Types ────────────────────────────────────────────────── */

interface MonthRow {
  idx: number        // 0-based month index
  name: string       // e.g. "ม.ค."
  fullName: string   // e.g. "มกราคม"
  income: number
  expense: number
  saved: number
  rate: number | null  // null if no income
  onTarget: boolean
  hasData: boolean
}

/* ─── Helpers ──────────────────────────────────────────────── */

function rateColor(rate: number | null, target: number): string {
  if (rate === null) return '#9ca3af'
  if (rate >= target) return '#10b981'
  if (rate >= target * 0.5) return '#f59e0b'
  if (rate >= 0) return '#ef4444'
  return '#dc2626'
}

function rateLabel(rate: number | null, target: number): string {
  if (rate === null) return '—'
  if (rate >= target) return 'บรรลุเป้า'
  if (rate >= target * 0.5) return 'ใกล้เป้า'
  if (rate >= 0) return 'ต่ำกว่าเป้า'
  return 'ติดลบ'
}

function calcStreak(rows: MonthRow[], target: number, nowMonth: number, year: number, selectedYear: number): number {
  // Count consecutive months on target going backwards from the current/last month with data
  const withData = rows.filter((r) => r.hasData)
  if (withData.length === 0) return 0
  let streak = 0
  for (let i = withData.length - 1; i >= 0; i--) {
    if ((withData[i].rate ?? -1) >= target) streak++
    else break
  }
  return streak
}

/* ─── Custom tooltip ───────────────────────────────────────── */

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; dataKey: string }>
  label?: string
  target: number
}

function ChartTooltip({ active, payload, label, target }: TooltipProps) {
  if (!active || !payload?.length) return null
  const rateEntry = payload.find((p) => p.dataKey === 'rate')
  const savedEntry = payload.find((p) => p.dataKey === 'saved')
  const rate = rateEntry?.value ?? null

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[150px]">
      <p className="font-semibold text-gray-700 dark:text-gray-300">{label}</p>
      {savedEntry && (
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">ออมได้</span>
          <span className={cn('font-semibold', savedEntry.value >= 0 ? 'text-violet-600' : 'text-red-500')}>
            {formatCurrency(savedEntry.value)}
          </span>
        </div>
      )}
      {rate !== null && (
        <div className="flex justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">อัตราออม</span>
          <span className="font-bold" style={{ color: rateColor(rate, target) }}>
            {rate.toFixed(1)}%
          </span>
        </div>
      )}
      {rate !== null && (
        <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
          <span className="font-medium" style={{ color: rateColor(rate, target) }}>
            {rateLabel(rate, target)}
          </span>
        </div>
      )}
    </div>
  )
}

/* ─── Props ────────────────────────────────────────────────── */

interface SavingsRateTrackerProps {
  year: number
  month: number | null
}

/* ─── Main Component ───────────────────────────────────────── */

export function SavingsRateTracker({ year, month }: SavingsRateTrackerProps) {
  const { getSumByTypeAndMonth } = useTransactionStore()
  const [target, setTarget] = useState(20)

  const now = new Date()

  /* ── Build 12-month rows ────────────────────────────────── */
  const rows: MonthRow[] = useMemo(() =>
    THAI_MONTHS_SHORT.map((name, i) => {
      const m = i + 1
      const income = getSumByTypeAndMonth('INCOME', m, year)
      const expense = getSumByTypeAndMonth('EXPENSE', m, year)
      const saved = income - expense
      const rate = income > 0 ? (saved / income) * 100 : null
      const hasData = income > 0 || expense > 0
      return {
        idx: i,
        name,
        fullName: THAI_MONTHS[i],
        income,
        expense,
        saved,
        rate,
        onTarget: rate !== null && rate >= target,
        hasData,
      }
    }),
  [getSumByTypeAndMonth, year, target])

  /* ── Chart data: only show up to current month for current year ── */
  const chartRows = useMemo(() => {
    const cutoff = year === now.getFullYear() ? now.getMonth() : 11
    return rows.slice(0, cutoff + 1).map((r) => ({
      name: r.name,
      saved: r.hasData ? r.saved : null,
      rate: r.rate,
    }))
  }, [rows, year, now])

  /* ── Period-specific stats ──────────────────────────────── */
  const focusRows = month !== null ? [rows[month - 1]] : rows

  const activeRows = focusRows.filter((r) => r.hasData)
  const rateRows = activeRows.filter((r) => r.rate !== null)

  const avgRate = rateRows.length > 0
    ? rateRows.reduce((s, r) => s + r.rate!, 0) / rateRows.length
    : null

  const bestRow = rateRows.reduce<MonthRow | null>((best, r) =>
    best === null || r.rate! > best.rate! ? r : best, null)

  const worstRow = rateRows.reduce<MonthRow | null>((worst, r) =>
    worst === null || r.rate! < worst.rate! ? r : worst, null)

  const onTargetCount = focusRows.filter((r) => r.onTarget).length
  const streak = calcStreak(rows, target, now.getMonth() + 1, now.getFullYear(), year)

  const totalIncome = activeRows.reduce((s, r) => s + r.income, 0)
  const totalExpense = activeRows.reduce((s, r) => s + r.expense, 0)
  const totalSaved = totalIncome - totalExpense
  const periodRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : null

  const periodLabel = month !== null ? rows[month - 1].fullName : `ปี ${year + 543}`

  /* ── Insight text ───────────────────────────────────────── */
  const insight = useMemo(() => {
    if (activeRows.length === 0) return null
    if (periodRate === null) return 'ไม่มีรายได้ในช่วงนี้'
    if (periodRate < 0) return 'รายจ่ายเกินรายได้ — ตรวจสอบงบประมาณโดยด่วน'
    if (periodRate >= target) {
      if (streak >= 3) return `บรรลุเป้าหมาย ${streak} เดือนติดต่อกัน — ยอดเยี่ยม!`
      return `อัตราออม ${periodRate.toFixed(1)}% เกินเป้า ${target}% — ดีมาก`
    }
    if (periodRate >= target * 0.75) {
      const gap = target - periodRate
      return `ใกล้เป้าแล้ว — ลดรายจ่ายอีก ${gap.toFixed(1)}% เพื่อบรรลุเป้า ${target}%`
    }
    return `อัตราออม ${periodRate.toFixed(1)}% — ตั้งเป้าที่ ${target}% ต่อเดือน`
  }, [periodRate, target, streak, activeRows, rateRows])

  /* ── Gauge arc path ─────────────────────────────────────── */
  // Simple SVG arc gauge showing 0–50% range (most practical)
  const gaugeMax = 50
  const gaugeRate = Math.min(Math.max(periodRate ?? 0, 0), gaugeMax)
  const gaugePct = gaugeRate / gaugeMax
  const gaugeColor = rateColor(periodRate, target)

  // SVG arc: half circle, left = 0%, right = max%
  const cx = 80, cy = 72, r = 55
  const startAngle = Math.PI   // left = 180°
  const endAngle = 0           // right = 0°
  function polarToXY(angle: number, radius: number) {
    return { x: cx + radius * Math.cos(angle), y: cy - radius * Math.sin(angle) }
  }
  const arcStart = polarToXY(startAngle, r)
  const arcEnd = polarToXY(endAngle, r)
  const fillAngle = startAngle - gaugePct * Math.PI
  const fillEnd = polarToXY(fillAngle, r)
  const largeArc = gaugePct > 0.5 ? 0 : 0  // half circle, always small
  const targetAngle = startAngle - (target / gaugeMax) * Math.PI
  const targetPt = polarToXY(targetAngle, r)
  const targetOuter = polarToXY(targetAngle, r + 10)

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            อัตราการออม · {periodLabel}
          </CardTitle>

          {/* Target setter */}
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400">เป้า</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setTarget((t) => Math.max(1, t - 5))}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                {target}%
              </span>
              <button
                onClick={() => setTarget((t) => Math.min(80, t + 5))}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {activeRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-8 h-8 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">ไม่มีข้อมูลใน{periodLabel}</p>
          </div>
        ) : (
          <>
            {/* ── Top section: gauge + summary stats ──────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              {/* Gauge */}
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 160 90" className="w-52 h-auto overflow-visible">
                  {/* Track arc */}
                  <path
                    d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className="dark:stroke-gray-800"
                  />
                  {/* Fill arc */}
                  {gaugePct > 0 && (
                    <path
                      d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`}
                      fill="none"
                      stroke={gaugeColor}
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Target tick */}
                  <line
                    x1={targetPt.x}
                    y1={targetPt.y}
                    x2={targetOuter.x}
                    y2={targetOuter.y}
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Center text */}
                  <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="bold" fill={gaugeColor}>
                    {periodRate !== null ? `${Math.abs(periodRate) >= 100 ? '99+' : periodRate.toFixed(1)}` : '—'}
                  </text>
                  <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill={gaugeColor} fontWeight="600">
                    {periodRate !== null ? '%' : ''}
                  </text>
                  {/* Scale labels */}
                  <text x={arcStart.x - 6} y={arcStart.y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">0</text>
                  <text x={arcEnd.x + 6} y={arcEnd.y + 4} textAnchor="start" fontSize="9" fill="#9ca3af">{gaugeMax}%</text>
                </svg>

                {/* Status badge */}
                <div
                  className="mt-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: gaugeColor + '18', color: gaugeColor }}
                >
                  {rateLabel(periodRate, target)}
                </div>

                {insight && (
                  <p className="mt-2 text-[11px] text-center text-gray-500 dark:text-gray-400 max-w-[200px] leading-relaxed">
                    {insight}
                  </p>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'รายได้รวม',
                    value: formatCurrency(totalIncome),
                    sub: `${activeRows.length} เดือน`,
                    color: 'text-violet-700 dark:text-violet-400',
                    bg: 'bg-violet-50 dark:bg-violet-900/20',
                  },
                  {
                    label: 'รายจ่ายรวม',
                    value: formatCurrency(totalExpense),
                    sub: `${((totalExpense / (totalIncome || 1)) * 100).toFixed(1)}% ของรายรับ`,
                    color: 'text-red-600 dark:text-red-400',
                    bg: 'bg-red-50 dark:bg-red-900/20',
                  },
                  {
                    label: 'ออมได้รวม',
                    value: formatCurrency(totalSaved),
                    sub: totalSaved >= 0 ? 'ออมสำเร็จ' : 'ติดลบ',
                    color: totalSaved >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-600',
                    bg: totalSaved >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20',
                  },
                  {
                    label: streak > 0 ? `ติดต่อกัน ${streak} เดือน` : 'เดือนที่บรรลุเป้า',
                    value: month !== null
                      ? (rows[month - 1].onTarget ? 'บรรลุ' : 'ยังไม่ถึง')
                      : `${onTargetCount}/${activeRows.length}`,
                    sub: streak >= 3 ? '🔥 Streak!' : streak > 0 ? `${streak} เดือนล่าสุด` : '',
                    color: onTargetCount > 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400',
                    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
                  },
                ].map((s) => (
                  <div key={s.label} className={cn('rounded-xl p-3 text-center', s.bg)}>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
                    <p className={cn('text-sm font-bold leading-tight', s.color)}>{s.value}</p>
                    {s.sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{s.sub}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Combo chart: savings bar + rate line ─────── */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                รายได้ออมและอัตราออมรายเดือน — ปี {year + 543}
              </p>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={chartRows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-gray-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />

                  {/* Left axis: saved amount */}
                  <YAxis
                    yAxisId="saved"
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 0 }).format(v)
                    }
                    tick={{ fontSize: 10 }}
                    width={44}
                    axisLine={false}
                    tickLine={false}
                  />

                  {/* Right axis: rate % */}
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10 }}
                    width={36}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />

                  <Tooltip content={<ChartTooltip target={target} />} />

                  {/* Target reference line */}
                  <ReferenceLine
                    yAxisId="rate"
                    y={target}
                    stroke="#6366f1"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{ value: `เป้า ${target}%`, position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }}
                  />

                  {/* Zero reference */}
                  <ReferenceLine yAxisId="saved" y={0} stroke="#e2e8f0" strokeWidth={1} />

                  {/* Savings bars */}
                  <Bar yAxisId="saved" dataKey="saved" radius={[3, 3, 0, 0]} maxBarSize={32} name="ออมได้">
                    {chartRows.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={(entry.saved ?? 0) >= 0 ? '#bfdbfe' : '#fecaca'}
                        className="dark:opacity-70"
                      />
                    ))}
                  </Bar>

                  {/* Rate line */}
                  <Line
                    yAxisId="rate"
                    type="monotone"
                    dataKey="rate"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      if (payload.rate === null || payload.rate === undefined) return <g key={props.key} />
                      const color = rateColor(payload.rate, target)
                      return (
                        <circle
                          key={props.key}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={color}
                          stroke="#fff"
                          strokeWidth={1.5}
                        />
                      )
                    }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                    name="อัตราออม %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ── Monthly table ────────────────────────────── */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">เดือน</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">รายรับ</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">รายจ่าย</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">ออมได้</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">อัตรา</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-500 dark:text-gray-400">เทียบเป้า</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isCurrentMonth = year === now.getFullYear() && row.idx === now.getMonth()
                    const isSelected = month !== null && row.idx === month - 1
                    const isFuture = year === now.getFullYear() && row.idx > now.getMonth()

                    if (isFuture) return null

                    const color = rateColor(row.rate, target)
                    const gap = row.rate !== null ? row.rate - target : null
                    const GapIcon = gap === null ? Minus : gap >= 0 ? TrendingUp : TrendingDown

                    return (
                      <tr
                        key={row.idx}
                        className={cn(
                          'border-b border-gray-50 dark:border-gray-800/60 transition-colors',
                          isSelected && 'bg-indigo-50 dark:bg-indigo-900/20',
                          isCurrentMonth && !isSelected && 'bg-violet-50/50 dark:bg-violet-900/10',
                          !row.hasData && 'opacity-40',
                        )}
                      >
                        <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-300">
                          {row.fullName}
                          {isCurrentMonth && (
                            <span className="ml-1.5 text-[9px] font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 px-1 py-0.5 rounded">
                              ปัจจุบัน
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-violet-700 dark:text-violet-400">
                          {row.income > 0 ? formatCurrency(row.income) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="py-2 px-2 text-right text-red-600 dark:text-red-400">
                          {row.expense > 0 ? formatCurrency(row.expense) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className={cn('py-2 px-2 text-right font-medium', row.saved >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400')}>
                          {row.hasData ? formatCurrency(row.saved) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="py-2 px-2 text-right font-bold" style={{ color: row.hasData ? color : undefined }}>
                          {row.rate !== null ? `${row.rate.toFixed(1)}%` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {row.rate !== null ? (
                            <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                              row.onTarget
                                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400'
                                : row.rate >= 0
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-500'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            )}>
                              <GapIcon className="w-2.5 h-2.5" />
                              {gap !== null ? `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}%` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* Footer summary */}
                {month === null && activeRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                      <td className="py-2 px-2 font-bold text-gray-700 dark:text-gray-300">เฉลี่ย / รวม</td>
                      <td className="py-2 px-2 text-right font-semibold text-violet-700 dark:text-violet-400">
                        {formatCurrency(totalIncome)}
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(totalExpense)}
                      </td>
                      <td className={cn('py-2 px-2 text-right font-semibold', totalSaved >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-600')}>
                        {formatCurrency(totalSaved)}
                      </td>
                      <td className="py-2 px-2 text-right font-bold" style={{ color: rateColor(avgRate, target) }}>
                        {avgRate !== null ? `${avgRate.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2 px-2 text-center text-[10px] text-gray-500 dark:text-gray-400">
                        {onTargetCount}/{activeRows.length} เดือน
                      </td>
                    </tr>

                    {/* Best / worst */}
                    {bestRow && worstRow && bestRow !== worstRow && (
                      <tr>
                        <td colSpan={6} className="pt-2 px-2">
                          <div className="flex gap-4 text-[10px] text-gray-400 dark:text-gray-500">
                            <span>
                              🏆 ดีที่สุด:{' '}
                              <span className="font-medium text-violet-600">{bestRow.fullName}</span>
                              {' '}({bestRow.rate?.toFixed(1)}%)
                            </span>
                            <span>
                              📉 ต่ำที่สุด:{' '}
                              <span className="font-medium text-red-500">{worstRow.fullName}</span>
                              {' '}({worstRow.rate?.toFixed(1)}%)
                            </span>
                            {streak >= 2 && (
                              <span className="flex items-center gap-0.5">
                                <Flame className="w-3 h-3 text-orange-400" />
                                <span className="font-medium text-orange-500">{streak} เดือนติด</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
