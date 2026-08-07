import type { LucideIcon } from 'lucide-react'

export interface DashboardHeroData {
  title: string
  subtitle: string
  xpTotalLabel: string
  monthlyLogCount: number
}

export interface DashboardSummaryItem {
  id: string
  label: string
  value: string
  tone: 'income' | 'expense' | 'balance'
  changeLabel: string
  changeTone: 'positive' | 'negative' | 'neutral'
  Icon: LucideIcon
}

export interface WeeklyOverviewDay {
  id: string
  label: string
  incomeTotal: number
  expenseTotal: number
  incomeHeight: number
  expenseHeight: number
  isToday: boolean
}

export interface BudgetQuestItem {
  id: string
  name: string
  icon: string
  iconColor: string
  spentLabel: string
  progress: number
  tone: 'orange' | 'blue' | 'red'
}

export interface RecentQuestTransaction {
  id: string
  title: string
  meta: string
  amountLabel: string
  amountTone: 'income' | 'expense' | 'transfer'
  icon: string
  iconColor: string
}

export interface LevelProgressDot {
  id: string
  label: string
  active: boolean
  isToday: boolean
}

export interface LevelProgressData {
  level: number
  levelTitle: string
  progressValue: number
  progressMax: number
  progressLabel: string
  weekDots: LevelProgressDot[]
}

export interface DailyQuestData {
  title: string
  description: string
  tone: 'start' | 'budget' | 'goal' | 'complete'
  ctaLabel?: string
  ctaHref?: string
}

export interface PaydayMiniData {
  title: string
  detail: string
  daysLeft: number
}

export interface RewardBadgeItem {
  id: string
  label: string
  unlocked: boolean
  tone: 'orange' | 'green' | 'blue' | 'red'
  Icon: LucideIcon
}

export const THAI_DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
