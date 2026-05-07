'use client'

import { useMemo } from 'react'
import { AlertTriangle, TrendingDown, ChevronRight } from 'lucide-react'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { Goal } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface BehindGoal {
  goal: Goal
  expectedSaved: number   // should have saved this much by today at linear pace
  deficit: number         // expectedSaved - savedAmount
  deficitPct: number      // how far behind relative to expected
  monthsLeft: number
  catchupMonthly: number  // need to save this per month to still hit deadline
  originalMonthly: number // original pace when goal was created
}

function analyzePace(goal: Goal): BehindGoal | null {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const created = new Date(goal.createdAt)
  created.setHours(0, 0, 0, 0)

  const target = new Date(goal.targetDate)
  target.setHours(0, 0, 0, 0)

  const isCompleted = goal.savedAmount >= goal.targetAmount
  const isPastDue = target <= now
  if (isCompleted || isPastDue) return null

  const totalMs = target.getTime() - created.getTime()
  const elapsedMs = now.getTime() - created.getTime()
  if (totalMs <= 0 || elapsedMs <= 0) return null

  // Linear expected progress by today
  const elapsedFraction = elapsedMs / totalMs
  const expectedSaved = elapsedFraction * goal.targetAmount

  // Require at least 10% of timeline elapsed before alerting (avoid noise for new goals)
  if (elapsedFraction < 0.1) return null

  const deficit = expectedSaved - goal.savedAmount
  if (deficit <= 0) return null  // ahead of or on pace

  const deficitPct = (deficit / expectedSaved) * 100
  // Only alert if meaningfully behind (>15% behind expected pace)
  if (deficitPct < 15) return null

  const daysLeft = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const monthsLeft = Math.max(1, daysLeft / 30)
  const remaining = goal.targetAmount - goal.savedAmount
  const catchupMonthly = remaining / monthsLeft

  const totalMonths = Math.max(1, totalMs / (1000 * 60 * 60 * 24 * 30))
  const originalMonthly = goal.targetAmount / totalMonths

  return { goal, expectedSaved, deficit, deficitPct, monthsLeft, catchupMonthly, originalMonthly }
}

interface GoalBehindAlertProps {
  goals: Goal[]
}

export function GoalBehindAlert({ goals }: GoalBehindAlertProps) {
  const behindGoals = useMemo(
    () => goals.map(analyzePace).filter((b): b is BehindGoal => b !== null).sort((a, b) => b.deficitPct - a.deficitPct),
    [goals]
  )

  if (behindGoals.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100 dark:border-amber-800/60">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {behindGoals.length} เป้าหมายช้ากว่าแผน
        </p>
        <span className="ml-auto text-xs text-amber-600 dark:text-amber-400">ต้องออมเพิ่มเพื่อทัน</span>
      </div>

      {/* Goal rows */}
      <div className="divide-y divide-amber-100 dark:divide-amber-800/40">
        {behindGoals.map(({ goal, expectedSaved, deficit, deficitPct, monthsLeft, catchupMonthly, originalMonthly }) => {
          const extraPerMonth = catchupMonthly - originalMonthly
          const daysLeft = Math.ceil(monthsLeft * 30)

          return (
            <div key={goal.id} className="px-4 py-3.5">
              {/* Goal name row */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: goal.color + '25' }}>
                  <CategoryIcon name={goal.icon} className="w-4 h-4" style={{ color: goal.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{goal.name}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ช้ากว่าแผน {deficitPct.toFixed(0)}% · เหลืออีก {daysLeft} วัน
                  </p>
                </div>
                <TrendingDown className="w-4 h-4 text-amber-500 flex-shrink-0" />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg px-2 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">ควรออมได้แล้ว</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{formatCurrency(expectedSaved)}</p>
                </div>
                <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg px-2 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">ออมจริง</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{formatCurrency(goal.savedAmount)}</p>
                </div>
                <div className="bg-red-100/60 dark:bg-red-900/30 rounded-lg px-2 py-2">
                  <p className="text-[10px] text-red-500 dark:text-red-400 mb-0.5">ขาด</p>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(deficit)}</p>
                </div>
              </div>

              {/* Catchup message */}
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-900/30 rounded-lg px-3 py-2">
                <ChevronRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>
                  ต้องออม{' '}
                  <span className="font-bold text-amber-700 dark:text-amber-300">{formatCurrency(catchupMonthly)}/เดือน</span>
                  {' '}เพื่อทันกำหนด
                  {extraPerMonth > 0 && (
                    <span className="text-red-500"> (+{formatCurrency(extraPerMonth)} จากแผนเดิม)</span>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
