'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ArrowLeft, Trophy, Flame, Star, TrendingUp, Wallet, CalendarDays, Target } from 'lucide-react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const THAI_DAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']

/* ── Data computation ──────────────────────────────────────── */

function useWrappedData(year: number) {
  const { transactions } = useTransactionStore()
  const { getCategoryById } = useCategoryStore()

  const yearTxs  = transactions.filter((t) => new Date(t.date).getFullYear() === year)
  const incomes  = yearTxs.filter((t) => t.type === 'INCOME')
  const expenses = yearTxs.filter((t) => t.type === 'EXPENSE')

  const totalIncome  = incomes.reduce((s, t) => s + t.amount, 0)
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const netSavings   = totalIncome - totalExpense
  const savingsRate  = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0

  /* Top 5 expense categories */
  const byCat: Record<string, number> = {}
  expenses.forEach((t) => { byCat[t.categoryId] = (byCat[t.categoryId] ?? 0) + t.amount })
  const topCats = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, amt]) => ({ cat: getCategoryById(id), amount: amt }))
    .filter((x) => x.cat)

  /* Biggest single expense */
  const biggestExpense = expenses.length > 0
    ? expenses.reduce((max, t) => t.amount > max.amount ? t : max, expenses[0])
    : null
  const biggestExpenseCat = biggestExpense ? getCategoryById(biggestExpense.categoryId) : null

  /* Monthly breakdown */
  const byMonth = Array.from({ length: 12 }, (_, m) => {
    const mTxs = yearTxs.filter((t) => new Date(t.date).getMonth() === m)
    const inc  = mTxs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
    const exp  = mTxs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
    return { month: m, net: inc - exp, income: inc, expense: exp, count: mTxs.length }
  })
  const bestMonth = [...byMonth].sort((a, b) => b.net - a.net)[0]
  const busiestMonth = [...byMonth].sort((a, b) => b.count - a.count)[0]

  /* Unique spending days */
  const uniqueDays = new Set(expenses.map((t) => t.date)).size

  /* Most expensive day of week */
  const byDow = Array.from({ length: 7 }, () => 0)
  expenses.forEach((t) => { byDow[new Date(t.date).getDay()] += t.amount })
  const mostExpensiveDow = byDow.indexOf(Math.max(...byDow))

  /* Avg daily spend (only days with spending) */
  const avgDailySpend = uniqueDays > 0 ? totalExpense / uniqueDays : 0

  /* Achievements */
  const achievements: { icon: string; label: string; desc: string }[] = []
  if (savingsRate >= 20)          achievements.push({ icon: '💰', label: 'นักออมตัวจริง', desc: `ออมได้ ${savingsRate.toFixed(0)}% ของรายรับ` })
  if (yearTxs.length >= 100)      achievements.push({ icon: '📝', label: 'นักบันทึก', desc: `บันทึก ${yearTxs.length} รายการ` })
  if (netSavings > 0)             achievements.push({ icon: '📈', label: 'ปีที่เติบโต', desc: 'รายรับมากกว่ารายจ่าย' })
  if (savingsRate >= 50)          achievements.push({ icon: '🏆', label: 'แชมป์การออม', desc: 'ออมเกินครึ่งของรายรับ' })
  if (expenses.length === 0)      achievements.push({ icon: '🧘', label: 'ประหยัดสุดขีด', desc: 'ไม่มีรายจ่ายในปีนี้' })
  if (uniqueDays >= 200)          achievements.push({ icon: '🔥', label: 'Streak สูง', desc: `ใช้จ่ายบ่อยถึง ${uniqueDays} วัน` })

  return {
    yearTxs, totalIncome, totalExpense, netSavings, savingsRate,
    topCats, biggestExpense, biggestExpenseCat,
    bestMonth, busiestMonth, byMonth,
    uniqueDays, mostExpensiveDow, avgDailySpend,
    achievements, txCount: yearTxs.length,
  }
}

/* ── Slide backgrounds ─────────────────────────────────────── */

const SLIDE_THEMES = [
  'from-violet-950 via-indigo-950 to-slate-950',   // 0 intro
  'from-slate-950 via-blue-950 to-indigo-950',      // 1 overview
  'from-emerald-950 via-teal-950 to-slate-950',     // 2 savings
  'from-purple-950 via-violet-950 to-slate-950',    // 3 top cats
  'from-rose-950 via-red-950 to-slate-950',         // 4 biggest
  'from-amber-950 via-orange-950 to-slate-950',     // 5 best month
  'from-cyan-950 via-blue-950 to-slate-950',        // 6 habits
  'from-violet-950 via-purple-950 to-indigo-950',   // 7 end
]

/* ── Slides ────────────────────────────────────────────────── */

function SlideIntro({ year, data }: { year: number; data: ReturnType<typeof useWrappedData> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6">
      <div className="text-7xl mb-2">🎊</div>
      <div>
        <p className="text-violet-300 text-sm font-medium tracking-widest uppercase mb-2">Year in Review</p>
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">{year}</h1>
        <p className="text-white/60 text-lg">มาดูกันว่าคุณบริหารการเงินอย่างไรในปีนี้</p>
      </div>
      {data.txCount > 0 ? (
        <div className="mt-4 px-6 py-3 rounded-2xl bg-white/10 border border-white/10">
          <p className="text-white/50 text-sm">รายการทั้งหมดในปีนี้</p>
          <p className="text-3xl font-bold text-white">{data.txCount.toLocaleString()}</p>
          <p className="text-white/40 text-xs">รายการ</p>
        </div>
      ) : (
        <div className="mt-4 px-6 py-3 rounded-2xl bg-white/10 border border-white/10">
          <p className="text-white/60 text-base">ยังไม่มีข้อมูลในปี {year}</p>
        </div>
      )}
    </div>
  )
}

function SlideOverview({ data }: { data: ReturnType<typeof useWrappedData> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-8">
      <div className="text-center">
        <p className="text-blue-300 text-sm font-medium tracking-widest uppercase mb-2">ภาพรวมการเงิน</p>
        <h2 className="text-3xl font-bold text-white">รายรับ vs รายจ่าย</h2>
      </div>
      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
          <p className="text-white/50 text-sm mb-1">💚 รายรับทั้งหมด</p>
          <p className="text-4xl font-bold text-emerald-400">{formatCurrency(data.totalIncome)}</p>
        </div>
        <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
          <p className="text-white/50 text-sm mb-1">❤️ รายจ่ายทั้งหมด</p>
          <p className="text-4xl font-bold text-red-400">{formatCurrency(data.totalExpense)}</p>
        </div>
        <div className={cn('rounded-2xl border p-5', data.netSavings >= 0 ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30')}>
          <p className="text-white/50 text-sm mb-1">{data.netSavings >= 0 ? '✨ ออมได้สุทธิ' : '⚠️ ขาดทุนสุทธิ'}</p>
          <p className={cn('text-4xl font-bold', data.netSavings >= 0 ? 'text-emerald-300' : 'text-red-300')}>
            {formatCurrency(Math.abs(data.netSavings))}
          </p>
        </div>
      </div>
    </div>
  )
}

function SlideSavings({ data }: { data: ReturnType<typeof useWrappedData> }) {
  const rate = Math.max(0, data.savingsRate)
  const label =
    rate >= 50 ? { text: 'ยอดเยี่ยมมาก! 🏆', color: 'text-emerald-300' } :
    rate >= 30 ? { text: 'ดีมาก! 🌟', color: 'text-emerald-400' } :
    rate >= 20 ? { text: 'ดี! 👍', color: 'text-teal-400' } :
    rate >= 10 ? { text: 'พอใช้ได้', color: 'text-yellow-400' } :
                 { text: 'ต้องพัฒนา', color: 'text-orange-400' }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-8 text-center">
      <div>
        <p className="text-emerald-300 text-sm font-medium tracking-widest uppercase mb-2">อัตราการออม</p>
        <h2 className="text-3xl font-bold text-white">คุณออมเงินได้</h2>
      </div>
      <div className="relative">
        <div className="w-48 h-48 rounded-full border-8 border-white/10 flex items-center justify-center relative">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="#34d399" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${Math.min(rate, 100) * 2.64} 264`}
              className="transition-all duration-1000"
            />
          </svg>
          <div>
            <p className="text-5xl font-bold text-white">{rate.toFixed(0)}<span className="text-2xl">%</span></p>
          </div>
        </div>
      </div>
      <div>
        <p className={cn('text-2xl font-bold mb-2', label.color)}>{label.text}</p>
        <p className="text-white/50 text-sm">
          ออมได้ {formatCurrency(Math.max(0, data.netSavings))} จากรายรับ {formatCurrency(data.totalIncome)}
        </p>
        <p className="text-white/30 text-xs mt-1">เป้าหมายที่แนะนำ: ออม 20% ขึ้นไป</p>
      </div>
    </div>
  )
}

function SlideTopCategories({ data }: { data: ReturnType<typeof useWrappedData> }) {
  const max = data.topCats[0]?.amount ?? 1
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-6">
      <div className="text-center">
        <p className="text-purple-300 text-sm font-medium tracking-widest uppercase mb-2">Top Categories</p>
        <h2 className="text-3xl font-bold text-white">หมวดที่ใช้เงินมากสุด</h2>
      </div>
      <div className="w-full max-w-sm space-y-3">
        {data.topCats.length === 0 ? (
          <p className="text-white/40 text-center">ไม่มีข้อมูลรายจ่าย</p>
        ) : data.topCats.map(({ cat, amount }, i) => (
          <div key={cat!.id} className="flex items-center gap-3">
            <span className="text-white/40 text-sm w-4 font-bold">#{i + 1}</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat!.color + '30' }}>
              <CategoryIcon name={cat!.icon} className="w-4 h-4" style={{ color: cat!.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white truncate">{cat!.name}</p>
                <p className="text-sm font-bold text-white/80 ml-2 flex-shrink-0">{formatCurrency(amount)}</p>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(amount / max) * 100}%`, backgroundColor: cat!.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlideBiggest({ data }: { data: ReturnType<typeof useWrappedData> }) {
  const tx  = data.biggestExpense
  const cat = data.biggestExpenseCat
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-8 text-center">
      <div>
        <p className="text-rose-300 text-sm font-medium tracking-widest uppercase mb-2">Biggest Expense</p>
        <h2 className="text-3xl font-bold text-white">รายจ่ายสูงสุดครั้งเดียว</h2>
      </div>
      {tx && cat ? (
        <div className="w-full max-w-sm rounded-2xl bg-white/10 border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl mx-auto" style={{ backgroundColor: cat.color + '30' }}>
            <CategoryIcon name={cat.icon} className="w-8 h-8" style={{ color: cat.color }} />
          </div>
          <div>
            <p className="text-white/50 text-sm">{cat.name}</p>
            <p className="text-4xl font-bold text-white my-2">{formatCurrency(tx.amount)}</p>
            <p className="text-white/70 font-medium">{tx.description}</p>
            <p className="text-white/30 text-sm mt-1">
              {new Date(tx.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-white/40">ไม่มีข้อมูลรายจ่าย</p>
      )}
    </div>
  )
}

function SlideBestMonth({ data }: { data: ReturnType<typeof useWrappedData> }) {
  const m = data.bestMonth
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-8 text-center">
      <div>
        <p className="text-amber-300 text-sm font-medium tracking-widest uppercase mb-2">Best Month</p>
        <h2 className="text-3xl font-bold text-white">เดือนที่ดีที่สุด</h2>
      </div>
      {m && m.income > 0 ? (
        <>
          <div>
            <p className="text-7xl font-bold text-amber-300 mb-2">{THAI_MONTHS_SHORT[m.month]}</p>
            <p className="text-white/50">เดือนที่ออมได้มากที่สุด</p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between px-4 py-3 rounded-xl bg-white/10">
              <span className="text-white/60 text-sm">รายรับ</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(m.income)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 rounded-xl bg-white/10">
              <span className="text-white/60 text-sm">รายจ่าย</span>
              <span className="text-red-400 font-bold">{formatCurrency(m.expense)}</span>
            </div>
            <div className="flex justify-between px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <span className="text-white/80 text-sm font-medium">ออมได้สุทธิ</span>
              <span className="text-amber-300 font-bold">{formatCurrency(m.net)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-white/40">ยังไม่มีข้อมูลเพียงพอ</p>
      )}
    </div>
  )
}

function SlideHabits({ data }: { data: ReturnType<typeof useWrappedData> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-8">
      <div className="text-center">
        <p className="text-cyan-300 text-sm font-medium tracking-widest uppercase mb-2">Your Habits</p>
        <h2 className="text-3xl font-bold text-white">นิสัยการใช้จ่าย</h2>
      </div>
      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-2xl bg-white/10 border border-white/10 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-white/50 text-xs mb-0.5">วันที่มีรายจ่าย</p>
            <p className="text-2xl font-bold text-white">{data.uniqueDays} <span className="text-sm font-normal text-white/40">วัน</span></p>
          </div>
        </div>
        <div className="rounded-2xl bg-white/10 border border-white/10 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-white/50 text-xs mb-0.5">ใช้จ่ายเฉลี่ยต่อวัน</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(data.avgDailySpend)}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white/10 border border-white/10 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Flame className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <p className="text-white/50 text-xs mb-0.5">วันที่ใช้เงินมากสุด</p>
            <p className="text-2xl font-bold text-white">{THAI_DAYS[data.mostExpensiveDow]}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SlideEnd({ data, year }: { data: ReturnType<typeof useWrappedData>; year: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-8 text-center">
      <div>
        <p className="text-violet-300 text-sm font-medium tracking-widest uppercase mb-2">สรุปปี {year}</p>
        <h2 className="text-3xl font-bold text-white mb-2">ขอบคุณที่ไว้วางใจ FinanceMe</h2>
        <p className="text-white/40 text-sm">ปีหน้าขอให้การเงินดียิ่งขึ้นไปอีก 🚀</p>
      </div>

      {data.achievements.length > 0 && (
        <div className="w-full max-w-sm">
          <p className="text-white/50 text-sm mb-3 flex items-center justify-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" /> Achievement ที่ปลดล็อกในปีนี้
          </p>
          <div className="grid grid-cols-2 gap-2">
            {data.achievements.map((a) => (
              <div key={a.label} className="rounded-xl bg-white/10 border border-white/10 p-3 text-left">
                <p className="text-2xl mb-1">{a.icon}</p>
                <p className="text-white text-xs font-bold">{a.label}</p>
                <p className="text-white/40 text-[10px] mt-0.5">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm rounded-2xl bg-white/10 border border-white/10 p-4 grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'รายการ', value: data.txCount.toLocaleString() },
          { label: 'ออมได้', value: data.netSavings >= 0 ? formatCurrency(data.netSavings) : '-' },
          { label: 'อัตราออม', value: `${Math.max(0, data.savingsRate).toFixed(0)}%` },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-white/30 text-[10px] mb-1">{label}</p>
            <p className="text-white font-bold text-sm">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────── */

const SLIDES = [
  SlideIntro, SlideOverview, SlideSavings, SlideTopCategories,
  SlideBiggest, SlideBestMonth, SlideHabits, SlideEnd,
]

export default function WrappedPage() {
  const router = useRouter()
  const now    = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [slide, setSlide] = useState(0)
  const [animating, setAnimating] = useState(false)

  const data = useWrappedData(year)

  const goTo = useCallback((next: number) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => { setSlide(next); setAnimating(false) }, 250)
  }, [animating])

  const prev = () => slide > 0 && goTo(slide - 1)
  const next = () => slide < SLIDES.length - 1 && goTo(slide + 1)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev()
      if (e.key === 'Escape') router.back()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [slide, animating])

  const SlideComponent = SLIDES[slide]
  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()].filter((y) => y >= 2020)

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex flex-col bg-gradient-to-b',
      SLIDE_THEMES[slide],
      'transition-all duration-500',
    )}>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> ออก
        </button>

        {/* Year selector */}
        <div className="flex gap-1">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => { setYear(y); setSlide(0) }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                year === y ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70',
              )}
            >
              {y}
            </button>
          ))}
        </div>

        <span className="text-white/40 text-xs">{slide + 1} / {SLIDES.length}</span>
      </div>

      {/* ── Progress bar ── */}
      <div className="flex gap-1 px-4 flex-shrink-0">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={cn(
              'flex-1 h-1 rounded-full transition-all duration-300',
              i <= slide ? 'bg-white/70' : 'bg-white/15',
            )}
          />
        ))}
      </div>

      {/* ── Slide content ── */}
      <div
        className={cn('flex-1 min-h-0 transition-opacity duration-250', animating ? 'opacity-0' : 'opacity-100')}
      >
        <SlideComponent data={data} year={year} />
      </div>

      {/* ── Nav buttons ── */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <button
          onClick={prev}
          disabled={slide === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
        </button>

        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'rounded-full transition-all duration-200',
                i === slide ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/30',
              )}
            />
          ))}
        </div>

        {slide < SLIDES.length - 1 ? (
          <button
            onClick={next}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
          >
            ถัดไป <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-semibold transition-all hover:bg-white/90"
          >
            เสร็จสิ้น ✓
          </button>
        )}
      </div>
    </div>
  )
}
