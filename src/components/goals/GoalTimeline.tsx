'use client'

import { useMemo } from 'react'
import { CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { Goal } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'

/* ─── Types ───────────────────────────────────────────────── */

type GoalStatus = 'completed' | 'ahead' | 'on-track' | 'behind' | 'overdue'

interface GoalRow {
  goal:          Goal
  status:        GoalStatus
  actualPct:     number   // saved / target (0-100)
  expectedPct:   number   // linear expected by today (0-100)
  barLeft:       number   // % offset from timeline start
  barWidth:      number   // % width relative to full timeline
  todayInBar:    number   // today's position inside the bar (0-100%)
  daysLeft:      number
  monthsLeft:    number
  monthlyNeeded: number
}

/* ─── Status config ───────────────────────────────────────── */

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: 'สำเร็จ',    color: 'text-violet-600 dark:text-violet-400', icon: CheckCircle2 },
  ahead:     { label: 'เร็วกว่าแผน', color: 'text-blue-600 dark:text-blue-400',     icon: CheckCircle2 },
  'on-track':{ label: 'ตามแผน',    color: 'text-violet-600 dark:text-violet-400', icon: Clock },
  behind:    { label: 'ช้ากว่าแผน', color: 'text-amber-600 dark:text-amber-400',    icon: AlertTriangle },
  overdue:   { label: 'เกินกำหนด', color: 'text-red-500',                           icon: XCircle },
}

/* ─── Month tick labels ───────────────────────────────────── */

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function buildTicks(start: Date, end: Date): Array<{ pct: number; label: string }> {
  const range = end.getTime() - start.getTime()
  if (range <= 0) return []
  const ticks: Array<{ pct: number; label: string }> = []
  const d = new Date(start.getFullYear(), start.getMonth(), 1)
  d.setMonth(d.getMonth() + 1)
  while (d <= end) {
    const pct = ((d.getTime() - start.getTime()) / range) * 100
    // Show label every 2 months to avoid crowding
    const label = d.getMonth() % 2 === 0 ? `${THAI_MONTHS_SHORT[d.getMonth()]}${String(d.getFullYear() + 543).slice(2)}` : ''
    ticks.push({ pct, label })
    d.setMonth(d.getMonth() + 1)
  }
  return ticks
}

/* ─── Row component ───────────────────────────────────────── */

function TimelineRow({ row, todayPct }: { row: GoalRow; todayPct: number }) {
  const cfg = STATUS_CONFIG[row.status]
  const StatusIcon = cfg.icon
  const { goal } = row

  const targetDate = new Date(goal.targetDate)
  const dateLabel = targetDate.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0 group">
      {/* Goal name — fixed left column */}
      <div className="w-36 flex-shrink-0 flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: goal.color + '22' }}>
          {row.status === 'completed' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
          ) : !/^[A-Za-z0-9]+$/.test(goal.icon) ? (
            <span className="text-xs select-none leading-none">{goal.icon}</span>
          ) : (
            <CategoryIcon name={goal.icon} className="w-3.5 h-3.5" style={{ color: goal.color }} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{goal.name}</p>
          <div className="flex items-center gap-1">
            <StatusIcon className={cn('w-2.5 h-2.5 flex-shrink-0', cfg.color)} />
            <span className={cn('text-[10px]', cfg.color)}>{cfg.label}</span>
          </div>
        </div>
      </div>

      {/* Timeline bar area — flexible */}
      <div className="flex-1 relative h-8 min-w-0">
        {/* Today line (behind everything) */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-blue-400/60 dark:bg-blue-500/60 z-10"
            style={{ left: `${todayPct}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500" />
          </div>
        )}

        {/* Goal bar */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full overflow-hidden"
          style={{
            left:  `${row.barLeft}%`,
            width: `${row.barWidth}%`,
            backgroundColor: '#f1f5f9',
          }}
        >
          {/* Dark mode track */}
          <div className="absolute inset-0 rounded-full bg-gray-100 dark:bg-gray-800" />

          {/* Expected pace ghost */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width: `${Math.min(row.expectedPct, 100)}%`,
              backgroundColor: goal.color + '30',
            }}
          />

          {/* Actual saved fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width: `${Math.min(row.actualPct, 100)}%`,
              backgroundColor: row.status === 'completed' ? '#22c55e' : goal.color,
            }}
          />

          {/* Today marker inside bar */}
          {row.todayInBar >= 0 && row.todayInBar <= 100 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-400/80 dark:bg-blue-400/80 z-20"
              style={{ left: `${row.todayInBar}%` }}
            />
          )}

          {/* % label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white drop-shadow-sm mix-blend-luminosity">
              {row.actualPct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Right info — fixed */}
      <div className="w-24 flex-shrink-0 text-right">
        <p className="text-[10px] font-medium text-gray-600 dark:text-gray-400">{dateLabel}</p>
        {row.status === 'completed' ? (
          <p className="text-[10px] text-violet-600 dark:text-violet-400">🎉 สำเร็จ</p>
        ) : row.status === 'overdue' ? (
          <p className="text-[10px] text-red-500">เกิน {Math.abs(row.daysLeft)} วัน</p>
        ) : (
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {row.daysLeft} วัน
            {row.monthlyNeeded > 0 && (
              <span className="block text-[9px]">{formatCurrency(row.monthlyNeeded)}/ด.</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────── */

interface GoalTimelineProps {
  goals: Goal[]
}

export function GoalTimeline({ goals }: GoalTimelineProps) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const { rows, timelineStart, timelineEnd, todayPct, ticks } = useMemo(() => {
    if (goals.length === 0) return { rows: [], timelineStart: today, timelineEnd: today, todayPct: 50, ticks: [] }

    const starts = goals.map((g) => new Date(g.createdAt).getTime())
    const ends   = goals.map((g) => new Date(g.targetDate).getTime())

    // Pad timeline slightly
    const rangeStart = new Date(Math.min(...starts))
    rangeStart.setDate(1)
    const rangeEnd = new Date(Math.max(...ends))
    rangeEnd.setMonth(rangeEnd.getMonth() + 1, 0)

    const range = rangeEnd.getTime() - rangeStart.getTime()

    const todayPct = range > 0 ? ((today.getTime() - rangeStart.getTime()) / range) * 100 : 50

    const rows: GoalRow[] = goals
      .slice()
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
      .map((goal) => {
        const created    = new Date(goal.createdAt); created.setHours(0,0,0,0)
        const targetDate = new Date(goal.targetDate); targetDate.setHours(0,0,0,0)
        const totalMs    = targetDate.getTime() - created.getTime()
        const elapsedMs  = today.getTime() - created.getTime()

        const actualPct   = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0
        const expectedPct = totalMs > 0 ? Math.min(Math.max((elapsedMs / totalMs) * 100, 0), 100) : 0

        const barLeft  = range > 0 ? ((created.getTime() - rangeStart.getTime()) / range) * 100 : 0
        const barWidth = range > 0 ? (totalMs / range) * 100 : 100
        const todayInBar = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0

        const daysLeft  = Math.ceil((targetDate.getTime() - today.getTime()) / 86400000)
        const monthsLeft = Math.max(1, daysLeft / 30)
        const remaining  = goal.targetAmount - goal.savedAmount
        const monthlyNeeded = remaining > 0 && daysLeft > 0 ? remaining / monthsLeft : 0

        const isCompleted = goal.savedAmount >= goal.targetAmount
        const isOverdue   = daysLeft < 0 && !isCompleted
        const deficit     = expectedPct > 0 ? expectedPct - actualPct : 0

        let status: GoalStatus = 'on-track'
        if (isCompleted)       status = 'completed'
        else if (isOverdue)    status = 'overdue'
        else if (deficit > 15) status = 'behind'
        else if (actualPct > expectedPct + 10) status = 'ahead'

        return { goal, status, actualPct, expectedPct, barLeft, barWidth, todayInBar, daysLeft, monthsLeft, monthlyNeeded }
      })

    const ticks = buildTicks(rangeStart, rangeEnd)

    return { rows, timelineStart: rangeStart, timelineEnd: rangeEnd, todayPct, ticks }
  }, [goals, today])

  if (goals.length === 0) return null

  const statusCounts = {
    completed: rows.filter((r) => r.status === 'completed').length,
    ahead:     rows.filter((r) => r.status === 'ahead').length,
    'on-track':rows.filter((r) => r.status === 'on-track').length,
    behind:    rows.filter((r) => r.status === 'behind').length,
    overdue:   rows.filter((r) => r.status === 'overdue').length,
  }

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            ไทม์ไลน์เป้าหมาย
          </CardTitle>
          {/* Status legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {(Object.entries(statusCounts) as [GoalStatus, number][])
              .filter(([, n]) => n > 0)
              .map(([status, count]) => {
                const cfg = STATUS_CONFIG[status]
                return (
                  <span key={status} className={cn('flex items-center gap-1 text-[11px] font-medium', cfg.color)}>
                    <cfg.icon className="w-3 h-3" />{cfg.label} {count}
                  </span>
                )
              })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Month tick axis */}
        <div className="flex items-end ml-[156px] mr-[100px] h-5 relative mb-1">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: `${tick.pct}%` }}
            >
              <div className="w-px h-2 bg-gray-200 dark:bg-gray-700" />
              {tick.label && (
                <span className="text-[9px] text-gray-400 dark:text-gray-600 -translate-x-1/2 whitespace-nowrap">
                  {tick.label}
                </span>
              )}
            </div>
          ))}
          {/* Today label */}
          {todayPct >= 0 && todayPct <= 100 && (
            <div className="absolute bottom-0 flex flex-col items-center z-10" style={{ left: `${todayPct}%` }}>
              <span className="text-[9px] text-blue-400 dark:text-blue-500 font-medium -translate-x-1/2 whitespace-nowrap">วันนี้</span>
            </div>
          )}
        </div>

        {/* Goal rows */}
        <div>
          {rows.map((row) => (
            <TimelineRow key={row.goal.id} row={row} todayPct={todayPct} />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-[10px] text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-8 h-2 rounded-full bg-violet-500 inline-block" /> ออมจริง
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-8 h-2 rounded-full bg-violet-200 dark:bg-violet-900 inline-block" /> ตามแผน (คาด)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-px h-3 bg-blue-400 inline-block" /> วันนี้
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
