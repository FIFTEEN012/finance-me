'use client'

import { TrendingUp, Target, Briefcase, PiggyBank } from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useGoalStore } from '@/store/useGoalStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { cn } from '@/lib/utils'

interface MiniStat {
  label: string
  value: string
  sub: string
  icon: React.ElementType
  iconColor: string
  valueColor: string
  trend?: 'up' | 'down' | 'neutral'
}

export function QuickStatsRow() {
  const { getSumByTypeAndMonth, transactions } = useTransactionStore()
  const { getBudgetsByMonth } = useBudgetStore()
  const { goals } = useGoalStore()
  const { holdings } = useInvestmentStore()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  // Savings Rate
  const income  = getSumByTypeAndMonth('INCOME',  month, year)
  const expense = getSumByTypeAndMonth('EXPENSE', month, year)
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0

  // Budget Used %
  const budgets = getBudgetsByMonth(month, year)
  let budgetUsedPct = 0
  if (budgets.length > 0) {
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
    const totalSpent  = budgets.reduce((s, b) => {
      const spent = transactions
        .filter((t) => {
          const d = new Date(t.date)
          return (
            t.categoryId === b.categoryId &&
            t.type === 'EXPENSE' &&
            d.getMonth() + 1 === month &&
            d.getFullYear() === year
          )
        })
        .reduce((sum, t) => sum + t.amount, 0)
      return s + spent
    }, 0)
    budgetUsedPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
  }

  // Active Goals
  const activeGoals = goals.filter((g) => g.savedAmount < g.targetAmount).length

  // Portfolio Return %
  let portfolioReturn = 0
  if (holdings.length > 0) {
    const totalCost  = holdings.reduce((s, h) => s + h.units * h.avgCostPerUnit, 0)
    const totalValue = holdings.reduce((s, h) => s + h.units * h.currentPricePerUnit, 0)
    portfolioReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
  }

  const stats: MiniStat[] = [
    {
      label:      'Savings Rate',
      value:      `${savingsRate}%`,
      sub:        'เดือนนี้',
      icon:       PiggyBank,
      iconColor:  'text-violet-400',
      valueColor: savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 10 ? 'text-amber-400' : 'text-red-400',
      trend:      savingsRate >= 20 ? 'up' : savingsRate >= 10 ? 'neutral' : 'down',
    },
    {
      label:      'งบประมาณที่ใช้',
      value:      budgets.length > 0 ? `${budgetUsedPct}%` : '—',
      sub:        budgets.length > 0 ? `${budgets.length} หมวด` : 'ยังไม่ได้ตั้ง',
      icon:       Target,
      iconColor:  'text-blue-400',
      valueColor: budgetUsedPct > 90 ? 'text-red-400' : budgetUsedPct > 70 ? 'text-amber-400' : 'text-emerald-400',
      trend:      budgetUsedPct > 90 ? 'down' : budgetUsedPct > 70 ? 'neutral' : 'up',
    },
    {
      label:      'เป้าหมายที่ใช้งาน',
      value:      `${activeGoals}`,
      sub:        activeGoals === 1 ? 'เป้าหมาย' : 'เป้าหมาย',
      icon:       TrendingUp,
      iconColor:  'text-amber-400',
      valueColor: 'text-white',
      trend:      'neutral',
    },
    {
      label:      'Portfolio Return',
      value:      holdings.length > 0 ? `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(1)}%` : '—',
      sub:        holdings.length > 0 ? `${holdings.length} รายการ` : 'ยังไม่มีพอร์ต',
      icon:       Briefcase,
      iconColor:  'text-emerald-400',
      valueColor: portfolioReturn > 0 ? 'text-emerald-400' : portfolioReturn < 0 ? 'text-red-400' : 'text-white',
      trend:      portfolioReturn > 0 ? 'up' : portfolioReturn < 0 ? 'down' : 'neutral',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            'rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl',
            'dark:border-white/[0.07] dark:bg-white/[0.03]',
            'border-gray-100 bg-white',
            'px-4 py-3.5 flex items-center gap-3',
            'transition-all duration-200 hover:-translate-y-0.5',
            'shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]',
          )}
        >
          <s.icon className={cn('w-5 h-5 flex-shrink-0 opacity-80', s.iconColor)} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-gray-400 dark:text-white/35 uppercase tracking-wider truncate">
              {s.label}
            </p>
            <p className={cn('text-xl font-bold num leading-none mt-0.5', s.valueColor)}>
              {s.value}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
