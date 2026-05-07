'use client'

import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency, cn } from '@/lib/utils'

/* ─── Constants ───────────────────────────────────────────── */

const DOW_LABELS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']  // Mon–Sun
const DOW_FULL   = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']

/* ─── Heatmap intensity ───────────────────────────────────── */

function intensityClass(amount: number, max: number): string {
  if (max === 0 || amount === 0) return 'bg-gray-100 dark:bg-gray-800'
  const r = amount / max
  if (r > 0.75) return 'bg-red-500 dark:bg-red-500'
  if (r > 0.5)  return 'bg-red-300 dark:bg-red-700'
  if (r > 0.25) return 'bg-orange-200 dark:bg-orange-800'
  return 'bg-orange-100 dark:bg-orange-900/60'
}

/* ─── Custom tooltip ──────────────────────────────────────── */

interface TooltipProps { active?: boolean; payload?: Array<{ value: number }>; label?: string }
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-0.5">วัน{label}</p>
      <p className="text-red-500 font-semibold">{formatCurrency(payload[0].value)}</p>
      <p className="text-gray-400">เฉลี่ยต่อวัน</p>
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────── */

interface SpendingIntensityProps {
  year:  number
  month: number | null
}

export function SpendingIntensity({ year, month }: SpendingIntensityProps) {
  const { transactions } = useTransactionStore()
  const [heatmapMonth, setHeatmapMonth] = useState<'current' | 'prev'>('current')

  const now = new Date()

  /* Filter transactions to selected period */
  const filtered = useMemo(() =>
    transactions.filter((t) => {
      if (t.type !== 'EXPENSE') return false
      const d = new Date(t.date)
      const sameYear  = d.getFullYear() === year
      const sameMonth = month === null || d.getMonth() + 1 === month
      return sameYear && sameMonth
    }),
  [transactions, year, month])

  /* ── Stats ───────────────────────────────────────────────── */
  const { dailyAvg, weeklyAvg, totalDays, peakDow, totalSpent } = useMemo(() => {
    if (filtered.length === 0) return { dailyAvg: 0, weeklyAvg: 0, totalDays: 0, peakDow: -1, totalSpent: 0 }

    const dates = new Set(filtered.map((t) => t.date))
    const totalDays = dates.size || 1
    const totalSpent = filtered.reduce((s, t) => s + t.amount, 0)
    const dailyAvg  = totalSpent / totalDays
    const weeklyAvg = dailyAvg * 7

    // Peak day-of-week (0=Sun JS, remap to 0=Mon)
    const dowTotals = Array(7).fill(0)
    const dowCounts = Array(7).fill(0)
    filtered.forEach((t) => {
      const dow = (new Date(t.date).getDay() + 6) % 7  // 0=Mon
      dowTotals[dow] += t.amount
      dowCounts[dow]++
    })
    const dowAvg = dowTotals.map((s, i) => (dowCounts[i] > 0 ? s / dowCounts[i] : 0))
    const peakDow = dowAvg.indexOf(Math.max(...dowAvg))

    return { dailyAvg, weeklyAvg, totalDays, peakDow, totalSpent }
  }, [filtered])

  /* ── Day-of-week chart ───────────────────────────────────── */
  const dowData = useMemo(() => {
    const dowTotals = Array(7).fill(0)
    const dowCounts = Array(7).fill(0)
    filtered.forEach((t) => {
      const dow = (new Date(t.date).getDay() + 6) % 7
      dowTotals[dow] += t.amount
      dowCounts[dow]++
    })
    return DOW_LABELS.map((label, i) => ({
      name:   label,
      amount: dowCounts[i] > 0 ? Math.round(dowTotals[i] / dowCounts[i]) : 0,
      isPeak: i === peakDow,
    }))
  }, [filtered, peakDow])

  /* ── Calendar heatmap ────────────────────────────────────── */
  const heatmap = useMemo(() => {
    const targetMonth = heatmapMonth === 'current'
      ? (month ?? now.getMonth() + 1)
      : (month !== null ? (month === 1 ? 12 : month - 1) : now.getMonth())
    const targetYear = heatmapMonth === 'current'
      ? year
      : (month === 1 ? year - 1 : year)

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate()
    const firstDow    = (new Date(targetYear, targetMonth - 1, 1).getDay() + 6) % 7  // 0=Mon

    // Sum spending per date
    const dayMap: Record<number, number> = {}
    transactions
      .filter((t) => {
        if (t.type !== 'EXPENSE') return false
        const d = new Date(t.date)
        return d.getFullYear() === targetYear && d.getMonth() + 1 === targetMonth
      })
      .forEach((t) => {
        const day = new Date(t.date).getDate()
        dayMap[day] = (dayMap[day] ?? 0) + t.amount
      })

    const maxDay = Math.max(0, ...Object.values(dayMap))

    // Build grid: pad front with nulls
    const cells: Array<{ day: number | null; amount: number }> = [
      ...Array(firstDow).fill({ day: null, amount: 0 }),
      ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: dayMap[i + 1] ?? 0 })),
    ]

    const todayDay = now.getFullYear() === targetYear && now.getMonth() + 1 === targetMonth
      ? now.getDate() : null

    return { cells, maxDay, todayDay, targetMonth, targetYear }
  }, [transactions, heatmapMonth, month, year, now])

  const hasData = filtered.length > 0

  const periodLabel = month !== null
    ? `เดือน ${month}/${year + 543}`
    : `ปี ${year + 543}`

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          ความเข้มข้นการใช้จ่าย · {periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasData ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">ไม่มีข้อมูลรายจ่ายในช่วงนี้</p>
        ) : (
          <>
            {/* ── Stats strip ── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'เฉลี่ยต่อวัน',     value: dailyAvg,  sub: `${totalDays} วันที่มีรายการ` },
                { label: 'เฉลี่ยต่อสัปดาห์', value: weeklyAvg, sub: `รวม ${formatCurrency(totalSpent)}` },
                { label: 'วันที่ใช้จ่ายสูง',  value: null,      sub: peakDow >= 0 ? `วัน${DOW_FULL[peakDow]}` : '—' },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
                  {s.value !== null
                    ? <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatCurrency(s.value)}</p>
                    : <p className="text-sm font-bold text-red-500">{s.sub}</p>
                  }
                  {s.value !== null && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* ── Day-of-week bar chart ── */}
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">เฉลี่ยรายจ่ายต่อวันในสัปดาห์</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dowData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-gray-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 0 }).format(v)}
                    tick={{ fontSize: 10 }} width={42} axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar
                    dataKey="amount"
                    radius={[4, 4, 0, 0]}
                    fill="#f87171"
                    // highlight peak bar via Cell would need import — use uniform color for simplicity
                  />
                </BarChart>
              </ResponsiveContainer>
              {peakDow >= 0 && (
                <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-1">
                  วัน<span className="font-medium text-red-500">{DOW_FULL[peakDow]}</span>มีการใช้จ่ายสูงที่สุดโดยเฉลี่ย
                </p>
              )}
            </div>

            {/* ── Calendar heatmap ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  ปฏิทินรายจ่าย —{' '}
                  {new Date(heatmap.targetYear, heatmap.targetMonth - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                </p>
                {/* Month toggle */}
                <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px]">
                  {(['current', 'prev'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setHeatmapMonth(m)}
                      className={cn(
                        'px-2.5 py-1 font-medium transition-colors',
                        heatmapMonth === m
                          ? 'bg-red-500 text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                    >
                      {m === 'current' ? 'เดือนนี้' : 'เดือนก่อน'}
                    </button>
                  ))}
                </div>
              </div>

              {/* DOW header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DOW_LABELS.map((d) => (
                  <div key={d} className="text-center text-[10px] text-gray-400 dark:text-gray-500 font-medium">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {heatmap.cells.map((cell, i) => {
                  if (cell.day === null) return <div key={`pad-${i}`} />
                  const isToday = cell.day === heatmap.todayDay
                  return (
                    <div
                      key={cell.day}
                      title={cell.amount > 0 ? `วันที่ ${cell.day}: ${formatCurrency(cell.amount)}` : `วันที่ ${cell.day}: ไม่มีรายการ`}
                      className={cn(
                        'aspect-square rounded-md flex flex-col items-center justify-center cursor-default transition-opacity hover:opacity-80',
                        intensityClass(cell.amount, heatmap.maxDay),
                        isToday && 'ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-gray-900'
                      )}
                    >
                      <span className={cn(
                        'text-[10px] font-medium leading-none',
                        cell.amount > 0 ? 'text-white' : 'text-gray-400 dark:text-gray-600'
                      )}>
                        {cell.day}
                      </span>
                      {cell.amount > 0 && (
                        <span className="text-[8px] text-white/80 leading-none mt-0.5">
                          {new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 0 }).format(cell.amount)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Heatmap legend */}
              <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                <span>น้อย</span>
                {['bg-gray-100 dark:bg-gray-800', 'bg-orange-100 dark:bg-orange-900/60', 'bg-orange-200 dark:bg-orange-800', 'bg-red-300 dark:bg-red-700', 'bg-red-500'].map((cls, i) => (
                  <span key={i} className={cn('w-4 h-4 rounded-sm inline-block', cls)} />
                ))}
                <span>มาก</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
