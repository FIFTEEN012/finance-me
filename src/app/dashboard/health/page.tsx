'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Shield, Target, BookOpen } from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useNetWorthStore } from '@/store/useNetWorthStore'
import { calcRollover } from '@/lib/utils'

/* ─── Scoring helpers (mirrored from FinancialHealthScore.tsx) ─ */

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
  if (!hasData) return { score: 15, max, ratio: null }
  if (totalAssets <= 0) return { score: totalLiabilities === 0 ? 15 : 0, max, ratio: null }
  const ratio = (totalLiabilities / totalAssets) * 100
  let score = 0
  if (ratio < 20) score = 25
  else if (ratio < 30) score = 20
  else if (ratio < 50) score = 10
  return { score, max, ratio }
}

function scoreBudgetAdherence(
  budgets: Array<{ amount: number; categoryId: string; allowRollover?: boolean; month: number; year: number }>,
  transactions: Array<{ categoryId: string; type: string; amount: number; date: string }>,
  getBudgetsByMonth: (m: number, y: number) => Array<{ categoryId: string; amount: number; allowRollover?: boolean; month: number; year: number; id: string }>,
): { score: number; max: number; withinCount: number; total: number } {
  const max = 25
  if (budgets.length === 0) return { score: 15, max, withinCount: 0, total: 0 }

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

/* ─── Grade config ──────────────────────────────────────────── */

function getGrade(score: number) {
  if (score >= 80) return { label: 'ดีเยี่ยม', color: 'text-violet-600 dark:text-violet-400', ring: '#7c3aed' }
  if (score >= 60) return { label: 'ดี', color: 'text-blue-600 dark:text-blue-400', ring: '#3b82f6' }
  if (score >= 40) return { label: 'พอใช้', color: 'text-yellow-600 dark:text-yellow-400', ring: '#f59e0b' }
  return { label: 'ควรปรับปรุง', color: 'text-red-500', ring: '#ef4444' }
}

/* ─── Large SVG Gauge ───────────────────────────────────────── */

function LargeGauge({ score, color }: { score: number; color: string }) {
  const r = 80
  const cx = 100
  const cy = 100
  const startAngle = 210
  const sweep = 300

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

  const trackEnd = startAngle + sweep
  const filled = (score / 100) * sweep
  const fillEnd = startAngle + filled

  return (
    <svg viewBox="0 0 200 140" className="w-56 h-auto mx-auto">
      <path d={arc(startAngle, trackEnd)} fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round"
        className="text-gray-100 dark:text-gray-800" />
      {score > 0 && (
        <path d={arc(startAngle, fillEnd)} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />
      )}
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="36" fontWeight="700" fill={color}>{score}</text>
      <text x={cx} y={cy + 26} textAnchor="middle" fontSize="12" fill="#9ca3af">/ 100</text>
    </svg>
  )
}

/* ─── Metric section ────────────────────────────────────────── */

interface MetricSectionProps {
  icon: React.ReactNode
  label: string
  score: number
  max: number
  detail: string
  recommendations: string[]
  color: string
}

function MetricSection({ icon, label, score, max, detail, recommendations, color }: MetricSectionProps) {
  const pct = (score / max) * 100
  const barColor = pct >= 80 ? 'bg-violet-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-400'

  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/80">{label}</p>
            <span className="text-sm font-bold num text-gray-700 dark:text-gray-300">{score}<span className="text-xs font-normal text-gray-400 dark:text-white/30">/{max}</span></span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-white/35 mt-1">{detail}</p>
        </div>
      </div>
      <div className="space-y-1.5 mt-2 pt-3 border-t border-gray-50 dark:border-white/[0.04]">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5 flex-shrink-0 text-xs">→</span>
            <p className="text-xs text-gray-500 dark:text-white/50">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────── */

export default function HealthDetailPage() {
  const { getSumByTypeAndMonth, getTransactionsByMonth, transactions } = useTransactionStore()
  const { getBudgetsByMonth } = useBudgetStore()
  const { items: netWorthItems } = useNetWorthStore()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const { score, grade, savings, debt, budget, tracking } = useMemo(() => {
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

    return { score: total, grade, savings, debt, budget, tracking }
  }, [getSumByTypeAndMonth, getTransactionsByMonth, getBudgetsByMonth, netWorthItems, transactions, month, year])

  const prevScore = useMemo(() => {
    const income = getSumByTypeAndMonth('INCOME', prevMonth, prevYear)
    const expense = getSumByTypeAndMonth('EXPENSE', prevMonth, prevYear)
    const txPrev = getTransactionsByMonth(prevMonth, prevYear)
    const budgetsPrev = getBudgetsByMonth(prevMonth, prevYear)
    const totalAssets = netWorthItems.filter((i) => i.type === 'ASSET').reduce((s, i) => s + i.amount, 0)
    const totalLiabilities = netWorthItems.filter((i) => i.type === 'LIABILITY').reduce((s, i) => s + i.amount, 0)

    const s = scoreSavingsRate(income, expense)
    const d = scoreDebtRatio(totalAssets, totalLiabilities, netWorthItems.length > 0)
    const b = scoreBudgetAdherence(budgetsPrev, transactions, getBudgetsByMonth)
    const t = scoreTracking(txPrev.length)
    return s.score + d.score + b.score + t.score
  }, [getSumByTypeAndMonth, getTransactionsByMonth, getBudgetsByMonth, netWorthItems, transactions, prevMonth, prevYear])

  const delta = score - prevScore

  const txCountThisMonth = getTransactionsByMonth(month, year).length

  const savingsDetail = savings.pct === null ? 'ยังไม่มีรายรับ' : `${savings.pct.toFixed(1)}%`
  const debtDetail = debt.ratio === null ? (netWorthItems.length === 0 ? 'ยังไม่มีข้อมูล' : 'ไม่มีสินทรัพย์') : `${debt.ratio.toFixed(1)}%`
  const budgetDetail = budget.total === 0 ? 'ยังไม่ตั้งงบ' : `${budget.withinCount}/${budget.total} หมวด`
  const trackingDetail = `${txCountThisMonth} รายการ`

  const savingsRecs =
    savings.pct === null || savings.pct < 10
      ? ['ลองตั้งเป้าออม 20% ของรายรับก่อน', 'ตรวจสอบหมวดรายจ่ายที่ใช้มากสุด']
      : savings.pct < 20
        ? ['ปรับเพิ่มการออมให้ถึง 20% ของรายรับ', 'พิจารณาลดรายจ่ายที่ไม่จำเป็น']
        : ['ยอดเยี่ยม! รักษาระดับการออมนี้ไว้', 'พิจารณาลงทุนเพื่อผลตอบแทนระยะยาว']

  const debtRecs =
    debt.ratio === null || debt.ratio > 50
      ? ['เร่งชำระหนี้ที่มีดอกเบี้ยสูงก่อน', 'หลีกเลี่ยงการก่อหนี้ใหม่', 'ใช้กลยุทธ์ Avalanche หรือ Snowball']
      : debt.ratio > 30
        ? ['ลดหนี้อย่างสม่ำเสมอทุกเดือน', 'หลีกเลี่ยงการก่อหนี้ใหม่']
        : ['รักษาระดับหนี้สินให้ต่ำ', 'พิจารณาออมเพิ่มแทนการก่อหนี้']

  const budgetRecs =
    budget.total === 0
      ? ['ตั้งงบประมาณให้ครอบคลุมทุกหมวดหมู่', 'เริ่มจากหมวดหมู่หลักก่อน']
      : budget.withinCount < budget.total
        ? ['ตั้งงบประมาณให้ครอบคลุมทุกหมวดหมู่', 'ตรวจสอบหมวดที่เกินงบและปรับแผน']
        : ['รักษาวินัยการใช้จ่ายตามงบ', 'ทบทวนงบประมาณทุกต้นเดือน']

  const trackingRecs =
    txCountThisMonth < 5
      ? ['บันทึกรายการทุกวัน', 'ใช้ Quick Add เพื่อความสะดวก', 'ตั้งเป้าบันทึกอย่างน้อย 10 รายการต่อเดือน']
      : txCountThisMonth < 10
        ? ['บันทึกรายการสม่ำเสมอทุกวัน', 'ใช้ Quick Add เพื่อความสะดวก']
        : ['รักษาความสม่ำเสมอในการบันทึก', 'ตรวจสอบรายการย้อนหลังเป็นประจำ']

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">สุขภาพการเงิน</h2>
        <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">ภาพรวมและคำแนะนำเพื่อพัฒนาสุขภาพการเงิน</p>
      </div>

      {/* Gauge + grade */}
      <div className="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] p-6 flex flex-col items-center gap-3">
        <LargeGauge score={score} color={grade.ring} />
        <p className={`text-2xl font-bold ${grade.color}`}>{grade.label}</p>

        {/* Month delta */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]">
          <span className="text-xs text-gray-400 dark:text-white/35">เทียบเดือนก่อน:</span>
          <span className={`text-sm font-bold num ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-gray-400 dark:text-white/40'}`}>
            {delta > 0 ? '+' : ''}{delta} คะแนน
          </span>
          <span className="text-[10px] text-gray-300 dark:text-white/20">({prevScore} → {score})</span>
        </div>
      </div>

      {/* Metric sections */}
      <div className="space-y-3">
        <MetricSection
          icon={<TrendingUp className="w-5 h-5" />}
          label="อัตราการออม"
          score={savings.score}
          max={savings.max}
          detail={savingsDetail}
          recommendations={savingsRecs}
          color="bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
        />
        <MetricSection
          icon={<Shield className="w-5 h-5" />}
          label="หนี้สินต่อสินทรัพย์"
          score={debt.score}
          max={debt.max}
          detail={debtDetail}
          recommendations={debtRecs}
          color="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
        />
        <MetricSection
          icon={<Target className="w-5 h-5" />}
          label="ปฏิบัติตามงบประมาณ"
          score={budget.score}
          max={budget.max}
          detail={budgetDetail}
          recommendations={budgetRecs}
          color="bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
        />
        <MetricSection
          icon={<BookOpen className="w-5 h-5" />}
          label="ความสม่ำเสมอในการบันทึก"
          score={tracking.score}
          max={tracking.max}
          detail={trackingDetail}
          recommendations={trackingRecs}
          color="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400"
        />
      </div>
    </div>
  )
}
