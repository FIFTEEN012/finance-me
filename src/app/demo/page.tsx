'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Flame, Star, Zap, Target, TrendingUp,
  TrendingDown, Scale, Trophy, CheckCircle2, Circle,
  ChevronRight, Coins, ShieldCheck, BookOpen,
} from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useNetWorthStore }    from '@/store/useNetWorthStore'
import { useGoalStore }         from '@/store/useGoalStore'
import { useInvestmentStore }   from '@/store/useInvestmentStore'
import { useBudgetStore }       from '@/store/useBudgetStore'
import { formatCurrency, cn }   from '@/lib/utils'

/* ─── 3-D Pressable Card ─────────────────────────────────
   Duolingo signature: thick bottom shadow, colored border,
   translateY on hover/active shrinks shadow height         */

interface PressCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  shadow: string   // e.g. "0 4px 0 0 #5b21b6"
  shadowHover?: string
  onClick?: () => void
}

function PressCard({ children, className, style, shadow, shadowHover, onClick }: PressCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border-2 transition-all duration-100 ease-out select-none',
        onClick && 'cursor-pointer',
        'hover:[transform:translateY(2px)] active:[transform:translateY(4px)]',
        className,
      )}
      style={{ boxShadow: shadow, ...style }}
      onMouseEnter={(e) => {
        if (shadowHover) (e.currentTarget as HTMLElement).style.boxShadow = shadowHover
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = shadow
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = shadow
      }}
    >
      {children}
    </div>
  )
}

/* ─── XP Progress Bar ────────────────────────────────────── */

function XpBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="w-full h-5 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

/* ─── Weekly Dot ─────────────────────────────────────────── */

function WeekDot({ label, active, today }: { label: string; active: boolean; today?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
        today
          ? 'bg-amber-400 border-amber-500 text-white scale-110'
          : active
            ? 'bg-emerald-400 border-emerald-500 text-white'
            : 'bg-gray-100 border-gray-200 text-gray-400',
      )}>
        {active && !today ? '✓' : today ? <Flame className="w-4 h-4" /> : '·'}
      </div>
      <span className="text-[10px] font-semibold text-gray-400">{label}</span>
    </div>
  )
}

/* ─── Challenge Card ─────────────────────────────────────── */

interface ChallengeProps {
  icon: React.ElementType
  title: string
  subtitle: string
  xp: number
  done: boolean
  color: string
  borderColor: string
  shadow: string
}

function ChallengeCard({ icon: Icon, title, subtitle, xp, done, color, borderColor, shadow }: ChallengeProps) {
  return (
    <PressCard
      shadow={done ? '0 4px 0 0 #d1d5db' : shadow}
      className={cn(
        'flex items-center gap-4 px-5 py-4',
        done
          ? 'border-gray-200 bg-gray-50'
          : `border-[${borderColor}] bg-white`,
      )}
      style={{ borderColor: done ? '#e5e7eb' : borderColor } as React.CSSProperties}
      onClick={() => {}}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: done ? '#f3f4f6' : `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color: done ? '#9ca3af' : color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('font-bold text-sm leading-tight', done ? 'text-gray-400 line-through' : 'text-gray-800')}>
          {title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
          done ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-600',
        )}>
          <Zap className="w-3 h-3" />
          {xp} XP
        </div>
        {done
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <ChevronRight className="w-5 h-5 text-gray-300" />
        }
      </div>
    </PressCard>
  )
}

/* ─── Mini Achievement Card ──────────────────────────────── */

function AchievCard({
  label, value, unit, icon: Icon, borderColor, shadowColor, iconBg, iconColor,
}: {
  label: string; value: string; unit?: string
  icon: React.ElementType
  borderColor: string; shadowColor: string; iconBg: string; iconColor: string
}) {
  return (
    <PressCard
      shadow={`0 4px 0 0 ${shadowColor}`}
      shadowHover={`0 2px 0 0 ${shadowColor}`}
      className="p-4 bg-white flex flex-col gap-3"
      style={{ borderColor } as React.CSSProperties}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-800 leading-none mt-0.5 num">
          {value}
          {unit && <span className="text-sm font-semibold text-gray-400 ml-1">{unit}</span>}
        </p>
      </div>
    </PressCard>
  )
}

/* ─── Page ───────────────────────────────────────────────── */

const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

export default function DemoPage() {
  const { transactions, getSumByTypeAndMonth } = useTransactionStore()
  const { items: nwItems }                     = useNetWorthStore()
  const { goals }                              = useGoalStore()
  const { holdings }                           = useInvestmentStore()
  const { getBudgetsByMonth }                  = useBudgetStore()

  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  const todayDay = (now.getDay() + 6) % 7  // 0=Mon … 6=Sun

  /* ── Real financial data ── */
  const income  = getSumByTypeAndMonth('INCOME',  month, year)
  const expense = getSumByTypeAndMonth('EXPENSE', month, year)

  const totalAssets      = nwItems.filter((i) => i.type === 'ASSET').reduce((s, i) => s + i.amount, 0)
  const totalLiabilities = nwItems.filter((i) => i.type === 'LIABILITY').reduce((s, i) => s + i.amount, 0)
  const netWorth         = totalAssets - totalLiabilities

  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0

  const portfolioReturn = useMemo(() => {
    if (!holdings.length) return 0
    const cost  = holdings.reduce((s, h) => s + h.units * h.avgCostPerUnit, 0)
    const value = holdings.reduce((s, h) => s + h.units * h.currentPricePerUnit, 0)
    return cost > 0 ? ((value - cost) / cost) * 100 : 0
  }, [holdings])

  const activeGoals    = goals.filter((g) => g.savedAmount < g.targetAmount).length
  const completedGoals = goals.filter((g) => g.savedAmount >= g.targetAmount && g.targetAmount > 0).length

  /* ── Gamification: streak from consecutive days with transactions ── */
  const { streak, xpToday, weekActive } = useMemo(() => {
    const txDays = new Set(transactions.map((t) => t.date.slice(0, 10)))
    const todayStr = now.toISOString().slice(0, 10)

    // Calculate streak
    let streak = 0
    const d = new Date()
    while (true) {
      const key = d.toISOString().slice(0, 10)
      if (txDays.has(key)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }

    // XP = transactions this month × 15
    const xpToday = transactions.filter((t) => t.date.slice(0, 10) === todayStr).length * 15

    // Which days this week had transactions
    const weekActive = DAYS.map((_, i) => {
      const wd = new Date()
      wd.setDate(wd.getDate() - (todayDay - i))
      return i <= todayDay && txDays.has(wd.toISOString().slice(0, 10))
    })

    return { streak, xpToday, weekActive }
  }, [transactions, todayDay])

  /* ── Budgets: days under budget ── */
  const budgets    = getBudgetsByMonth(month, year)
  const budgetDays = Math.min(now.getDate(), 30) // proxy: days this month so far

  /* ── Challenges ── */
  const todayStr    = now.toISOString().slice(0, 10)
  const hasLoggedToday = transactions.some((t) => t.date.slice(0, 10) === todayStr)
  const hasBudget      = budgets.length > 0
  const hasNetWorth    = nwItems.length > 0

  const xpTotal = transactions.length * 15 + completedGoals * 100
  const xpGoal  = Math.max(500, Math.ceil(xpTotal / 500) * 500)

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">

      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-violet-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับหน้าหลัก
        </Link>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-100 text-violet-600 border-2 border-violet-200">
          ✦ Duolingo Mode
        </span>
      </div>

      {/* ── 1. Streak Banner ─────────────────────────────── */}
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

        {/* Weekly calendar dots */}
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

      {/* ── 2. Big Stat Cards ────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Net Worth — violet */}
        <PressCard
          shadow="0 5px 0 0 #4c1d95"
          shadowHover="0 3px 0 0 #4c1d95"
          className="border-violet-400 bg-violet-500 p-4"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">Net Worth</p>
          <p className="text-white font-black text-xl leading-none num">{formatCurrency(netWorth)}</p>
        </PressCard>

        {/* Income — emerald */}
        <PressCard
          shadow="0 5px 0 0 #065f46"
          shadowHover="0 3px 0 0 #065f46"
          className="border-emerald-400 bg-emerald-500 p-4"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">รายรับ</p>
          <p className="text-white font-black text-xl leading-none num">{formatCurrency(income)}</p>
        </PressCard>

        {/* Expense — rose */}
        <PressCard
          shadow="0 5px 0 0 #9f1239"
          shadowHover="0 3px 0 0 #9f1239"
          className="border-rose-400 bg-rose-500 p-4"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">รายจ่าย</p>
          <p className="text-white font-black text-xl leading-none num">{formatCurrency(expense)}</p>
        </PressCard>
      </div>

      {/* ── 3. Financial Health XP Bar ───────────────────── */}
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

      {/* ── 4. Achievement Mini Cards ────────────────────── */}
      <div>
        <h2 className="text-base font-black text-gray-700 mb-3 flex items-center gap-2">
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

      {/* ── 5. Daily Challenges ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-gray-700 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-500" />
            ภารกิจประจำวัน
          </h2>
          <span className="text-xs font-bold text-gray-400">
            {[hasLoggedToday, hasBudget, hasNetWorth].filter(Boolean).length} / 3 เสร็จแล้ว
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
            icon={Scale}
            title="อัปเดต Net Worth"
            subtitle={hasNetWorth ? 'มีข้อมูลสินทรัพย์แล้ว ✓' : 'เพิ่มสินทรัพย์หรือหนี้สินของคุณ'}
            xp={25}
            done={hasNetWorth}
            color="#059669"
            borderColor="#34d399"
            shadow="0 4px 0 0 #064e3b"
          />
        </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────── */}
      <PressCard
        shadow="0 5px 0 0 #5b21b6"
        shadowHover="0 3px 0 0 #5b21b6"
        className="border-violet-400 bg-violet-500 p-5 text-center cursor-pointer"
        onClick={() => {}}
      >
        <p className="text-white font-black text-lg mb-1">รักษาสายต่อเนื่องไว้! 🔥</p>
        <p className="text-white/70 text-sm font-semibold">บันทึกรายการวันนี้เพื่อไม่ให้สายขาด</p>
      </PressCard>
    </div>
  )
}
