'use client'

import { useMemo } from 'react'
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Zap, Target, Flame, Info, Lightbulb,
} from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

type InsightLevel = 'warning' | 'success' | 'info' | 'tip'

interface Insight {
  id:      string
  level:   InsightLevel
  icon:    React.ElementType
  title:   string
  body:    string
  metric?: string
  metricColor?: string
}

const LEVEL_STYLE: Record<InsightLevel, { bg: string; border: string; icon: string; badge: string }> = {
  warning: {
    bg:     'bg-orange-50 dark:bg-orange-500/8',
    border: 'border-orange-200/60 dark:border-orange-500/20',
    icon:   'text-orange-500',
    badge:  'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400',
  },
  success: {
    bg:     'bg-violet-50 dark:bg-violet-500/8',
    border: 'border-violet-200/60 dark:border-violet-500/20',
    icon:   'text-violet-600 dark:text-violet-400',
    badge:  'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
  info: {
    bg:     'bg-blue-50 dark:bg-blue-500/8',
    border: 'border-blue-200/60 dark:border-blue-500/20',
    icon:   'text-blue-500',
    badge:  'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  tip: {
    bg:     'bg-gray-50 dark:bg-white/[0.03]',
    border: 'border-gray-200/60 dark:border-white/[0.06]',
    icon:   'text-gray-400 dark:text-white/40',
    badge:  'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50',
  },
}

const SCORE_LABEL = ['ต้องปรับปรุง', 'พอใช้', 'ดี', 'ยอดเยี่ยม']
const SCORE_COLOR = [
  'text-red-500', 'text-orange-500', 'text-blue-500', 'text-violet-600 dark:text-violet-400'
]
const SCORE_BAR = [
  'bg-red-400', 'bg-orange-400', 'bg-blue-500', 'bg-gradient-to-r from-violet-500 to-indigo-500'
]

export function SpendingInsights() {
  const { transactions, getSumByTypeAndMonth, getTransactionsByMonth } = useTransactionStore()
  const { getBudgetsByMonth } = useBudgetStore()
  const { categories, getCategoryById } = useCategoryStore()

  const now      = new Date()
  const month    = now.getMonth() + 1
  const year     = now.getFullYear()
  const prevM    = month === 1 ? 12 : month - 1
  const prevY    = month === 1 ? year - 1 : year

  const insights = useMemo((): Insight[] => {
    const list: Insight[] = []

    const curIncome  = getSumByTypeAndMonth('INCOME',  month, year)
    const curExpense = getSumByTypeAndMonth('EXPENSE', month, year)
    const prevIncome = getSumByTypeAndMonth('INCOME',  prevM, prevY)
    const prevExpense= getSumByTypeAndMonth('EXPENSE', prevM, prevY)

    const curTx  = getTransactionsByMonth(month, year)
    const prevTx = getTransactionsByMonth(prevM, prevY)

    /* ── 1. Savings rate ── */
    if (curIncome > 0) {
      const rate = ((curIncome - curExpense) / curIncome) * 100
      if (rate >= 20) {
        list.push({ id: 'savings-good', level: 'success', icon: CheckCircle2,
          title: 'อัตราออมเกิน 20%',
          body: `คุณออมได้ ${rate.toFixed(1)}% ของรายรับเดือนนี้ ถือว่าอยู่ในเกณฑ์ดีมาก`,
          metric: `${rate.toFixed(1)}%`, metricColor: 'text-violet-600 dark:text-violet-400' })
      } else if (rate < 0) {
        list.push({ id: 'savings-neg', level: 'warning', icon: AlertTriangle,
          title: 'รายจ่ายเกินรายรับ',
          body: `เดือนนี้รายจ่ายเกินรายรับไป ${formatCurrency(curExpense - curIncome)} ควรตรวจสอบรายจ่ายที่ไม่จำเป็น`,
          metric: `${Math.abs(rate).toFixed(1)}%`, metricColor: 'text-red-500' })
      } else {
        list.push({ id: 'savings-low', level: 'warning', icon: Target,
          title: 'อัตราออมต่ำกว่าเป้า',
          body: `ออมได้ ${rate.toFixed(1)}% เป้าหมายแนะนำคือ 20% ลองลดรายจ่ายที่ไม่จำเป็น`,
          metric: `${rate.toFixed(1)}%`, metricColor: 'text-orange-500' })
      }
    }

    /* ── 2. Biggest expense category spike ── */
    const expCats = categories.filter(c => c.type === 'EXPENSE')
    let biggestSpike = { catName: '', pct: 0, curAmt: 0 }

    for (const cat of expCats) {
      const cur  = curTx .filter(t => t.type === 'EXPENSE' && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0)
      const prev = prevTx.filter(t => t.type === 'EXPENSE' && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0)
      if (prev > 0 && cur > 0) {
        const pct = ((cur - prev) / prev) * 100
        if (pct > biggestSpike.pct && pct >= 20 && cur >= 500) {
          biggestSpike = { catName: cat.name, pct, curAmt: cur }
        }
      }
    }
    if (biggestSpike.pct > 0) {
      list.push({ id: 'cat-spike', level: 'warning', icon: TrendingUp,
        title: `${biggestSpike.catName} พุ่งขึ้น`,
        body: `รายจ่าย "${biggestSpike.catName}" เพิ่มขึ้น ${biggestSpike.pct.toFixed(0)}% จากเดือนก่อน เป็น ${formatCurrency(biggestSpike.curAmt)}`,
        metric: `+${biggestSpike.pct.toFixed(0)}%`, metricColor: 'text-orange-500' })
    }

    /* ── 3. Biggest expense category drop (positive) ── */
    let biggestDrop = { catName: '', pct: 0 }
    for (const cat of expCats) {
      const cur  = curTx .filter(t => t.type === 'EXPENSE' && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0)
      const prev = prevTx.filter(t => t.type === 'EXPENSE' && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0)
      if (prev > 0 && cur > 0) {
        const pct = ((prev - cur) / prev) * 100
        if (pct > biggestDrop.pct && pct >= 15 && prev >= 500) {
          biggestDrop = { catName: cat.name, pct }
        }
      }
    }
    if (biggestDrop.pct > 0) {
      list.push({ id: 'cat-drop', level: 'success', icon: TrendingDown,
        title: `${biggestDrop.catName} ลดลง`,
        body: `รายจ่าย "${biggestDrop.catName}" ลดลง ${biggestDrop.pct.toFixed(0)}% จากเดือนก่อน ทำได้ดีมาก`,
        metric: `-${biggestDrop.pct.toFixed(0)}%`, metricColor: 'text-violet-600 dark:text-violet-400' })
    }

    /* ── 4. Budget over-limit ── */
    const budgets = getBudgetsByMonth(month, year)
    const overBudget = budgets
      .map(b => {
        const spent = curTx.filter(t => t.type === 'EXPENSE' && t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0)
        const cat   = getCategoryById(b.categoryId)
        return { catName: cat?.name ?? '—', spent, limit: b.amount, pct: (spent / b.amount) * 100 }
      })
      .filter(b => b.pct > 100)
      .sort((a, b) => b.pct - a.pct)

    if (overBudget.length > 0) {
      const worst = overBudget[0]
      const extra = overBudget.length > 1 ? ` (+${overBudget.length - 1} อื่น)` : ''
      list.push({ id: 'budget-over', level: 'warning', icon: AlertTriangle,
        title: `งบ "${worst.catName}" เกินแล้ว${extra}`,
        body: `ใช้ไป ${formatCurrency(worst.spent)} จากงบ ${formatCurrency(worst.limit)} (${worst.pct.toFixed(0)}%)`,
        metric: `${worst.pct.toFixed(0)}%`, metricColor: 'text-red-500' })
    } else if (budgets.length > 0) {
      const nearLimit = budgets
        .map(b => {
          const spent = curTx.filter(t => t.type === 'EXPENSE' && t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0)
          return (spent / b.amount) * 100
        })
        .filter(p => p >= 80)
      if (nearLimit.length > 0) {
        list.push({ id: 'budget-near', level: 'info', icon: Flame,
          title: `${nearLimit.length} หมวดใกล้เต็มงบ`,
          body: `มี ${nearLimit.length} หมวดหมู่ที่ใช้งบเกิน 80% แล้ว ควรระวังรายจ่ายที่เหลือ`,
          metric: `${nearLimit.length} หมวด` })
      } else {
        list.push({ id: 'budget-ok', level: 'success', icon: CheckCircle2,
          title: 'งบประมาณอยู่ในเกณฑ์ดี',
          body: 'ทุกหมวดหมู่ยังอยู่ในงบที่ตั้งไว้ รักษาระดับนี้ต่อไป',
          metric: '✓ ปกติ' })
      }
    }

    /* ── 5. Daily spend rate ── */
    if (curExpense > 0) {
      const dayOfMonth = now.getDate()
      const dailyRate  = curExpense / dayOfMonth
      const daysLeft   = new Date(year, month, 0).getDate() - dayOfMonth
      const projMonth  = curExpense + dailyRate * daysLeft

      if (prevExpense > 0) {
        const prevDays    = new Date(prevY, prevM, 0).getDate()
        const prevDaily   = prevExpense / prevDays
        const ratioChange = ((dailyRate - prevDaily) / prevDaily) * 100

        if (ratioChange > 20) {
          list.push({ id: 'daily-rate', level: 'warning', icon: Zap,
            title: 'อัตราใช้จ่ายต่อวันสูงขึ้น',
            body: `ใช้จ่ายเฉลี่ย ${formatCurrency(dailyRate)}/วัน (+${ratioChange.toFixed(0)}% จากเดือนก่อน) คาดเดือนนี้รวม ${formatCurrency(projMonth)}`,
            metric: `฿${Math.round(dailyRate).toLocaleString()}/วัน`, metricColor: 'text-orange-500' })
        } else {
          list.push({ id: 'daily-rate', level: 'info', icon: Zap,
            title: 'อัตราใช้จ่ายต่อวัน',
            body: `เฉลี่ย ${formatCurrency(dailyRate)}/วัน คาดว่าสิ้นเดือนจะใช้ไป ${formatCurrency(projMonth)} รวม`,
            metric: `฿${Math.round(dailyRate).toLocaleString()}/วัน` })
        }
      }
    }

    /* ── 6. Top spending category ── */
    const catTotals = expCats.map(cat => ({
      name:  cat.name,
      total: curTx.filter(t => t.type === 'EXPENSE' && t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

    if (catTotals.length > 0 && curExpense > 0) {
      const top = catTotals[0]
      const pct = (top.total / curExpense) * 100
      if (pct >= 30) {
        list.push({ id: 'top-cat', level: 'info', icon: Info,
          title: `"${top.name}" คือรายจ่ายหลัก`,
          body: `คิดเป็น ${pct.toFixed(0)}% ของรายจ่ายทั้งหมดเดือนนี้ (${formatCurrency(top.total)})`,
          metric: `${pct.toFixed(0)}%` })
      }
    }

    /* ── 7. Income growth tip ── */
    if (curIncome > 0 && prevIncome > 0) {
      const growth = ((curIncome - prevIncome) / prevIncome) * 100
      if (growth >= 10) {
        list.push({ id: 'income-grow', level: 'success', icon: TrendingUp,
          title: 'รายรับเพิ่มขึ้น',
          body: `รายรับเดือนนี้ ${formatCurrency(curIncome)} เพิ่มขึ้น ${growth.toFixed(1)}% จากเดือนก่อน`,
          metric: `+${growth.toFixed(1)}%`, metricColor: 'text-violet-600 dark:text-violet-400' })
      }
    }

    /* ── Fallback ── */
    if (list.length === 0) {
      list.push({ id: 'empty', level: 'tip', icon: Lightbulb,
        title: 'เพิ่มข้อมูลธุรกรรมเพื่อดู Insights',
        body: 'บันทึกรายรับ-รายจ่ายของคุณ แล้วระบบจะวิเคราะห์แพทเทิร์นการใช้เงินให้อัตโนมัติ' })
    }

    return list.slice(0, 6)
  }, [transactions, categories, now])

  /* ── Health score (0-3) ── */
  const score = useMemo(() => {
    const curIncome  = getSumByTypeAndMonth('INCOME',  month, year)
    const curExpense = getSumByTypeAndMonth('EXPENSE', month, year)
    if (curIncome === 0) return -1
    const rate    = (curIncome - curExpense) / curIncome
    const budgets = getBudgetsByMonth(month, year)
    const curTx   = getTransactionsByMonth(month, year)
    const overCount = budgets.filter(b => {
      const spent = curTx.filter(t => t.type === 'EXPENSE' && t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0)
      return spent > b.amount
    }).length

    let s = 0
    if (rate >= 0.2) s += 2
    else if (rate >= 0) s += 1
    if (overCount === 0 && budgets.length > 0) s += 1
    return Math.min(s, 3)
  }, [getSumByTypeAndMonth, getBudgetsByMonth, getTransactionsByMonth, month, year])

  const warnCount    = insights.filter(i => i.level === 'warning').length
  const successCount = insights.filter(i => i.level === 'success').length

  return (
    <div className="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50 dark:border-white/[0.04]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Smart Spending Insights</h3>
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">
              วิเคราะห์อัตโนมัติจากข้อมูลธุรกรรมของคุณ
            </p>
          </div>
          {/* Summary badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {warnCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-[11px] font-medium text-orange-600 dark:text-orange-400">
                <AlertTriangle className="w-3 h-3" />{warnCount}
              </span>
            )}
            {successCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                <CheckCircle2 className="w-3 h-3" />{successCount}
              </span>
            )}
          </div>
        </div>

        {/* Health score bar */}
        {score >= 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-gray-400 dark:text-white/40">สุขภาพการเงินเดือนนี้</span>
              <span className={cn('text-[11px] font-semibold', SCORE_COLOR[score])}>
                {SCORE_LABEL[score]}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', SCORE_BAR[score])}
                style={{ width: `${((score + 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Insight cards */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((insight) => {
          const s = LEVEL_STYLE[insight.level]
          return (
            <div
              key={insight.id}
              className={cn('rounded-xl border p-3.5 transition-all duration-150', s.bg, s.border)}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', s.badge)}>
                  <insight.icon className={cn('w-3.5 h-3.5', s.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800 dark:text-white/85 leading-snug">
                      {insight.title}
                    </p>
                    {insight.metric && (
                      <span className={cn('text-xs font-bold num flex-shrink-0', insight.metricColor ?? 'text-gray-500 dark:text-white/50')}>
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-white/40 mt-1 leading-relaxed">
                    {insight.body}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
