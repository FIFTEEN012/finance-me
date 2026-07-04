'use client'

import { useState } from 'react'
import { Plus, PiggyBank, ChevronLeft, ChevronRight, ArrowDownLeft, LayoutGrid, CalendarDays, History, TrendingDown, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BudgetCard } from '@/components/budgets/BudgetCard'
import { BudgetForm } from '@/components/budgets/BudgetForm'
import { DailyBudgetPlanner } from '@/components/budgets/DailyBudgetPlanner'
import { MonthlyExpenseLogView } from '@/components/budgets/MonthlyExpenseLogView'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { Budget } from '@/types'
import { THAI_MONTHS, calcRollover, formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PressCard } from '@/components/ui/PressCard'

export default function BudgetsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [formOpen, setFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'daily' | 'log'>('grid')

  const { getBudgetsByMonth, deleteBudget } = useBudgetStore()
  const { transactions } = useTransactionStore()

  const budgets = getBudgetsByMonth(month, year)

  const budgetsWithSpent = budgets.map((b) => ({
    ...b,
    spent: transactions
      .filter((t) => {
        const d = new Date(t.date)
        return (
          t.categoryId === b.categoryId &&
          t.type === 'EXPENSE' &&
          d.getMonth() + 1 === month &&
          d.getFullYear() === year
        )
      })
      .reduce((sum, t) => sum + t.amount, 0),
    rollover: calcRollover(b, transactions, getBudgetsByMonth),
  }))

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const handleEdit = (b: Budget) => {
    setEditingBudget(b)
    setFormOpen(true)
  }

  const handleDelete = () => {
    if (!deletingId) return
    deleteBudget(deletingId)
    toast.success('ลบงบประมาณสำเร็จ')
    setDeletingId(null)
  }

  const handleOpenAdd = () => {
    setEditingBudget(null)
    setFormOpen(true)
  }

  const totalBudget = budgetsWithSpent.reduce((sum, b) => sum + b.amount + (b.rollover ?? 0), 0)
  const totalSpent = budgetsWithSpent.reduce((sum, b) => sum + b.spent, 0)
  const remaining = totalBudget - totalSpent

  // Calculate percentage of budget used
  const usagePercent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0

  // Calculate Rollover Total
  const totalRollover = budgetsWithSpent.reduce((sum, b) => sum + (b.rollover ?? 0), 0)
  const rolloverCount = budgetsWithSpent.filter(b => (b.rollover ?? 0) > 0).length

  // Calculate status insights
  let statusMessage = 'เริ่มจากตั้งงบ 3 หมวดหลัก เช่น อาหาร เดินทาง ของใช้'
  let statusColorClass = 'bg-sky-100 border-sky-400 text-sky-700 dark:bg-sky-950/40 dark:border-sky-900 dark:text-sky-300 shadow-[0_4px_0_0_#0284c7]'
  let statusEmoji = '🐣'

  if (totalBudget > 0) {
    if (remaining < 0) {
      statusMessage = 'เกินงบแล้ว! ลองดูบันทึกรายจ่ายเพื่อปรับแผนและควบคุมค่าใช้จ่ายด่วน!'
      statusColorClass = 'bg-rose-100 border-rose-400 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 shadow-[0_4px_0_0_#e11d48]'
      statusEmoji = '⚠️'
    } else if (usagePercent > 80) {
      statusMessage = 'ใกล้ถึงเพดานงบแล้ว! ระมัดระวังหมวดหมู่ที่ใช้บ่อยในช่วงนี้เป็นพิเศษนะ'
      statusColorClass = 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 shadow-[0_4px_0_0_#d97706]'
      statusEmoji = '🚨'
    } else {
      statusMessage = 'ยอดเยี่ยมมาก! เดือนนี้คุณประหยัดเงินและทำภารกิจคุมงบได้ดี รักษาวินัยนี้ไว้!'
      statusColorClass = 'bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 shadow-[0_4px_0_0_#16a34a]'
      statusEmoji = '🛡️'
    }
  }

  return (
    <div className="space-y-6 pb-28 text-slate-800 dark:text-slate-100">

      {/* ── 1. HERO BUDGET QUEST CARD ── */}
      <PressCard
        shadow="0 6px 0 0 #2b6c00"
        shadowHover="0 3px 0 0 #2b6c00"
        className="relative overflow-hidden border-2 border-[#2b6c00] bg-gradient-to-r from-[#58cc02] to-[#2b6c00] p-6 sm:p-8 text-white rounded-[32px]"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black">ภารกิจคุมงบเดือนนี้</h2>
              <p className="text-xs text-green-100 font-bold uppercase tracking-widest mt-1 opacity-90">
                {THAI_MONTHS[month - 1]} {year + 543}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border-2 border-white/30 text-2xl shrink-0">
              {remaining >= 0 ? '🛡️' : '🚨'}
            </div>
          </div>

          {/* Quick numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20">
              <p className="text-[10px] font-black text-green-100 uppercase tracking-wider">งบประมาณทั้งหมด</p>
              <p className="text-lg font-black num mt-0.5">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20">
              <p className="text-[10px] font-black text-green-100 uppercase tracking-wider">ใช้ไปแล้ว</p>
              <p className="text-lg font-black num mt-0.5">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="bg-white/20 p-3.5 rounded-2xl border-2 border-white/40">
              <p className="text-[10px] font-black text-green-100 uppercase tracking-wider">คงเหลือ</p>
              <p className="text-lg font-black num mt-0.5">
                {remaining >= 0 ? formatCurrency(remaining) : `เกินงบ ${formatCurrency(Math.abs(remaining))}`}
              </p>
            </div>
          </div>

          {/* XP Progress bar */}
          {totalBudget > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black text-green-50 uppercase tracking-wide">
                <span>ความคืบหน้าการใช้จ่าย</span>
                <span>{usagePercent}%</span>
              </div>
              <div className="h-5 w-full bg-black/15 rounded-full overflow-hidden p-1 border-2 border-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    remaining < 0 ? "bg-rose-400" : usagePercent > 80 ? "bg-amber-400" : "bg-white"
                  )}
                  style={{ width: `${usagePercent}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </PressCard>

      {/* ── 2. MONTH NAVIGATOR ── */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-[0_4px_0_0_#e5e5e5] dark:shadow-[0_4px_0_0_#020617]">
        <button
          onClick={prevMonth}
          aria-label="เดือนก่อนหน้า"
          className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-250 dark:border-slate-700 shadow-[0_3px_0_0_#e5e5e5] dark:shadow-[0_3px_0_0_#020617] hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">เลือกด่านงบประมาณ</p>
          <h3 className="text-base font-black text-slate-850 dark:text-slate-100 mt-0.5">
            {THAI_MONTHS[month - 1]} {year + 543}
          </h3>
        </div>
        <button
          onClick={nextMonth}
          aria-label="เดือนถัดไป"
          className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl border-2 border-slate-250 dark:border-slate-700 shadow-[0_3px_0_0_#e5e5e5] dark:shadow-[0_3px_0_0_#020617] hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none transition-all"
        >
          <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      {/* ── 3. INSIGHT ALERT STRIP ── */}
      <div className={cn("p-4.5 rounded-2xl border-2 flex items-start gap-3.5 transition-all", statusColorClass)}>
        <span className="text-2.5xl shrink-0 mt-0.5 select-none">{statusEmoji}</span>
        <p className="font-bold text-sm leading-relaxed">{statusMessage}</p>
      </div>

      {/* ── 4. ROLLOVER CARD IF APPLICABLE ── */}
      {totalRollover > 0 && (
        <PressCard
          shadow="0 5px 0 0 #1d4ed8"
          shadowHover="0 2px 0 0 #1d4ed8"
          className="border-blue-400 bg-blue-500 text-white p-4.5 rounded-2xl"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-xl">
              💸
            </div>
            <div className="flex-grow">
              <p className="text-sm font-black">
                ทบยอดจากเดือนที่แล้ว +{formatCurrency(totalRollover)}
              </p>
              <p className="text-xs text-blue-100 mt-0.5 opacity-90 font-medium">
                {rolloverCount} หมวดหมู่มียอดทบสะสม · รวมเป็นงบเดือนนี้ทั้งสิ้น {formatCurrency(totalBudget)}
              </p>
            </div>
          </div>
        </PressCard>
      )}

      {/* ── 5. MINI STAT CARDS FOR GRID VIEW ── */}
      {budgetsWithSpent.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-3 gap-3">
          {/* Total Budget Card */}
          <PressCard
            shadow="0 5px 0 0 #4c1d95"
            shadowHover="0 3px 0 0 #4c1d95"
            className="border-violet-400 bg-violet-500 text-white p-3.5 flex flex-col justify-between h-28 rounded-2xl"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-violet-100">งบทั้งหมด</span>
              <PiggyBank className="w-4 h-4 text-violet-100" />
            </div>
            <p className="font-black text-sm sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(totalBudget)}>
              {formatCurrency(totalBudget)}
            </p>
          </PressCard>

          {/* Spent Card */}
          <PressCard
            shadow="0 5px 0 0 #9f1239"
            shadowHover="0 3px 0 0 #9f1239"
            className="border-rose-400 bg-rose-500 text-white p-3.5 flex flex-col justify-between h-28 rounded-2xl"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-100">ใช้ไปแล้ว</span>
              <TrendingDown className="w-4 h-4 text-rose-100" />
            </div>
            <p className="font-black text-sm sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(totalSpent)}>
              {formatCurrency(totalSpent)}
            </p>
          </PressCard>

          {/* Remaining/Overspent Card */}
          <PressCard
            shadow={remaining >= 0 ? '0 5px 0 0 #065f46' : '0 5px 0 0 #9f1239'}
            shadowHover={remaining >= 0 ? '0 3px 0 0 #065f46' : '0 3px 0 0 #9f1239'}
            className={cn(
              'text-white p-3.5 flex flex-col justify-between h-28 rounded-2xl border-2',
              remaining >= 0 ? 'border-emerald-400 bg-emerald-500' : 'border-rose-400 bg-rose-500'
            )}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/80">
                {remaining >= 0 ? 'คงเหลือ' : 'เกินงบ'}
              </span>
              <Zap className="w-4 h-4 text-white/85" />
            </div>
            <p className="font-black text-sm sm:text-base md:text-xl leading-none num truncate" title={formatCurrency(remaining)}>
              {formatCurrency(Math.abs(remaining))}
            </p>
          </PressCard>
        </div>
      )}

      {/* ── 6. CONTROLS, VIEW TOGGLE & PRIMARY ACTION ── */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Segmented control view toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700/80 gap-1 overflow-x-auto no-scrollbar">
          {([
            { key: 'grid',  label: 'งบรายเดือน', Icon: LayoutGrid  },
            { key: 'daily', label: 'แผนรายวัน',  Icon: CalendarDays },
            { key: 'log',   label: 'บันทึกรายจ่าย', Icon: History   },
          ] as const).map(({ key, label, Icon }) => {
            const active = view === key
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all border-b-2 whitespace-nowrap select-none',
                  active
                    ? 'bg-[#58cc02] text-white border-[#2b6c00] shadow-[0_2px_0_0_#2b6c00]'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-700'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* Primary Action Button */}
        {view !== 'log' && (
          <button
            onClick={handleOpenAdd}
            className="font-black text-sm px-6 py-3.5 rounded-2xl bg-[#58cc02] text-white border-2 border-[#2b6c00] border-b-4 shadow-[0_3px_0_0_#2b6c00] transform transition-all active:translate-y-[2px] active:border-b-2 hover:bg-[#58cc02] flex items-center justify-center gap-2 select-none"
          >
            <Plus className="w-4 h-4 stroke-[3px]" /> ตั้งงบประมาณ
          </button>
        )}
      </div>

      {/* ── 7. MAIN VIEW CONTENT ── */}
      {view === 'log' ? (
        <div className="space-y-2">
          <div className="px-1">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              บันทึกรายจ่ายเดือนนี้
            </h4>
            <p className="text-[11px] text-slate-400/80 mt-0.5">
              ประเมินธุรกรรมทั้งหมดที่เกิดขึ้นและกระทบต่องบประมาณ
            </p>
          </div>
          <PressCard
            shadow="0 6px 0 0 #e5e5e5"
            shadowHover="0 3px 0 0 #e5e5e5"
            className="border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 p-0 overflow-hidden"
          >
            <MonthlyExpenseLogView month={month} year={year} />
          </PressCard>
        </div>
      ) : budgetsWithSpent.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={PiggyBank}
            title="ยังไม่มีงบประมาณตั้งไว้"
            description="เริ่มตั้งเป้าหมายการเงินรายเดือนในหมวดหมู่สำคัญต่างๆ เช่น อาหาร หรือการเดินทาง"
            action={
              <button
                onClick={handleOpenAdd}
                className="font-black text-xs px-5 py-3 rounded-2xl bg-[#58cc02] text-white border-2 border-[#2b6c00] border-b-4 shadow-[0_2px_0_0_#2b6c00] active:translate-y-[2px] active:border-b-2 hover:bg-[#58cc02] flex items-center gap-1.5 transition-all select-none"
              >
                <Plus className="w-4 h-4 stroke-[3px]" /> เริ่มตั้งงบประมาณแรก
              </button>
            }
          />
        </div>
      ) : view === 'grid' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div>
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                ด่านงบประมาณย่อย
              </h4>
              <p className="text-[11px] text-slate-400/80 mt-0.5">
                ติดตามด่านการเก็บออมและสเปกเตอร์การใช้เงินแต่ละหมวด
              </p>
            </div>
            <span className="text-[10px] font-black text-[#2b6c00] dark:text-[#58cc02] px-3 py-1 bg-[#58cc02]/10 rounded-full border border-[#58cc02]/20">
              {budgets.length} ภารกิจเปิดอยู่
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetsWithSpent.map((b) => (
              <BudgetCard
                key={b.id}
                budget={b}
                spent={b.spent}
                rollover={b.rollover}
                onEdit={handleEdit}
                onDelete={setDeletingId}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="px-1">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              แผนการจัดสรรเงินรายวัน
            </h4>
            <p className="text-[11px] text-slate-400/80 mt-0.5">
              เช็คโควต้าเงินทีกำหนดให้ใช้รายวันเพื่อการวางแผนระยะยาว
            </p>
          </div>
          <PressCard
            shadow="0 6px 0 0 #e5e5e5"
            shadowHover="0 3px 0 0 #e5e5e5"
            className="border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 p-5"
          >
            <DailyBudgetPlanner
              budgets={budgetsWithSpent}
              month={month}
              year={year}
            />
          </PressCard>
        </div>
      )}

      {/* ── DIALOGS & FORMS ── */}
      <BudgetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingBudget={editingBudget}
        defaultMonth={month}
        defaultYear={year}
      />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="ลบงบประมาณ"
        description="คุณแน่ใจหรือไม่ว่าต้องการลบงบประมาณนี้?"
        onConfirm={handleDelete}
      />
    </div>
  )
}
