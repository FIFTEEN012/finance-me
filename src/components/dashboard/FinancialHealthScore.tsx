'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useNetWorthStore } from '@/store/useNetWorthStore'
import { calcRollover } from '@/lib/utils'

/* ─── Scoring helpers ─────────────────────────────────────── */

function scoreSavingsRate(income: number, expense: number): { score: number; max: number; pct: number | null } {
  const max = 30
  if (income <= 0) return { score: 0, max, pct: null }
  const pct = ((income - expense) / income) * 100
  let score = 0
  if (pct >= 20) score = 30
  else if (pct >= 10) score = 20
  else if (pct > 0) score = 10
  return { score, max, pct }
}

function scoreDebtRatio(totalAssets: number, totalLiabilities: number, hasData: boolean): { score: number; max: number; ratio: number | null } {
  const max = 25
  if (!hasData) return { score: 15, max, ratio: null } // neutral if no net worth data
  if (totalAssets <= 0) return { score: totalLiabilities === 0 ? 15 : 0, max, ratio: null }
  const ratio = (totalLiabilities / totalAssets) * 100
  let score = 0
  if (ratio < 20) score = 25
  else if (ratio < 30) score = 20
  else if (ratio < 50) score = 10
  return { score, max, ratio }
}

function scoreBudgetAdherence(budgets: Array<{ amount: number; categoryId: string; allowRollover?: boolean; month: number; year: number }>, transactions: Array<{ categoryId: string; type: string; amount: number; date: string }>, getBudgetsByMonth: (m: number, y: number) => Array<{ categoryId: string; amount: number; allowRollover?: boolean; month: number; year: number; id: string }>): { score: number; max: number; withinCount: number; total: number } {
  const max = 25
  if (budgets.length === 0) return { score: 15, max, withinCount: 0, total: 0 } // neutral

  let withinCount = 0
  for (const b of budgets) {
    const rollover = calcRollover(b, transactions, getBudgetsByMonth)
    const effective = b.amount + rollover
    const spent = transactions
      .filter((t) => {
        const d = new Date(t.date)
        return t.categoryId === b.categoryId && t.type === 'EXPENSE' && d.getMonth() + 1 === b.month && d.getFullYear() === b.year
      })
      .reduce((s, t) => s + t.amount, 0)
    if (spent <= effective) withinCount++
  }

  const pct = withinCount / budgets.length
  let score = 0
  if (pct === 1) score = 25
  else if (pct >= 0.75) score = 18
  else if (pct >= 0.5) score = 10
  return { score, max, withinCount, total: budgets.length }
}

function scoreTracking(txCount: number): { score: number; max: number } {
  const max = 20
  let score = 0
  if (txCount >= 10) score = 20
  else if (txCount >= 5) score = 15
  else if (txCount >= 1) score = 10
  return { score, max }
}

/* ─── Grade config ────────────────────────────────────────── */

function getGrade(score: number) {
  if (score >= 80) return { label: 'ดีเยี่ยม', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500', ring: '#10b981' }
  if (score >= 60) return { label: 'ดี', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', ring: '#3b82f6' }
  if (score >= 40) return { label: 'พอใช้', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500', ring: '#f59e0b' }
  return { label: 'ควรปรับปรุง', color: 'text-red-500', bg: 'bg-red-500', ring: '#ef4444' }
}

/* ─── SVG Gauge ───────────────────────────────────────────── */

function Gauge({ score, color }: { score: number; color: string }) {
  const r = 52
  const cx = 64
  const cy = 64
  const startAngle = 210  // degrees, bottom-left
  const endAngle = 330    // total sweep = 300 deg

  function polarToXY(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function arc(from: number, to: number) {
    const s = polarToXY(from)
    const e = polarToXY(to)
    const large = to - from > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const sweep = 300
  const filled = (score / 100) * sweep
  const trackEnd = startAngle + sweep
  const fillEnd = startAngle + filled

  return (
    <svg viewBox="0 0 128 90" className="w-36 h-auto mx-auto">
      {/* Track */}
      <path d={arc(startAngle, trackEnd)} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
        className="text-gray-100 dark:text-gray-800" />
      {/* Fill */}
      {score > 0 && (
        <path d={arc(startAngle, fillEnd)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      )}
      {/* Score text */}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{score}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="8" fill="#9ca3af">/ 100</text>
    </svg>
  )
}

/* ─── Mini metric bar ─────────────────────────────────────── */

function MetricRow({ label, score, max, detail }: { label: string; score: number; max: number; detail: string }) {
  const pct = (score / max) * 100
  const barColor = pct >= 80 ? 'bg-violet-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{score}/{max} <span className="text-gray-400 dark:text-gray-500 font-normal">· {detail}</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────── */

export function FinancialHealthScore() {
  const { getSumByTypeAndMonth, getTransactionsByMonth, transactions } = useTransactionStore()
  const { getBudgetsByMonth } = useBudgetStore()
  const { items: netWorthItems } = useNetWorthStore()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const { score, grade, savings, debt, budget, tracking, insight } = useMemo(() => {
    const income = getSumByTypeAndMonth('INCOME', month, year)
    const expense = getSumByTypeAndMonth('EXPENSE', month, year)
    const txThisMonth = getTransactionsByMonth(month, year)
    const budgetsThisMonth = getBudgetsByMonth(month, year)

    const totalAssets = netWorthItems.filter((i) => i.type === 'ASSET').reduce((s, i) => s + i.amount, 0)
    const totalLiabilities = netWorthItems.filter((i) => i.type === 'LIABILITY').reduce((s, i) => s + i.amount, 0)

    const savings = scoreSavingsRate(income, expense)
    const debt = scoreDebtRatio(totalAssets, totalLiabilities, netWorthItems.length > 0)
    const budget = scoreBudgetAdherence(budgetsThisMonth, transactions, getBudgetsByMonth)
    const tracking = scoreTracking(txThisMonth.length)

    const total = savings.score + debt.score + budget.score + tracking.score
    const grade = getGrade(total)

    // Build key insight
    let insight = ''
    if (tracking.score === 0) {
      insight = 'ยังไม่มีรายการธุรกรรมเดือนนี้ — เริ่มบันทึกรายรับ/รายจ่ายเพื่อรับคะแนนเพิ่ม'
    } else if (savings.pct !== null && savings.pct < 0) {
      insight = 'รายจ่ายเดือนนี้เกินรายรับ — ลองตรวจสอบหมวดหมู่ที่ใช้จ่ายสูงสุด'
    } else if (savings.pct !== null && savings.pct < 10) {
      insight = `อัตราการออมเดือนนี้ ${savings.pct.toFixed(1)}% — ตั้งเป้าที่ 20% เพื่อสุขภาพการเงินที่ดี`
    } else if (budget.total > 0 && budget.withinCount < budget.total) {
      const over = budget.total - budget.withinCount
      insight = `${over} หมวดหมู่เกินงบประมาณ — ตรวจสอบหน้างบประมาณเพื่อปรับแผน`
    } else if (debt.ratio !== null && debt.ratio > 50) {
      insight = `หนี้สินคิดเป็น ${debt.ratio.toFixed(1)}% ของสินทรัพย์ — ควรเร่งชำระหนี้`
    } else if (savings.pct !== null && savings.pct >= 20) {
      insight = `ยอดเยี่ยม! อัตราการออม ${savings.pct.toFixed(1)}% — คุณกำลังดูแลการเงินได้ดีมาก`
    } else {
      insight = 'ทำต่อเนื่องไป — การบันทึกสม่ำเสมอช่วยให้คุณเห็นภาพการเงินชัดขึ้น'
    }

    return { score: total, grade, savings, debt, budget, tracking, insight }
  }, [getSumByTypeAndMonth, getTransactionsByMonth, getBudgetsByMonth, netWorthItems, transactions, month, year])

  // Detail text for each metric
  const savingsDetail = savings.pct === null ? 'ยังไม่มีรายรับ' : `${savings.pct.toFixed(1)}%`
  const debtDetail = debt.ratio === null ? (netWorthItems.length === 0 ? 'ยังไม่มีข้อมูล' : 'ไม่มีสินทรัพย์') : `${debt.ratio.toFixed(1)}%`
  const budgetDetail = budget.total === 0 ? 'ยังไม่ตั้งงบ' : `${budget.withinCount}/${budget.total} หมวด`
  const trackingDetail = `${useTransactionStore.getState().getTransactionsByMonth(month, year).length} รายการ`

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">สุขภาพการเงิน</CardTitle>
          <Link
            href="/dashboard/health"
            className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-medium"
          >
            ดูรายละเอียด →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gauge + grade */}
        <div className="flex flex-col items-center gap-1">
          <Gauge score={score} color={grade.ring} />
          <span className={`text-sm font-bold ${grade.color}`}>{grade.label}</span>
        </div>

        {/* Insight */}
        <div className="text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">
          {insight}
        </div>

        {/* Metric breakdown */}
        <div className="space-y-2.5">
          <MetricRow label="อัตราการออม" score={savings.score} max={savings.max} detail={savingsDetail} />
          <MetricRow label="หนี้สินต่อสินทรัพย์" score={debt.score} max={debt.max} detail={debtDetail} />
          <MetricRow label="ปฏิบัติตามงบประมาณ" score={budget.score} max={budget.max} detail={budgetDetail} />
          <MetricRow label="ความสม่ำเสมอในการบันทึก" score={tracking.score} max={tracking.max} detail={trackingDetail} />
        </div>
      </CardContent>
    </Card>
  )
}
