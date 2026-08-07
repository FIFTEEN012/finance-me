'use client'

import { useMemo } from 'react'
import { ArrowDown, ArrowUp, BookOpen, Landmark, PiggyBank, Rocket, Users } from 'lucide-react'
import { DashboardForestBoard } from '@/components/dashboard/DashboardForestBoard'
import {
  THAI_DAY_LABELS,
  type BudgetQuestItem,
  type DailyQuestData,
  type DashboardSummaryItem,
  type RewardBadgeItem,
} from '@/components/dashboard/forestDashboard'
import { calcRollover, formatCurrency, formatDateShort } from '@/lib/utils'
import { useBillSplitStore } from '@/store/useBillSplitStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useGoalStore } from '@/store/useGoalStore'
import { useQuickAddStore } from '@/store/useQuickAddStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useTransactionStore } from '@/store/useTransactionStore'

function formatDayKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPreviousMonth(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year }
}

function getChangeData(
  current: number,
  previous: number,
  invertTone = false
): Pick<DashboardSummaryItem, 'changeLabel' | 'changeTone'> {
  if (previous === 0) {
    return {
      changeLabel: 'เทียบเดือนไม่ได้',
      changeTone: 'neutral' as const,
    }
  }

  const delta = Math.round(((current - previous) / Math.abs(previous)) * 100)

  if (delta === 0) {
    return {
      changeLabel: 'ทรงตัว',
      changeTone: 'neutral' as const,
    }
  }

  const positiveTone: DashboardSummaryItem['changeTone'] = invertTone ? 'negative' : 'positive'
  const negativeTone: DashboardSummaryItem['changeTone'] = invertTone ? 'positive' : 'negative'

  return {
    changeLabel: `${delta > 0 ? '+' : ''}${delta}%`,
    changeTone: delta > 0 ? positiveTone : negativeTone,
  }
}

function getLevelTitle(level: number) {
  if (level >= 25) return 'ผู้พิทักษ์คลังสมบัติ'
  if (level >= 18) return 'หัวหน้าภารกิจการเงิน'
  if (level >= 12) return 'นักวางแผนตัวจริง'
  if (level >= 6) return 'นักออมระดับฝึกหัด'
  return 'ผู้เริ่มต้นเส้นทางการเงิน'
}

function clampDay(year: number, month: number, day: number) {
  const maxDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, maxDay))
}

function getPaydayCountdown(paydayDate: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const day = today.getDate()
  const month = today.getMonth()
  const year = today.getFullYear()

  let nextPayday: Date
  if (day <= paydayDate) {
    nextPayday = clampDay(year, month, paydayDate)
  } else {
    nextPayday = clampDay(year, month + 1, paydayDate)
  }

  const daysLeft = Math.round((nextPayday.getTime() - today.getTime()) / 86_400_000)
  const nextDateLabel = nextPayday.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  })

  return {
    daysLeft,
    title: 'วันเงินเดือนออก',
    detail: daysLeft === 0 ? 'เงินเดือนออกวันนี้แล้ว' : `รอบถัดไป ${nextDateLabel}`,
  }
}

export default function DashboardPage() {
  const { transactions, getSumByTypeAndMonth } = useTransactionStore()
  const { goals } = useGoalStore()
  const { splits } = useBillSplitStore()
  const { getCategoryById } = useCategoryStore()
  const { getBudgetsByMonth, getBudgetsByMonth: getBudgetsByMonthFn } = useBudgetStore()
  const paydayDate = useSettingsStore((state) => state.paydayDate)
  const setQuickAddOpen = useQuickAddStore((state) => state.setOpen)

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const todayKey = formatDayKey(now)

  const income = getSumByTypeAndMonth('INCOME', month, year)
  const expense = getSumByTypeAndMonth('EXPENSE', month, year)
  const balance = income - expense

  const previousPeriod = getPreviousMonth(month, year)
  const previousIncome = getSumByTypeAndMonth('INCOME', previousPeriod.month, previousPeriod.year)
  const previousExpense = getSumByTypeAndMonth('EXPENSE', previousPeriod.month, previousPeriod.year)
  const previousBalance = previousIncome - previousExpense

  const completedGoals = goals.filter((goal) => goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount).length
  const monthlyTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.date)
    return date.getMonth() + 1 === month && date.getFullYear() === year
  })

  const activityDays = useMemo(() => {
    return new Set(transactions.map((transaction) => formatDayKey(new Date(transaction.date))))
  }, [transactions])

  const hasLoggedToday = activityDays.has(todayKey)
  const xpTotal = transactions.length * 15 + completedGoals * 100
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0

  const streak = useMemo(() => {
    let currentStreak = 0
    const cursor = new Date(now)
    cursor.setHours(0, 0, 0, 0)

    while (activityDays.has(formatDayKey(cursor))) {
      currentStreak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return currentStreak
  }, [activityDays, now])

  const summaryItems: DashboardSummaryItem[] = [
    {
      id: 'income',
      label: 'รายรับ',
      value: formatCurrency(income),
      tone: 'income' as const,
      ...getChangeData(income, previousIncome),
      Icon: ArrowUp,
    },
    {
      id: 'expense',
      label: 'รายจ่าย',
      value: formatCurrency(expense),
      tone: 'expense' as const,
      ...getChangeData(expense, previousExpense, true),
      Icon: ArrowDown,
    },
    {
      id: 'balance',
      label: 'คงเหลือ',
      value: formatCurrency(balance),
      tone: 'balance' as const,
      ...getChangeData(balance, previousBalance),
      Icon: Landmark,
    },
  ]

  const weeklyDays = useMemo(() => {
    const rawDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now)
      date.setHours(0, 0, 0, 0)
      date.setDate(now.getDate() - (6 - index))
      const key = formatDayKey(date)

      const dailyTransactions = transactions.filter((transaction) => formatDayKey(new Date(transaction.date)) === key)
      const incomeTotal = dailyTransactions
        .filter((transaction) => transaction.type === 'INCOME')
        .reduce((sum, transaction) => sum + transaction.amount, 0)
      const expenseTotal = dailyTransactions
        .filter((transaction) => transaction.type === 'EXPENSE')
        .reduce((sum, transaction) => sum + transaction.amount, 0)

      return {
        id: key,
        label: THAI_DAY_LABELS[date.getDay()],
        incomeTotal,
        expenseTotal,
        isToday: key === todayKey,
      }
    })

    const maxDailyValue = Math.max(1, ...rawDays.flatMap((day) => [day.incomeTotal, day.expenseTotal]))

    return rawDays.map((day) => ({
      ...day,
      incomeHeight: day.incomeTotal > 0 ? Math.max(14, Math.round((day.incomeTotal / maxDailyValue) * 100)) : 0,
      expenseHeight: day.expenseTotal > 0 ? Math.max(10, Math.round((day.expenseTotal / maxDailyValue) * 100)) : 0,
    }))
  }, [now, todayKey, transactions])

  const budgetItems = useMemo<BudgetQuestItem[]>(() => {
    return getBudgetsByMonth(month, year)
      .map((budget) => {
        const spent = transactions
          .filter((transaction) => {
            const date = new Date(transaction.date)
            return (
              transaction.categoryId === budget.categoryId &&
              transaction.type === 'EXPENSE' &&
              date.getMonth() + 1 === month &&
              date.getFullYear() === year
            )
          })
          .reduce((sum, transaction) => sum + transaction.amount, 0)

        const rollover = calcRollover(budget, transactions, getBudgetsByMonthFn)
        const effectiveBudget = budget.amount + rollover
        const progress = effectiveBudget > 0 ? Math.min(100, Math.round((spent / effectiveBudget) * 100)) : 0
        const category = getCategoryById(budget.categoryId)
        const tone: BudgetQuestItem['tone'] = progress >= 90 ? 'red' : progress >= 60 ? 'orange' : 'blue'

        return {
          id: budget.id,
          name: category?.name ?? 'ไม่ทราบหมวดหมู่',
          icon: category?.icon ?? 'Circle',
          iconColor: category?.color ?? '#6f7b64',
          spentLabel: `${formatCurrency(spent)} / ${formatCurrency(effectiveBudget)}`,
          progress,
          tone,
        }
      })
      .sort((left, right) => right.progress - left.progress)
      .slice(0, 3)
  }, [getBudgetsByMonth, getBudgetsByMonthFn, getCategoryById, month, transactions, year])

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 2)
      .map((transaction) => {
        const category = getCategoryById(transaction.categoryId)
        return {
          id: transaction.id,
          title: transaction.description,
          meta: `${formatDateShort(transaction.date)} • ${category?.name ?? 'ไม่มีหมวดหมู่'}`,
          amountLabel: `${transaction.type === 'INCOME' ? '+' : transaction.type === 'EXPENSE' ? '-' : ''}${formatCurrency(transaction.amount)}`,
          amountTone:
            transaction.type === 'INCOME'
              ? ('income' as const)
              : transaction.type === 'EXPENSE'
                ? ('expense' as const)
                : ('transfer' as const),
          icon: category?.icon ?? 'Circle',
          iconColor: category?.color ?? '#6f7b64',
        }
      })
  }, [getCategoryById, transactions])

  const tierGoal = 1000
  const xpIntoTier = xpTotal % tierGoal
  const tierProgressValue = xpTotal > 0 && xpIntoTier === 0 ? tierGoal : xpIntoTier
  const level = Math.max(1, Math.floor(xpTotal / 200))

  const levelProgress = {
    level,
    levelTitle: `${getLevelTitle(level)} • Lv.${level}`,
    progressValue: tierProgressValue,
    progressMax: tierGoal,
    progressLabel: `${tierProgressValue} / ${tierGoal} XP`,
    weekDots: weeklyDays.map((day) => ({
      id: day.id,
      label: day.label,
      active: day.incomeTotal > 0 || day.expenseTotal > 0,
      isToday: day.isToday,
    })),
  }

  const dailyQuest: DailyQuestData = !hasLoggedToday
    ? {
        title: 'เริ่มภารกิจแรกของวัน',
        description: 'บันทึกรายรับหรือรายจ่ายของวันนี้เพื่อรับ 15 XP และทำให้กระดานภารกิจขยับต่อ',
        tone: 'start',
        ctaLabel: 'เพิ่มธุรกรรม',
      }
    : budgetItems.length === 0
      ? {
          title: 'ตั้งงบประมาณ',
          description: 'ตั้งงบประมาณของเดือนนี้เพื่อปลดล็อกการติดตามความคืบหน้ารายหมวดแบบ Forest Polish',
          tone: 'budget',
          ctaLabel: 'ไปตั้งงบประมาณ',
          ctaHref: '/budgets',
        }
      : completedGoals === 0
        ? {
            title: 'ปิดเป้าหมายการออม',
            description: 'เป้าหมายการออมยังไม่สำเร็จสักรายการ ลองเช็กหน้าเป้าหมายและปลดล็อกโบนัส XP เพิ่ม',
            tone: 'goal',
            ctaLabel: 'ดูเป้าหมาย',
            ctaHref: '/goals',
          }
        : {
            title: 'ภารกิจครบแล้ว',
            description: 'วันนี้คุณเคลียร์ภารกิจหลักครบแล้ว เก็บ momentum ต่อด้วยการเช็กงบและธุรกรรมล่าสุดได้เลย',
            tone: 'complete',
          }

  const hero = {
    title: 'ภารกิจการเงินวันนี้',
    subtitle:
      monthlyTransactions.length > 0
        ? `เดือนนี้คุณบันทึกแล้ว ${monthlyTransactions.length} รายการ และสะสม XP ต่อเนื่องเพื่อปลดล็อกเลเวลถัดไป`
        : 'เริ่มบันทึกรายการแรกของเดือนนี้เพื่อเปิดกระดานภารกิจและเก็บ XP ก้าวแรก',
    xpTotalLabel: xpTotal.toLocaleString('th-TH'),
    monthlyLogCount: monthlyTransactions.length,
  }

  const payday = getPaydayCountdown(paydayDate)

  const rewardBadges: RewardBadgeItem[] = [
    {
      id: 'first-step',
      label: 'เริ่มต้นดี',
      unlocked: transactions.length > 0,
      tone: 'orange',
      Icon: Rocket,
    },
    {
      id: 'three-day-streak',
      label: 'บันทึก 3 วัน',
      unlocked: streak >= 3,
      tone: 'green',
      Icon: BookOpen,
    },
    {
      id: 'saver',
      label: 'นักออม',
      unlocked: savingsRate >= 20 || completedGoals > 0,
      tone: 'blue',
      Icon: PiggyBank,
    },
    {
      id: 'sharing',
      label: 'แบ่งปัน',
      unlocked: splits.length > 0,
      tone: 'red',
      Icon: Users,
    },
  ]

  return (
    <DashboardForestBoard
      hero={hero}
      summaryItems={summaryItems}
      weeklyDays={weeklyDays}
      budgetItems={budgetItems}
      recentTransactions={recentTransactions}
      levelProgress={levelProgress}
      dailyQuest={dailyQuest}
      payday={payday}
      rewardBadges={rewardBadges}
      onOpenQuickAdd={() => setQuickAddOpen(true)}
    />
  )
}
