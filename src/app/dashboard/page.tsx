'use client'

import { useMemo } from 'react'
import {
  Flame, Star, Zap, Target, TrendingUp,
  TrendingDown, Trophy, Coins, ShieldCheck, BookOpen, LayoutGrid,
} from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useGoalStore }        from '@/store/useGoalStore'
import { useInvestmentStore }  from '@/store/useInvestmentStore'
import { useBudgetStore }      from '@/store/useBudgetStore'
import { useWorkoutStore }     from '@/store/useWorkoutStore'
import { formatCurrency, THAI_MONTHS } from '@/lib/utils'
import {
  PressCard, XpBar, WeekDot, ChallengeCard, AchievCard,
} from '@/components/ui/PressCard'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { BudgetProgressList } from '@/components/dashboard/BudgetProgressList'
import { CategoryPieChart }   from '@/components/dashboard/CategoryPieChart'
import { PaydayCountdown }    from '@/components/dashboard/PaydayCountdown'
import { Dumbbell } from 'lucide-react'

const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

export default function DashboardPage() {
  const { transactions, getSumByTypeAndMonth } = useTransactionStore()
  const { goals }                              = useGoalStore()
  const { holdings }                           = useInvestmentStore()
  const { getBudgetsByMonth }                  = useBudgetStore()
  const { sessions, getWorkoutStreak, getWeeklyCount, getTotalSetsThisWeek, hasWorkedOutToday } = useWorkoutStore()

  const now      = new Date()
  const month    = now.getMonth() + 1
  const year     = now.getFullYear()
  const monthName = THAI_MONTHS[now.getMonth()]
  const yearThai  = year + 543
  const todayDay  = (now.getDay() + 6) % 7   // 0 = Mon … 6 = Sun

  /* ── Financial data ── */
  const income  = getSumByTypeAndMonth('INCOME',  month, year)
  const expense = getSumByTypeAndMonth('EXPENSE', month, year)

  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0

  const portfolioReturn = useMemo(() => {
    if (!holdings.length) return 0
    const cost  = holdings.reduce((s, h) => s + h.units * h.avgCostPerUnit, 0)
    const value = holdings.reduce((s, h) => s + h.units * h.currentPricePerUnit, 0)
    return cost > 0 ? ((value - cost) / cost) * 100 : 0
  }, [holdings])

  const completedGoals = goals.filter((g) => g.savedAmount >= g.targetAmount && g.targetAmount > 0).length

  /* ── Gamification (Combined Finance & Workout Activity) ── */
  const { streak, xpToday, weekActive } = useMemo(() => {
    const activityDays = new Set([
      ...transactions.map((t) => t.date.slice(0, 10)),
      ...sessions.map((s) => s.date.slice(0, 10))
    ])
    const todayStr = now.toISOString().slice(0, 10)

    let streak = 0
    const d    = new Date()
    while (true) {
      const key = d.toISOString().slice(0, 10)
      if (activityDays.has(key)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }

    const workoutDoneToday = sessions.some((s) => s.date.slice(0, 10) === todayStr)
    const xpToday = transactions.filter((t) => t.date.slice(0, 10) === todayStr).length * 15 + (workoutDoneToday ? 25 : 0)

    const weekActive = DAYS.map((_, i) => {
      const wd = new Date()
      wd.setDate(wd.getDate() - (todayDay - i))
      return i <= todayDay && activityDays.has(wd.toISOString().slice(0, 10))
    })

    return { streak, xpToday, weekActive }
  }, [transactions, sessions, todayDay])   // eslint-disable-line react-hooks/exhaustive-deps

  const xpTotal = transactions.length * 15 + completedGoals * 100 + sessions.length * 25
  const xpGoal  = Math.max(500, Math.ceil(xpTotal / 500) * 500)

  /* ── Workout stats ── */
  const workoutStreak = getWorkoutStreak()
  const weeklyWorkoutCount = getWeeklyCount()
  const weeklySetsCount = getTotalSetsThisWeek()
  const workedOutToday = hasWorkedOutToday()

  /* ── Daily challenges ── */
  const todayStr       = now.toISOString().slice(0, 10)
  const hasLoggedToday = transactions.some((t) => t.date.slice(0, 10) === todayStr)
  const budgets        = getBudgetsByMonth(month, year)
  const hasBudget      = budgets.length > 0
  const budgetDays     = Math.min(now.getDate(), 30)

  const challengesDone = [hasLoggedToday, hasBudget, workedOutToday].filter(Boolean).length

  return (
    <div className="space-y-6 pb-20">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">ภาพรวมการใช้งาน</h2>
          <p className="text-sm font-semibold text-gray-400">{monthName} {yearThai}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-600">
          <Flame className="w-4 h-4" />
          <span className="text-sm font-black num">{streak}</span>
          <span className="text-xs font-bold">วัน</span>
        </div>
      </div>

      {/* ── 1. Streak Banner ─── */}
      <PressCard
        shadow="0 5px 0 0 #92400e"
        shadowHover="0 3px 0 0 #92400e"
        className="border-amber-400 bg-gradient-to-r from-amber-400 to-orange-400 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/25 border-2 border-white/40 flex items-center justify-center">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-bold uppercase tracking-wider">สายต่อเนื่อง</p>
              <p className="text-white font-black text-4xl leading-none num">{streak}</p>
              <p className="text-white/70 text-xs font-semibold">วัน</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">XP วันนี้</p>
            <div className="flex items-center gap-1.5 justify-end">
              <Zap className="w-5 h-5 text-white" />
              <span className="text-white font-black text-2xl num">{xpToday}</span>
            </div>
            <p className="text-white/60 text-[10px] font-semibold mt-0.5">รวม {xpTotal} XP</p>
          </div>
        </div>

        {/* Weekly dots */}
        <div className="flex items-center justify-between">
          {DAYS.map((d, i) => (
            <WeekDot
              key={d}
              label={d}
              active={weekActive[i] ?? false}
              today={i === todayDay}
            />
          ))}
        </div>
      </PressCard>

      {/* ── 1b. Payday Countdown ─── */}
      <PaydayCountdown />

      {/* ── 2. Big Stat Cards ─── */}
      <div className="grid grid-cols-2 gap-4">
        <PressCard
          shadow="0 5px 0 0 #065f46"
          shadowHover="0 3px 0 0 #065f46"
          className="border-emerald-400 bg-emerald-500 p-5"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">รายรับ</p>
          <p className="text-white font-black text-lg leading-none num">{formatCurrency(income)}</p>
        </PressCard>

        <PressCard
          shadow="0 5px 0 0 #9f1239"
          shadowHover="0 3px 0 0 #9f1239"
          className="border-rose-400 bg-rose-500 p-5"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">รายจ่าย</p>
          <p className="text-white font-black text-lg leading-none num">{formatCurrency(expense)}</p>
        </PressCard>
      </div>

      {/* ── 2b. Workout Stats Cards ─── */}
      <div>
        <h2 className="text-base font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-violet-500" />
          สถิติการออกกำลังกาย
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <PressCard
            shadow="0 5px 0 0 #5b21b6"
            shadowHover="0 3px 0 0 #5b21b6"
            className="border-violet-400 bg-violet-500 p-5"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">Workout Streak</p>
            <p className="text-white font-black text-lg leading-none num">{workoutStreak} วัน</p>
          </PressCard>

          <PressCard
            shadow="0 5px 0 0 #0369a1"
            shadowHover="0 3px 0 0 #0369a1"
            className="border-sky-400 bg-sky-500 p-5"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">สัปดาห์นี้</p>
            <p className="text-white font-black text-lg leading-none num">{weeklyWorkoutCount} ครั้ง ({weeklySetsCount} เซ็ต)</p>
          </PressCard>
        </div>
      </div>

      {/* ── 3. Financial Health XP Bar ─── */}
      <PressCard
        shadow="0 5px 0 0 #3730a3"
        shadowHover="0 3px 0 0 #3730a3"
        className="border-indigo-400 bg-white p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center">
              <Star className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-black text-gray-800 text-sm">Financial Health XP</p>
              <p className="text-xs text-gray-400 font-semibold">เป้าหมายเดือนนี้</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-indigo-600 num">{xpTotal}</span>
            <span className="text-gray-400 font-bold text-sm"> / {xpGoal}</span>
          </div>
        </div>

        <XpBar value={xpTotal} max={xpGoal} color="#6366f1" />

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-bold text-gray-400">
            {Math.round((xpTotal / xpGoal) * 100)}% สำเร็จ
          </span>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
            <Trophy className="w-3.5 h-3.5" />
            อีก {Math.max(0, xpGoal - xpTotal)} XP ถึงเลเวลถัดไป
          </div>
        </div>
      </PressCard>

      {/* ── 4. Achievement Mini Cards ─── */}
      <div>
        <h2 className="text-base font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          ความสำเร็จ
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <AchievCard
            label="Savings Rate"
            value={`${savingsRate}%`}
            icon={Coins}
            borderColor={savingsRate >= 20 ? '#34d399' : '#fbbf24'}
            shadowColor={savingsRate >= 20 ? '#065f46' : '#92400e'}
            iconBg={savingsRate >= 20 ? '#d1fae5' : '#fef3c7'}
            iconColor={savingsRate >= 20 ? '#059669' : '#d97706'}
          />
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
          <AchievCard
            label="Portfolio Return"
            value={holdings.length ? `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(1)}%` : '—'}
            icon={TrendingUp}
            borderColor={portfolioReturn >= 0 ? '#34d399' : '#f87171'}
            shadowColor={portfolioReturn >= 0 ? '#065f46' : '#9f1239'}
            iconBg={portfolioReturn >= 0 ? '#d1fae5' : '#fee2e2'}
            iconColor={portfolioReturn >= 0 ? '#059669' : '#ef4444'}
          />
        </div>
      </div>

      {/* ── 5. Daily Challenges ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-500" />
            ภารกิจประจำวัน
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {challengesDone} / 3 เสร็จแล้ว
          </span>
        </div>
        <div className="space-y-3">
          <ChallengeCard
            icon={BookOpen}
            title="บันทึกรายจ่ายวันนี้"
            subtitle={hasLoggedToday ? 'บันทึกแล้ววันนี้ 🎉' : 'เพิ่มรายการอย่างน้อย 1 รายการ'}
            xp={15}
            done={hasLoggedToday}
            color="#7c3aed"
            borderColor="#a78bfa"
            shadow="0 4px 0 0 #4c1d95"
          />
          <ChallengeCard
            icon={Target}
            title="ตรวจสอบงบประมาณ"
            subtitle={hasBudget ? 'ตั้งงบประมาณแล้ว ✓' : 'ตั้งงบประมาณสำหรับเดือนนี้'}
            xp={20}
            done={hasBudget}
            color="#0891b2"
            borderColor="#67e8f9"
            shadow="0 4px 0 0 #164e63"
          />
          <ChallengeCard
            icon={Dumbbell}
            title="ออกกำลังกายวันนี้"
            subtitle={workedOutToday ? 'ออกกำลังกายเสร็จแล้ว 💪' : 'ทำภารกิจหรือจดบันทึกการฝึกของวันนี้'}
            xp={25}
            done={workedOutToday}
            color="#ec4899"
            borderColor="#f472b6"
            shadow="0 4px 0 0 #9d174d"
          />
        </div>
      </div>

      {/* ── 6. Data Widgets ─── */}
      <div>
        <h2 className="text-base font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-violet-500" />
          รายละเอียด
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Transactions */}
          <PressCard
            shadow="0 4px 0 0 #d1d5db"
            shadowHover="0 2px 0 0 #d1d5db"
            className="border-gray-200 overflow-hidden p-0"
          >
            <RecentTransactions className="border-0 shadow-none rounded-none dark:bg-transparent dark:border-0 dark:hover:bg-transparent" />
          </PressCard>

          {/* Budget Progress */}
          <PressCard
            shadow="0 4px 0 0 #c4b5fd"
            shadowHover="0 2px 0 0 #c4b5fd"
            className="border-violet-300 overflow-hidden p-0"
          >
            <BudgetProgressList className="border-0 shadow-none rounded-none dark:bg-transparent dark:border-0 dark:hover:bg-transparent" />
          </PressCard>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          {/* Category Pie */}
          <PressCard
            shadow="0 4px 0 0 #fca5a5"
            shadowHover="0 2px 0 0 #fca5a5"
            className="border-red-300 overflow-hidden p-0 max-w-xl mx-auto w-full"
          >
            <CategoryPieChart className="border-0 shadow-none rounded-none dark:bg-transparent dark:border-0 dark:hover:bg-transparent" />
          </PressCard>
        </div>
      </div>

    </div>
  )
}
