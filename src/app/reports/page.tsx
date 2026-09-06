'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Sparkles } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MonthlyBarChart } from '@/components/reports/MonthlyBarChart'
import { YearlyLineChart } from '@/components/reports/YearlyLineChart'
import { CategoryBreakdown } from '@/components/reports/CategoryBreakdown'
import { BudgetVsActual } from '@/components/reports/BudgetVsActual'
import { SpendingTrend } from '@/components/reports/SpendingTrend'
import { SpendingIntensity } from '@/components/reports/SpendingIntensity'
import { PrintableReport } from '@/components/reports/PrintableReport'
import { IncomeBreakdown } from '@/components/reports/IncomeBreakdown'
import { SavingsRateTracker } from '@/components/reports/SavingsRateTracker'
import { SpendingInsights } from '@/components/dashboard/SpendingInsights'
import { PressCard } from '@/components/ui/PressCard'
import { THAI_MONTHS, cn } from '@/lib/utils'
import { BarChart3, TrendingUp, Target, Trophy, CalendarDays } from 'lucide-react'

export default function ReportsPage() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'coach' | 'overview' | 'savings' | 'budget-habits'>('coach')

  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()]

  const periodText = month === null 
    ? `ทั้งปี พ.ศ. ${year + 543}` 
    : `เดือน ${THAI_MONTHS[month - 1]} พ.ศ. ${year + 543}`

  return (
    <div className="space-y-6 pb-28 text-slate-800 dark:text-slate-100">

      {/* ── 1. HERO REPORT QUEST CARD ── */}
      <PressCard
        shadow="0 6px 0 0 var(--quest-primary)"
        shadowHover="0 3px 0 0 var(--quest-primary)"
        className="relative overflow-hidden border-2 border-[var(--quest-primary)] bg-[var(--quest-primary-container)] p-6 sm:p-8 text-[var(--quest-on-primary-container)] rounded-[32px]"
      >
        <div className="absolute -right-8 -bottom-8 w-48 h-48 opacity-25 animate-bounce pointer-events-none hidden md:block">
          <Trophy className="w-full h-full text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-black">รายงานสุขภาพการเงิน</h2>
            <p className="text-xs sm:text-sm font-bold text-green-50 opacity-95">
              วิเคราะห์ผลลัพธ์การใช้เงิน ออมเงิน และความก้าวหน้าภารกิจคุมงบของคุณ
            </p>
            <div className="inline-flex items-center gap-1.5 bg-black/15 px-4 py-1.5 rounded-full text-white/95 text-xs font-black mt-2 leading-none uppercase tracking-wider select-none">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{periodText}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* Year in Review Button */}
            <button
              onClick={() => router.push('/reports/wrapped')}
              className="flex-grow md:flex-none font-black text-xs px-5 py-3.5 rounded-2xl bg-indigo-600 text-white border-2 border-indigo-800 border-b-4 shadow-[0_3px_0_0_#4338ca] transform transition-all active:translate-y-[2px] active:border-b-2 hover:bg-indigo-500 flex items-center justify-center gap-2 select-none"
            >
              <Sparkles className="w-4 h-4" /> สรุปปีของฉัน
            </button>
            {/* Print Button */}
            <button
              onClick={() => setPrintOpen(true)}
              className="flex-grow md:flex-none font-black text-xs px-5 py-3.5 rounded-2xl bg-white text-slate-700 border-2 border-slate-250 border-b-4 shadow-[0_3px_0_0_#cbd5e1] transform transition-all active:translate-y-[2px] active:border-b-2 hover:bg-slate-50 flex items-center justify-center gap-2 select-none"
            >
              <Printer className="w-4 h-4" /> พิมพ์รายงาน
            </button>
          </div>
        </div>
      </PressCard>

      {/* ── 2. FILTER PANEL (TACTILE SELECTORS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Month Filter Selector */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-[0_4px_0_0_#e5e5e5] dark:shadow-[0_4px_0_0_#020617]">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
            เลือกเดือน
          </label>
          <Select
            value={month === null ? 'ALL' : String(month)}
            onValueChange={(v) => setMonth(!v || v === 'ALL' ? null : Number(v))}
          >
            <SelectTrigger className="w-full h-11 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-750 font-bold rounded-xl focus:ring-0 text-slate-700 dark:text-white">
              <SelectValue placeholder="เลือกเดือน" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
              <SelectItem value="ALL">ทุกเดือน</SelectItem>
              {THAI_MONTHS.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Filter Selector */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-[0_4px_0_0_#e5e5e5] dark:shadow-[0_4px_0_0_#020617]">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
            เลือกปี
          </label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v ?? year))}>
            <SelectTrigger className="w-full h-11 text-sm bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-750 font-bold rounded-xl focus:ring-0 text-slate-700 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── TABS CONTROLLER (DUOLINGO STYLE) ── */}
      <div className="flex flex-wrap gap-2.5 pb-2">
        <button
          onClick={() => setActiveTab('coach')}
          className={cn(
            "quest-filter-pill cursor-pointer",
            activeTab === 'coach' && "quest-filter-pill-active"
          )}
        >
          <span>💡</span>
          <span>คำแนะนำโค้ช</span>
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "quest-filter-pill cursor-pointer",
            activeTab === 'overview' && "quest-filter-pill-active"
          )}
        >
          <span>📊</span>
          <span>รายรับ-รายจ่าย</span>
        </button>
        <button
          onClick={() => setActiveTab('savings')}
          className={cn(
            "quest-filter-pill cursor-pointer",
            activeTab === 'savings' && "quest-filter-pill-active"
          )}
        >
          <span>📈</span>
          <span>เส้นทางการออม</span>
        </button>
        <button
          onClick={() => setActiveTab('budget-habits')}
          className={cn(
            "quest-filter-pill cursor-pointer",
            activeTab === 'budget-habits' && "quest-filter-pill-active"
          )}
        >
          <span>🎯</span>
          <span>งบประมาณ & พฤติกรรม</span>
        </button>
      </div>

      {/* ── TAB CONTENT AREAS ── */}
      {activeTab === 'coach' && (
        <div className="space-y-2 animate-in fade-in-50 duration-200">
          <div className="px-1 flex items-center gap-1.5">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              คำแนะนำจากโค้ชการเงิน
            </h4>
          </div>
          <PressCard
            shadow="0 6px 0 0 #e5e5e5"
            shadowHover="0 3px 0 0 #e5e5e5"
            className="border-slate-200 dark:border-slate-800 rounded-[32px] bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row items-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-900 flex items-center justify-center shrink-0 text-3xl select-none">
              💡
            </div>
            <div className="flex-grow space-y-1 text-center md:text-left">
              <h5 className="font-black text-base text-slate-800 dark:text-slate-200">Financial Coach Insights</h5>
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                <SpendingInsights />
              </div>
            </div>
          </PressCard>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2 px-1">
            <BarChart3 className="w-4 h-4 text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]" />
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                ภาพรวมรายรับ–รายจ่าย
              </h3>
              <p className="text-[11px] text-slate-400/80 mt-0.5">
                ติดตามกระแสเงินเข้า-ออก และประเมินความสอดคล้องทางการเงิน
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <PressCard shadow="0 6px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-[28px] [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none [&>div]:p-0">
              <MonthlyBarChart year={year} />
            </PressCard>

            <PressCard shadow="0 6px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-[28px] [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none [&>div]:p-0">
              <IncomeBreakdown year={year} month={month} />
            </PressCard>
          </div>
          
          <PressCard shadow="0 6px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-[28px] w-full [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none [&>div]:p-0">
            <SpendingTrend />
          </PressCard>
        </div>
      )}

      {activeTab === 'savings' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-sky-500" />
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                เส้นทางการออมเงิน
              </h3>
              <p className="text-[11px] text-slate-400/80 mt-0.5">
                ตรวจสอบอัตราผลตอบแทนความก้าวหน้าการเก็บหอมรอมริบ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PressCard shadow="0 6px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-[28px] [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none [&>div]:p-0">
              <YearlyLineChart year={year} />
            </PressCard>
            <PressCard shadow="0 6px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-[28px] [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none [&>div]:p-0">
              <SavingsRateTracker year={year} month={month} />
            </PressCard>
          </div>
        </div>
      )}

      {activeTab === 'budget-habits' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2 px-1">
            <Target className="w-4 h-4 text-violet-500" />
            <div>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                งบประมาณและพฤติกรรมใช้จ่าย
              </h3>
              <p className="text-[11px] text-slate-400/80 mt-0.5">
                ประเมินระเบียบวินัยการออมและหมวดหมู่การใช้งานเงินเปรียบเทียบงบ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <PressCard shadow="0 6px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-[28px] [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none [&>div]:p-0">
                <BudgetVsActual year={year} month={month} />
              </PressCard>
            </div>
            <div className="space-y-1">
              <PressCard shadow="0 6px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-[28px] [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none [&>div]:p-0">
                <SpendingIntensity year={year} month={month} />
              </PressCard>
            </div>
            <div className="space-y-1">
              <PressCard shadow="0 6px 0 0 #e5e5e5" shadowHover="0 3px 0 0 #e5e5e5" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-[28px] [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none [&>div]:p-0">
                <CategoryBreakdown year={year} month={month} />
              </PressCard>
            </div>
          </div>
        </div>
      )}

      {/* PrintableReport dialog component */}
      <PrintableReport open={printOpen} onOpenChange={setPrintOpen} year={year} month={month} />
    </div>
  )
}
