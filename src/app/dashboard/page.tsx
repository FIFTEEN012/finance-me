'use client'

import { useMemo } from 'react'
import {
  Flame,
  Star,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  Trophy,
  Coins,
  ShieldCheck,
  BookOpen,
  Wallet,
} from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useGoalStore } from '@/store/useGoalStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { formatCurrency, THAI_MONTHS } from '@/lib/utils'
import { PressCard, XpBar, WeekDot, ChallengeCard, AchievCard } from '@/components/ui/PressCard'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { BudgetProgressList } from '@/components/dashboard/BudgetProgressList'
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart'
import { PaydayCountdown } from '@/components/dashboard/PaydayCountdown'

const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

export default function DashboardPage() {
  const { transactions, getSumByTypeAndMonth } = useTransactionStore()
  const { goals } = useGoalStore()
  const { holdings } = useInvestmentStore()
  const { getBudgetsByMonth } = useBudgetStore()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthName = THAI_MONTHS[now.getMonth()]
  const yearThai = year + 543
  const todayDay = (now.getDay() + 6) % 7
  const todayStr = now.toISOString().slice(0, 10)

  const income = getSumByTypeAndMonth('INCOME', month, year)
  const expense = getSumByTypeAndMonth('EXPENSE', month, year)
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
  const budgets = getBudgetsByMonth(month, year)
  const hasBudget = budgets.length > 0
  const completedGoals = goals.filter((goal) => goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount).length
  const hasLoggedToday = transactions.some((transaction) => transaction.date.slice(0, 10) === todayStr)

  const portfolioReturn = useMemo(() => {
    if (!holdings.length) return 0
    const cost = holdings.reduce((sum, holding) => sum + holding.units * holding.avgCostPerUnit, 0)
    const value = holdings.reduce((sum, holding) => sum + holding.units * holding.currentPricePerUnit, 0)
    return cost > 0 ? ((value - cost) / cost) * 100 : 0
  }, [holdings])

  const { streak, xpToday, weekActive } = useMemo(() => {
    const activityDays = new Set(transactions.map((transaction) => transaction.date.slice(0, 10)))

    let currentStreak = 0
    const cursor = new Date(now)
    while (activityDays.has(cursor.toISOString().slice(0, 10))) {
      currentStreak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    const activeWeek = DAYS.map((_, index) => {
      const day = new Date(now)
      day.setDate(day.getDate() - (todayDay - index))
      return index <= todayDay && activityDays.has(day.toISOString().slice(0, 10))
    })

    return {
      streak: currentStreak,
      xpToday: transactions.filter((transaction) => transaction.date.slice(0, 10) === todayStr).length * 15,
      weekActive: activeWeek,
    }
  }, [now, todayDay, todayStr, transactions])

  const xpTotal = transactions.length * 15 + completedGoals * 100
  const xpGoal = Math.max(500, Math.ceil(xpTotal / 500) * 500)
  const budgetDays = Math.min(now.getDate(), 30)
  const challengesDone = [hasLoggedToday, hasBudget, completedGoals > 0].filter(Boolean).length

  return (
    <div className="space-y-8 pb-24 text-slate-800 dark:text-slate-100">
      <PressCard
        shadow="0 6px 0 0 #2b6c00"
        shadowHover="0 3px 0 0 #2b6c00"
        className="relative overflow-hidden rounded-3xl border-2 border-[#2b6c00] bg-gradient-to-r from-[#58cc02] to-[#2b6c00] p-6 text-white"
      >
        <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-3xl">
              🦉
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight md:text-2xl">สวัสดี! มาจัดการการเงินของเดือนนี้กันต่อ</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-green-100 opacity-90">
                {monthName} {yearThai}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-white/25 bg-black/10 p-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-600 bg-amber-500 px-3 py-1 text-white shadow-[0_3px_0_0_#b45309]">
              <Flame className="h-4 w-4 fill-white" />
              <span className="num text-sm font-black">{streak}</span>
              <span className="text-[10px] font-bold">วัน</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold opacity-80">วันนี้: +{xpToday} XP</span>
              <span className="block text-[10px] font-medium opacity-65">สะสม: {xpTotal} XP</span>
            </div>
          </div>
        </div>
      </PressCard>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PressCard
          shadow="0 6px 0 0 #e5e5e5"
          shadowHover="0 3px 0 0 #e5e5e5"
          className="rounded-3xl border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-black text-slate-800 dark:text-white">
                <Star className="h-4 w-4 fill-indigo-500 text-indigo-500" />
                Financial Health XP
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Lv. 5 Pioneer</p>
            </div>
            <div className="text-right">
              <span className="num text-xl font-black text-indigo-600 dark:text-indigo-400">{xpTotal}</span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500"> / {xpGoal} XP</span>
            </div>
          </div>

          <XpBar value={xpTotal} max={xpGoal} color="#58cc02" />

          <div className="mt-3 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400 dark:text-slate-500">{Math.round((xpTotal / xpGoal) * 100)}% เสร็จสิ้น</span>
            <span className="flex items-center gap-1 text-amber-500">
              <Trophy className="h-3.5 w-3.5 fill-amber-500/20" />
              อีก {Math.max(0, xpGoal - xpTotal)} XP เพื่ออัปเลเวล
            </span>
          </div>
        </PressCard>

        <PressCard
          shadow="0 6px 0 0 #e5e5e5"
          shadowHover="0 3px 0 0 #e5e5e5"
          className="rounded-3xl border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="mb-4 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">ความต่อเนื่องสัปดาห์นี้</p>
          <div className="flex items-center justify-between">
            {DAYS.map((day, index) => (
              <WeekDot key={day} label={day} active={weekActive[index] ?? false} today={index === todayDay} />
            ))}
          </div>
        </PressCard>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">สถิติเควสเดือนนี้</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <PressCard shadow="0 5px 0 0 #065f46" shadowHover="0 3px 0 0 #065f46" className="flex h-28 flex-col justify-between rounded-2xl border-emerald-400 bg-emerald-500 p-4 text-white">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">รายรับ</span>
              <TrendingUp className="h-4 w-4 text-emerald-100" />
            </div>
            <p className="num truncate text-lg font-black leading-none md:text-xl">{formatCurrency(income)}</p>
          </PressCard>

          <PressCard shadow="0 5px 0 0 #9f1239" shadowHover="0 3px 0 0 #9f1239" className="flex h-28 flex-col justify-between rounded-2xl border-rose-400 bg-rose-500 p-4 text-white">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-100">รายจ่าย</span>
              <TrendingDown className="h-4 w-4 text-rose-100" />
            </div>
            <p className="num truncate text-lg font-black leading-none md:text-xl">{formatCurrency(expense)}</p>
          </PressCard>

          <PressCard shadow="0 5px 0 0 #1e3a8a" shadowHover="0 3px 0 0 #1e3a8a" className="flex h-28 flex-col justify-between rounded-2xl border-blue-400 bg-blue-500 p-4 text-white">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">อัตราออม</span>
              <Coins className="h-4 w-4 text-blue-100" />
            </div>
            <p className="num text-lg font-black leading-none md:text-xl">{savingsRate}%</p>
          </PressCard>

          <PressCard shadow="0 5px 0 0 #5b21b6" shadowHover="0 3px 0 0 #5b21b6" className="flex h-28 flex-col justify-between rounded-2xl border-violet-400 bg-violet-500 p-4 text-white">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-100">พอร์ตลงทุน</span>
              <Wallet className="h-4 w-4 text-violet-100" />
            </div>
            <p className="num truncate text-lg font-black leading-none md:text-xl">
              {holdings.length ? `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(1)}%` : '—'}
            </p>
          </PressCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-800 dark:text-white">
              <Zap className="h-4 w-4 fill-amber-500/20 text-amber-500" />
              ภารกิจวันนี้
            </h2>
            <span className="text-xs font-black text-[#58cc02]">{challengesDone} / 3 สำเร็จ</span>
          </div>
          <div className="space-y-2.5">
            <ChallengeCard
              icon={BookOpen}
              title="บันทึกรายรับ/รายจ่าย"
              subtitle={hasLoggedToday ? 'บันทึกเรียบร้อยแล้ว' : 'เพิ่มรายการธุรกรรมอย่างน้อย 1 รายการ'}
              xp={15}
              done={hasLoggedToday}
              color="#58cc02"
              borderColor="#58cc02"
              shadow="0 4px 0 0 #2b6c00"
            />
            <ChallengeCard
              icon={Target}
              title="ตั้งงบประมาณเดือนนี้"
              subtitle={hasBudget ? 'ตั้งงบประมาณเรียบร้อย' : 'เปิดและดูแลงบประมาณของเดือนนี้'}
              xp={20}
              done={hasBudget}
              color="#3b82f6"
              borderColor="#60a5fa"
              shadow="0 4px 0 0 #1d4ed8"
            />
            <ChallengeCard
              icon={ShieldCheck}
              title="ปิดเป้าหมายออมอย่างน้อย 1 รายการ"
              subtitle={completedGoals > 0 ? 'มีเป้าหมายที่สำเร็จแล้ว' : 'โฟกัสการออมเพื่อปลดล็อกเหรียญ'}
              xp={25}
              done={completedGoals > 0}
              color="#ec4899"
              borderColor="#f472b6"
              shadow="0 4px 0 0 #9d174d"
            />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="flex items-center gap-1.5 px-1 text-xs font-black uppercase text-slate-800 dark:text-white">
            <Target className="h-4 w-4 text-violet-500" />
            ความคืบหน้าการเงิน
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PressCard shadow="0 5px 0 0 #5b21b6" shadowHover="0 3px 0 0 #5b21b6" className="flex h-36 flex-col justify-between rounded-2xl border-violet-400 bg-violet-500 p-5 text-white">
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-100">เป้าหมายสำเร็จ</p>
                <Trophy className="h-5 w-5 text-violet-200" />
              </div>
              <div>
                <p className="num text-2xl font-black">{completedGoals}</p>
                <p className="mt-1 text-[10px] text-violet-100 opacity-80">จากทั้งหมด {goals.length} เป้าหมาย</p>
              </div>
            </PressCard>

            <PressCard shadow="0 5px 0 0 #0369a1" shadowHover="0 3px 0 0 #0369a1" className="flex h-36 flex-col justify-between rounded-2xl border-sky-400 bg-sky-500 p-5 text-white">
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-sky-100">วันในงบ</p>
                <ShieldCheck className="h-5 w-5 text-sky-200" />
              </div>
              <div>
                <p className="num text-xl font-black leading-tight">{budgetDays} วัน</p>
                <p className="mt-1 text-[10px] text-sky-100 opacity-80">{hasBudget ? 'มีงบประมาณกำกับอยู่' : 'ยังไม่ได้ตั้งงบของเดือนนี้'}</p>
              </div>
            </PressCard>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-1.5 px-1 text-xs font-black uppercase text-slate-800 dark:text-white">
          <Trophy className="h-4 w-4 text-amber-500" />
          เหรียญความสำเร็จ
        </h2>
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0">
          <div className="w-44 flex-shrink-0">
            <AchievCard
              label="Savings Rate"
              value={`${savingsRate}%`}
              icon={Coins}
              borderColor={savingsRate >= 20 ? '#34d399' : '#fbbf24'}
              shadowColor={savingsRate >= 20 ? '#065f46' : '#92400e'}
              iconBg={savingsRate >= 20 ? '#d1fae5' : '#fef3c7'}
              iconColor={savingsRate >= 20 ? '#059669' : '#d97706'}
            />
          </div>
          <div className="w-44 flex-shrink-0">
            <AchievCard
              label="อยู่ในงบ"
              value={`${budgetDays}`}
              unit="วัน"
              icon={ShieldCheck}
              borderColor={hasBudget ? '#818cf8' : '#e5e7eb'}
              shadowColor={hasBudget ? '#3730a3' : '#d1d5db'}
              iconBg={hasBudget ? '#e0e7ff' : '#f3f4f6'}
              iconColor={hasBudget ? '#4f46e5' : '#9ca3af'}
            />
          </div>
          <div className="w-44 flex-shrink-0">
            <AchievCard
              label="เป้าหมายสำเร็จ"
              value={`${completedGoals}`}
              unit={`/ ${goals.length}`}
              icon={Target}
              borderColor="#f472b6"
              shadowColor="#9d174d"
              iconBg="#fce7f3"
              iconColor="#db2777"
            />
          </div>
          <div className="w-44 flex-shrink-0">
            <AchievCard
              label="พอร์ตลงทุน"
              value={holdings.length ? `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(1)}%` : '—'}
              icon={TrendingUp}
              borderColor={portfolioReturn >= 0 ? '#34d399' : '#f87171'}
              shadowColor={portfolioReturn >= 0 ? '#065f46' : '#9f1239'}
              iconBg={portfolioReturn >= 0 ? '#d1fae5' : '#fee2e2'}
              iconColor={portfolioReturn >= 0 ? '#059669' : '#ef4444'}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <PaydayCountdown />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="px-1 text-xs font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">ธุรกรรมล่าสุด</h3>
            <PressCard shadow="0 5px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="overflow-hidden rounded-3xl border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900">
              <RecentTransactions className="rounded-none border-0 shadow-none dark:bg-transparent dark:hover:bg-transparent" />
            </PressCard>
          </div>

          <div className="space-y-2">
            <h3 className="px-1 text-xs font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">งบประมาณประจำเดือน</h3>
            <PressCard shadow="0 5px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="overflow-hidden rounded-3xl border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900">
              <BudgetProgressList className="rounded-none border-0 shadow-none dark:bg-transparent dark:hover:bg-transparent" />
            </PressCard>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="px-1 text-xs font-black uppercase tracking-widest text-slate-405 dark:text-slate-500">สัดส่วนการใช้จ่ายรายหมวดหมู่</h3>
          <PressCard shadow="0 5px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="mx-auto max-w-2xl overflow-hidden rounded-3xl border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900">
            <CategoryPieChart className="rounded-none border-0 shadow-none dark:bg-transparent dark:hover:bg-transparent" />
          </PressCard>
        </div>
      </div>
    </div>
  )
}
