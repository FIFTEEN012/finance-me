'use client'

import { useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, Cell,
} from 'recharts'
import { CalendarDays, TrendingUp, TrendingDown } from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency, THAI_MONTHS_SHORT } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface MonthData {
  label:         string
  income:        number
  expense:       number
  netActual:     number | null
  netProjected:  number | null
  isProjected:   boolean
}

interface UpcomingEvent {
  date:        string
  description: string
  amount:      number
  type:        'INCOME' | 'EXPENSE'
  categoryId:  string
  daysFromNow: number
}

const compact = (n: number) =>
  new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export function CashFlowForecast() {
  const { getSumByTypeAndMonth } = useTransactionStore()
  const { recurrings } = useRecurringStore()
  const { getCategoryById } = useCategoryStore()

  const now = new Date()

  /* ── Build 6-month chart data (3 past + current + 2 future) ── */
  const chartData = useMemo((): MonthData[] => {
    const result: MonthData[] = []

    for (let offset = -3; offset <= 2; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const isFuture = offset > 0

      let income = 0
      let expense = 0

      if (!isFuture) {
        income  = getSumByTypeAndMonth('INCOME',  m, y)
        expense = getSumByTypeAndMonth('EXPENSE', m, y)

        // Current month: add still-upcoming recurring days
        if (offset === 0) {
          const today = now.getDate()
          const daysInMonth = new Date(y, m, 0).getDate()
          for (const r of recurrings) {
            if (!r.isActive || r.frequency !== 'monthly') continue
            if (r.dayOfMonth > today && r.dayOfMonth <= daysInMonth) {
              if (r.type === 'INCOME') income  += r.amount
              else                      expense += r.amount
            }
          }
        }
      } else {
        // Future months: sum all active recurring
        const daysInMonth = new Date(y, m, 0).getDate()
        for (const r of recurrings) {
          if (!r.isActive) continue
          if (r.frequency === 'monthly' && r.dayOfMonth <= daysInMonth) {
            if (r.type === 'INCOME') income  += r.amount
            else                      expense += r.amount
          }
          if (r.frequency === 'yearly') {
            const s = new Date(r.startDate)
            if (s.getMonth() + 1 === m) {
              if (r.type === 'INCOME') income  += r.amount
              else                      expense += r.amount
            }
          }
        }
      }

      const net = income - expense
      result.push({
        label:        THAI_MONTHS_SHORT[d.getMonth()],
        income,
        expense,
        netActual:    !isFuture ? net : null,
        netProjected: isFuture  ? net : null,
        isProjected:  isFuture,
      })
    }

    // Bridge: duplicate current month net into projected series so the line connects
    const currentIdx = 3
    result[currentIdx].netProjected = result[currentIdx].netActual

    return result
  }, [getSumByTypeAndMonth, recurrings, now])

  /* ── 30 / 60 / 90-day projected net cash flow ── */
  const projected = useMemo(() => {
    const vals = [0, 0, 0]
    for (let i = 1; i <= 90; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      for (const r of recurrings) {
        if (!r.isActive) continue
        let hit = false
        if (r.frequency === 'monthly' && d.getDate() === r.dayOfMonth) hit = true
        if (r.frequency === 'yearly') {
          const s = new Date(r.startDate)
          if (d.getDate() === s.getDate() && d.getMonth() === s.getMonth()) hit = true
        }
        if (hit) {
          const v = r.type === 'INCOME' ? r.amount : -r.amount
          if (i <= 30) vals[0] += v
          if (i <= 60) vals[1] += v
          vals[2] += v
        }
      }
    }
    return vals
  }, [recurrings, now])

  /* ── Upcoming events (next 45 days, max 7) ── */
  const upcoming = useMemo((): UpcomingEvent[] => {
    const events: UpcomingEvent[] = []
    for (let i = 1; i <= 45; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      for (const r of recurrings) {
        if (!r.isActive) continue
        let hit = false
        if (r.frequency === 'monthly' && d.getDate() === r.dayOfMonth) hit = true
        if (r.frequency === 'yearly') {
          const s = new Date(r.startDate)
          if (d.getDate() === s.getDate() && d.getMonth() === s.getMonth()) hit = true
        }
        if (hit) events.push({ date: d.toISOString().slice(0, 10), description: r.description, amount: r.amount, type: r.type, categoryId: r.categoryId, daysFromNow: i })
      }
    }
    return events.sort((a, b) => a.daysFromNow - b.daysFromNow).slice(0, 7)
  }, [recurrings, now])

  const hasData = chartData.some(m => m.income > 0 || m.expense > 0)
  const currentLabel = THAI_MONTHS_SHORT[now.getMonth()]

  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50 dark:border-white/[0.04]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cash Flow Forecast</h3>
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">
              ย้อนหลัง 3 เดือน + คาดการณ์ 2 เดือนข้างหน้าจาก Recurring
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10">
            <CalendarDays className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400">90 วัน</span>
          </div>
        </div>

        {/* 30 / 60 / 90-day cards */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          {[{ label: '30 วันหน้า', val: projected[0] }, { label: '60 วันหน้า', val: projected[1] }, { label: '90 วันหน้า', val: projected[2] }].map(({ label, val }) => (
            <div key={label} className={cn(
              'rounded-lg p-3 text-center',
              val >= 0 ? 'bg-violet-50 dark:bg-violet-500/10' : 'bg-red-50 dark:bg-red-500/10'
            )}>
              <p className="text-[10px] text-gray-400 dark:text-white/40 mb-1">{label}</p>
              <p className={cn('text-sm font-bold num', val >= 0 ? 'text-violet-600 dark:text-violet-400' : 'text-red-500')}>
                {val >= 0 ? '+' : ''}{formatCurrency(val)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 py-4">
        {!hasData ? (
          <div className="h-52 flex flex-col items-center justify-center gap-2 text-center">
            <CalendarDays className="w-8 h-8 text-gray-200 dark:text-white/10" />
            <p className="text-sm text-gray-400 dark:text-white/30">ยังไม่มีข้อมูล</p>
            <p className="text-xs text-gray-300 dark:text-white/20">เพิ่ม Recurring transactions เพื่อดูการคาดการณ์</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-3 text-[11px] text-gray-400 dark:text-white/40">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-500/75" />รายรับ</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400/75" />รายจ่าย</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-dashed border-violet-400" />สุทธิ (คาดการณ์)</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} barGap={3} margin={{ left: 0, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'rgb(156,163,175)' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={compact}
                  tick={{ fontSize: 10, fill: 'rgb(156,163,175)' }}
                  axisLine={false} tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(v, name) => [
                    formatCurrency(Number(v)),
                    name === 'income' ? 'รายรับ' : name === 'expense' ? 'รายจ่าย' : 'สุทธิ',
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}
                />
                {/* Shade projected area */}
                <ReferenceArea
                  x1={currentLabel} x2={chartData[5]?.label}
                  fill="rgba(124,58,237,0.03)"
                  strokeOpacity={0}
                />
                {/* Income bars */}
                <Bar dataKey="income" name="income" radius={[3, 3, 0, 0]} maxBarSize={22}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={`rgba(124,58,237,${entry.isProjected ? 0.35 : 0.75})`} />
                  ))}
                </Bar>
                {/* Expense bars */}
                <Bar dataKey="expense" name="expense" radius={[3, 3, 0, 0]} maxBarSize={22}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={`rgba(239,68,68,${entry.isProjected ? 0.30 : 0.65})`} />
                  ))}
                </Bar>
                {/* Net actual line */}
                <Line
                  dataKey="netActual"
                  name="netActual"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                {/* Net projected line (dashed) */}
                <Line
                  dataKey="netProjected"
                  name="netProjected"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-center text-gray-300 dark:text-white/20 mt-2">
              แถบใส = คาดการณ์ · เส้นประ = สุทธิคาดการณ์
            </p>
          </>
        )}
      </div>

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <div className="px-5 pb-5 border-t border-gray-50 dark:border-white/[0.04] pt-4">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-white/35 uppercase tracking-wider mb-3">
            รายการที่กำลังมาถึง
          </p>
          <div className="space-y-2.5">
            {upcoming.map((ev, i) => {
              const cat = getCategoryById(ev.categoryId)
              const isIncome = ev.type === 'INCOME'
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                    isIncome
                      ? 'bg-violet-100 dark:bg-violet-500/15'
                      : 'bg-red-100 dark:bg-red-500/15',
                  )}>
                    {isIncome
                      ? <TrendingUp  className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                      : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-white/80 truncate">{ev.description}</p>
                    <p className="text-[10px] text-gray-400 dark:text-white/35">
                      {cat?.name ?? '—'} · <span className={ev.daysFromNow <= 7 ? 'text-orange-500' : ''}>อีก {ev.daysFromNow} วัน</span>
                    </p>
                  </div>
                  <span className={cn(
                    'text-xs font-semibold num flex-shrink-0',
                    isIncome ? 'text-violet-600 dark:text-violet-400' : 'text-red-500',
                  )}>
                    {isIncome ? '+' : '-'}{formatCurrency(ev.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
