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
    <div className="space-y-8 pb-24 text-slate-800 dark:text-slate-100">

      {/* ── 1. HERO SECTION (Green/Playful Hero Card) ── */}
      <PressCard
        shadow="0 6px 0 0 #2b6c00"
        shadowHover="0 3px 0 0 #2b6c00"
        className="relative overflow-hidden border-2 border-[#2b6c00] bg-gradient-to-r from-[#58cc02] to-[#2b6c00] p-6 text-white rounded-3xl"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0 text-3xl animate-bounce">
              🦉
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black leading-tight">สวัสดี! วันนี้มาทำภารกิจการเงินกัน</h2>
              <p className="text-xs font-bold text-green-100 uppercase tracking-widest mt-1 opacity-90">
                {monthName} {yearThai}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-black/10 border border-white/25 rounded-2xl p-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1 rounded-xl shadow-[0_3px_0_0_#b45309] font-black border border-amber-600">
              <Flame className="w-4 h-4 fill-white" />
              <span className="text-sm num">{streak}</span>
              <span className="text-[10px] font-bold">วัน</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold opacity-80">วันนี้: +{xpToday} XP</span>
              <span className="text-[10px] font-medium opacity-65">สะสม: {xpTotal} XP</span>
            </div>
          </div>
        </div>
      </PressCard>

      {/* ── 2. PROGRESS & WEEKLY STREAK ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* XP Progress Card */}
        <PressCard
          shadow="0 6px 0 0 #e5e5e5"
          shadowHover="0 3px 0 0 #e5e5e5"
          className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-3xl"
        >
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <Star className="w-4 h-4 text-indigo-500 fill-indigo-500" />
                Financial Health XP
              </p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Lv. 5 Pioneer</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 num">{xpTotal}</span>
              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold"> / {xpGoal} XP</span>
            </div>
          </div>

          <div className="mt-2.5">
            <XpBar value={xpTotal} max={xpGoal} color="#58cc02" />
          </div>

          <div className="flex justify-between items-center mt-3 text-xs font-bold">
            <span className="text-slate-400 dark:text-slate-500">
              {Math.round((xpTotal / xpGoal) * 100)}% เสร็จสิ้น
            </span>
            <span className="text-amber-500 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 fill-amber-500/20" />
              อีก {Math.max(0, xpGoal - xpTotal)} XP เพื่ออัพเลเวล!
            </span>
          </div>
        </PressCard>

        {/* Weekly Activity Streak */}
        <PressCard
          shadow="0 6px 0 0 #e5e5e5"
          shadowHover="0 3px 0 0 #e5e5e5"
          className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 rounded-3xl"
        >
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
            ความต่อเนื่องสัปดาห์นี้
          </p>
          <div className="flex justify-between items-center">
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
      </div>

      {/* ── 3. QUICK STATS CARDS ── */}
      <div>
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          สถิติเควสเดือนนี้
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Income Card */}
          <PressCard
            shadow="0 5px 0 0 #065f46"
            shadowHover="0 3px 0 0 #065f46"
            className="border-emerald-400 bg-emerald-500 text-white p-4 flex flex-col justify-between h-28 rounded-2xl"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">รายรับ</span>
              <TrendingUp className="w-4 h-4 text-emerald-100" />
            </div>
            <p className="font-black text-lg md:text-xl leading-none num truncate">
              {formatCurrency(income)}
            </p>
          </PressCard>

          {/* Expense Card */}
          <PressCard
            shadow="0 5px 0 0 #9f1239"
            shadowHover="0 3px 0 0 #9f1239"
            className="border-rose-400 bg-rose-500 text-white p-4 flex flex-col justify-between h-28 rounded-2xl"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-100">รายจ่าย</span>
              <TrendingDown className="w-4 h-4 text-rose-100" />
            </div>
            <p className="font-black text-lg md:text-xl leading-none num truncate">
              {formatCurrency(expense)}
            </p>
          </PressCard>

          {/* Savings Rate Card */}
          <PressCard
            shadow="0 5px 0 0 #1e3a8a"
            shadowHover="0 3px 0 0 #1e3a8a"
            className="border-blue-400 bg-blue-500 text-white p-4 flex flex-col justify-between h-28 rounded-2xl"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-100">อัตราออม</span>
              <Coins className="w-4 h-4 text-blue-100" />
            </div>
            <p className="font-black text-lg md:text-xl leading-none num">
              {savingsRate}%
            </p>
          </PressCard>

          {/* Portfolio return Card */}
          <PressCard
            shadow="0 5px 0 0 #5b21b6"
            shadowHover="0 3px 0 0 #5b21b6"
            className="border-violet-400 bg-violet-500 text-white p-4 flex flex-col justify-between h-28 rounded-2xl"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-100">พอร์ตลงทุน</span>
              <Trophy className="w-4 h-4 text-violet-100" />
            </div>
            <p className="font-black text-lg md:text-xl leading-none num truncate">
              {holdings.length ? `${portfolioReturn >= 0 ? '+' : ''}${portfolioReturn.toFixed(1)}%` : '—'}
            </p>
          </PressCard>
        </div>
      </div>

      {/* ── 4. DOUBLE COLUMN: CHALLENGES & WORKOUTS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Challenges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5 uppercase">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              ภารกิจวันนี้
            </h2>
            <span className="text-xs font-black text-[#58cc02]">
              {challengesDone} / 3 สำเร็จ
            </span>
          </div>
          <div className="space-y-2.5">
            <ChallengeCard
              icon={BookOpen}
              title="บันทึกรายรับ/รายจ่าย"
              subtitle={hasLoggedToday ? 'บันทึกเรียบร้อย 🎉' : 'เพิ่มรายการธุรกรรมอย่างน้อย 1 รายการ'}
              xp={15}
              done={hasLoggedToday}
              color="#58cc02"
              borderColor="#58cc02"
              shadow="0 4px 0 0 #2b6c00"
            />
            <ChallengeCard
              icon={Target}
              title="ตั้งงบประมาณเดือนนี้"
              subtitle={hasBudget ? 'ตั้งงบประมาณเสร็จสิ้น ✓' : 'เปิดและดูแลแผนการใช้งบประมาณ'}
              xp={20}
              done={hasBudget}
              color="#3b82f6"
              borderColor="#60a5fa"
              shadow="0 4px 0 0 #1d4ed8"
            />
            <ChallengeCard
              icon={Dumbbell}
              title="ออกกำลังกายวันนี้"
              subtitle={workedOutToday ? 'เควสสุขภาพสำเร็จ 💪' : 'ทำเควสฝึกฝนหรือออกกำลังกายวันนี้'}
              xp={25}
              done={workedOutToday}
              color="#ec4899"
              borderColor="#f472b6"
              shadow="0 4px 0 0 #9d174d"
            />
          </div>
        </div>

        {/* Workout Quest */}
        <div className="space-y-3">
          <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5 uppercase px-1">
            <Dumbbell className="w-4 h-4 text-violet-500" />
            ภารกิจสุขภาพ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PressCard
              shadow="0 5px 0 0 #5b21b6"
              shadowHover="0 3px 0 0 #5b21b6"
              className="border-violet-400 bg-violet-500 text-white p-5 flex flex-col justify-between h-36 rounded-2xl"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-wider text-violet-100">Workout Streak</p>
                <Flame className="w-5 h-5 text-violet-200 fill-violet-200" />
              </div>
              <div>
                <p className="text-2xl font-black num">{workoutStreak} วัน</p>
                <p className="text-[10px] text-violet-100 mt-1 opacity-80">ออกกำลังกายอย่างต่อเนื่อง</p>
              </div>
            </PressCard>

            <PressCard
              shadow="0 5px 0 0 #0369a1"
              shadowHover="0 3px 0 0 #0369a1"
              className="border-sky-400 bg-sky-500 text-white p-5 flex flex-col justify-between h-36 rounded-2xl"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black uppercase tracking-wider text-sky-100">สัปดาห์นี้</p>
                <Dumbbell className="w-5 h-5 text-sky-200" />
              </div>
              <div>
                <p className="text-xl font-black leading-tight num">
                  {weeklyWorkoutCount} ครั้ง
                </p>
                <p className="text-[10px] text-sky-100 mt-1 opacity-80">
                  ทั้งหมด {weeklySetsCount} เซ็ต
                </p>
              </div>
            </PressCard>
          </div>
        </div>
      </div>

      {/* ── 5. ACHIEVEMENTS SECTION (Horizontal Scroll) ── */}
      <div>
        <h2 className="text-xs font-black text-slate-800 dark:text-white mb-3 flex items-center gap-1.5 uppercase px-1">
          <Trophy className="w-4 h-4 text-amber-500" />
          เหรียญตราความสำเร็จ
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-3 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex-shrink-0 w-44">
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
          <div className="flex-shrink-0 w-44">
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
          <div className="flex-shrink-0 w-44">
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
          <div className="flex-shrink-0 w-44">
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

      {/* ── 6. DATA WIDGETS SECTION (Clean grid layout) ── */}
      <div className="space-y-6">
        {/* Payday countdown banner */}
        <PaydayCountdown />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest px-1">
              ธุรกรรมล่าสุด
            </h3>
            <PressCard
              shadow="0 5px 0 0 #e5e5e5"
              shadowHover="0 3px 0 0 #e5e5e5"
              className="border-slate-200 dark:border-slate-800 overflow-hidden p-0 rounded-3xl bg-white dark:bg-slate-900"
            >
              <RecentTransactions className="border-0 shadow-none rounded-none dark:bg-transparent dark:border-0 dark:hover:bg-transparent" />
            </PressCard>
          </div>

          {/* Budget Progress */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest px-1">
              เควสงบประมาณประจำเดือน
            </h3>
            <PressCard
              shadow="0 5px 0 0 #e5e5e5"
              shadowHover="0 3px 0 0 #e5e5e5"
              className="border-slate-200 dark:border-slate-800 overflow-hidden p-0 rounded-3xl bg-white dark:bg-slate-900"
            >
              <BudgetProgressList className="border-0 shadow-none rounded-none dark:bg-transparent dark:border-0 dark:hover:bg-transparent" />
            </PressCard>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-slate-405 dark:text-slate-500 uppercase tracking-widest px-1">
            สัดส่วนการใช้จ่ายรายหมวดหมู่
          </h3>
          <PressCard
            shadow="0 5px 0 0 #e5e5e5"
            shadowHover="0 3px 0 0 #e5e5e5"
            className="border-slate-200 dark:border-slate-800 overflow-hidden p-0 rounded-3xl max-w-2xl mx-auto w-full bg-white dark:bg-slate-900"
          >
            <CategoryPieChart className="border-0 shadow-none rounded-none dark:bg-transparent dark:border-0 dark:hover:bg-transparent" />
          </PressCard>
        </div>
      </div>

    </div>
  )
}
