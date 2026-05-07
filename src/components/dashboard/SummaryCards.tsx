'use client'

import { TrendingUp, TrendingDown, Scale } from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useNetWorthStore } from '@/store/useNetWorthStore'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CardConfig {
  label: string
  value: number
  icon: React.ElementType
  accent: string
  iconGradient: string
  valueColor: string
  change: number | null
  changeLabel?: string
  positiveIsGood: boolean
  badge?: { text: string; color: string }
}

export function SummaryCards() {
  const { getSumByTypeAndMonth } = useTransactionStore()
  const { items: nwItems } = useNetWorthStore()

  const now = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year

  const income  = getSumByTypeAndMonth('INCOME',  month, year)
  const expense = getSumByTypeAndMonth('EXPENSE', month, year)

  const prevIncome  = getSumByTypeAndMonth('INCOME',  prevMonth, prevYear)
  const prevExpense = getSumByTypeAndMonth('EXPENSE', prevMonth, prevYear)

  const incomeChange  = prevIncome  === 0 ? null : ((income  - prevIncome)  / prevIncome)  * 100
  const expenseChange = prevExpense === 0 ? null : ((expense - prevExpense) / prevExpense) * 100

  // Net Worth from net worth store
  const totalAssets      = nwItems.filter((i) => i.type === 'ASSET').reduce((s, i) => s + i.amount, 0)
  const totalLiabilities = nwItems.filter((i) => i.type === 'LIABILITY').reduce((s, i) => s + i.amount, 0)
  const netWorth         = totalAssets - totalLiabilities

  const monthlyNet = income - expense
  const nwChange = netWorth > 0 && monthlyNet !== 0
    ? (monthlyNet / Math.abs(netWorth)) * 100
    : null

  const cards: CardConfig[] = [
    {
      label:          'Net Worth',
      value:          netWorth,
      icon:           Scale,
      accent:         'card-accent-violet',
      iconGradient:   'from-violet-500 to-indigo-500',
      valueColor:     'text-gray-900 dark:text-white',
      change:         nwChange,
      changeLabel:    'เดือนนี้',
      positiveIsGood: true,
    },
    {
      label:          'รายรับเดือนนี้',
      value:          income,
      icon:           TrendingUp,
      accent:         'card-accent-green',
      iconGradient:   'from-emerald-500 to-green-500',
      valueColor:     'text-emerald-600 dark:text-emerald-400',
      change:         incomeChange,
      changeLabel:    'เดือนก่อน',
      positiveIsGood: true,
    },
    {
      label:          'รายจ่ายเดือนนี้',
      value:          expense,
      icon:           TrendingDown,
      accent:         'card-accent-red',
      iconGradient:   'from-red-500 to-rose-500',
      valueColor:     'text-red-500 dark:text-red-400',
      change:         expenseChange,
      changeLabel:    'เดือนก่อน',
      positiveIsGood: false,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            card.accent,
            'rounded-2xl border border-gray-100 dark:border-white/[0.08]',
            'bg-white dark:bg-white/[0.04] dark:backdrop-blur-xl',
            'shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(124,58,237,0.06)]',
            'dark:shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_4px_20px_rgba(0,0,0,0.3)]',
            'transition-all duration-200 hover:-translate-y-0.5',
            'hover:shadow-[0_4px_24px_rgba(124,58,237,0.12)]',
            'dark:hover:bg-white/[0.06] dark:hover:border-white/[0.12] dark:hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]',
          )}
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-gray-400 dark:text-white/40 mb-2 uppercase tracking-wider">
                  {card.label}
                </p>
                <p className={cn('text-2xl font-bold num leading-none', card.valueColor)}>
                  {formatCurrency(card.value)}
                </p>
                {card.change !== null && (
                  <div className={cn(
                    'inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 rounded-full text-xs font-medium',
                    card.positiveIsGood
                      ? card.change >= 0
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                      : card.change >= 0
                        ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                  )}>
                    <span>{card.positiveIsGood ? (card.change >= 0 ? '↑' : '↓') : (card.change >= 0 ? '↑' : '↓')}</span>
                    <span className="num">{Math.abs(card.change).toFixed(1)}%</span>
                    <span className="text-[10px] opacity-70">{card.changeLabel}</span>
                  </div>
                )}
              </div>

              <div className={cn(
                'flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl',
                'bg-gradient-to-br',
                card.iconGradient,
                'shadow-[0_2px_8px_rgba(0,0,0,0.18)]',
              )}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
