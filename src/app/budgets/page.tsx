'use client'

import { useState } from 'react'
import { Plus, PiggyBank, ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, History, Shield, TrendingDown, CheckSquare } from 'lucide-react'
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
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const handleEdit = (b: Budget) => {
    setEditingGoal(b)
    setFormOpen(true)
  }

  const setEditingGoal = (b: Budget | null) => {
    setEditingBudget(b)
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
  const usagePercent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0

  const totalRollover = budgetsWithSpent.reduce((sum, b) => sum + (b.rollover ?? 0), 0)
  const rolloverCount = budgetsWithSpent.filter((b) => (b.rollover ?? 0) > 0).length

  // Calculate status insights
  let statusMessage = 'เริ่มจากตั้งงบ 3 หมวดหลัก เช่น อาหาร เดินทาง ของใช้'
  let statusColorClass = 'bg-sky-100 border-sky-400 text-sky-700 dark:bg-sky-950/40 dark:border-sky-900 dark:text-sky-300 shadow-[0_4px_0_0_#0284c7] dark:shadow-none'
  let statusEmoji = '🐣'

  if (totalBudget > 0) {
    if (remaining < 0) {
      statusMessage = 'เกินงบแล้ว! ลองดูบันทึกรายจ่ายเพื่อปรับแผนและควบคุมค่าใช้จ่ายด่วน!'
      statusColorClass = 'bg-rose-100 border-rose-450 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 shadow-[0_4px_0_0_#ba1a1a] dark:shadow-none'
      statusEmoji = '⚠️'
    } else if (usagePercent > 80) {
      statusMessage = 'ใกล้ถึงเพดานงบแล้ว! ระมัดระวังหมวดหมู่ที่ใช้บ่อยในช่วงนี้เป็นพิเศษนะ'
      statusColorClass = 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 shadow-[0_4px_0_0_#ff9c27] dark:shadow-none'
      statusEmoji = '🚨'
    } else {
      statusMessage = 'เยี่ยมมาก! เดือนนี้คุณยังประหยัดได้ตามแผนที่วางไว้ รักษาวินัยแบบนี้ต่อไปนะ!'
      statusColorClass = 'bg-[#c8e6ff] border-[#006590] text-[#001e2e] dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-100 shadow-[0_4px_0_0_#004c6e] dark:shadow-none'
      statusEmoji = '🛡️'
    }
  }

  return (
    <div className="space-y-6 pb-28 text-slate-800 dark:text-slate-100">
      
      {/* ── 1. MONTH NAVIGATOR ── */}
      <div className="flex items-center justify-between bg-[#eeeeed] dark:bg-slate-900 p-4 rounded-2xl border-[3px] border-[#becbb1] dark:border-slate-800 shadow-[0_4px_0_0_rgba(0,0,0,0.05)]">
        <button
          onClick={prevMonth}
          aria-label="เดือนก่อนหน้า"
          className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl border-2 border-[#becbb1] dark:border-slate-700 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] hover:translate-y-[2px] transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-350" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-[#6f7b64] dark:text-[#c2cfb4] uppercase tracking-[0.05em] font-sans">เลือกด่านงบประมาณ</p>
          <h2 className="text-xl font-black text-[#2b6c00] dark:text-[#87fe45] leading-tight mt-0.5">
            {THAI_MONTHS[month - 1]} {year + 543}
          </h2>
        </div>
        <button
          onClick={nextMonth}
          aria-label="เดือนถัดไป"
          className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl border-2 border-[#becbb1] dark:border-slate-700 shadow-[0_4px_0_0_rgba(0,0,0,0.1)] hover:translate-y-[2px] transition-all cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-350" />
        </button>
      </div>

      {/* ── 2. HERO BUDGET CARD ── */}
      <section className="relative bg-[var(--quest-primary-container)] text-[var(--quest-on-primary-container)] p-8 rounded-[32px] border-[3px] border-[var(--quest-primary)] shadow-[0_8px_0_0_var(--quest-primary)] overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-white">ภารกิจคุมงบเดือนนี้</h3>
              <p className="text-sm font-semibold text-white/90 mt-1">
                เป้าหมาย: ใช้ให้น้อยกว่าที่ตั้งไว้!
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border-2 border-white/30 text-white animate-bounce shrink-0">
              <Shield className="w-10 h-10" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/20 text-white">
              <p className="text-[10px] font-black text-green-50 uppercase tracking-wider">งบประมาณทั้งหมด</p>
              <p className="text-xl sm:text-2xl font-black num leading-none mt-1">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/20 text-white">
              <p className="text-[10px] font-black text-green-50 uppercase tracking-wider">ใช้ไปแล้ว</p>
              <p className="text-xl sm:text-2xl font-black num leading-none mt-1">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl border-2 border-white/40 text-white">
              <p className="text-[10px] font-black text-green-50 uppercase tracking-wider font-bold">คงเหลือ</p>
              <p className="text-xl sm:text-2xl font-black num leading-none mt-1">
                {remaining >= 0 ? formatCurrency(remaining) : `เกินงบ ${formatCurrency(Math.abs(remaining))}`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-black text-green-50 uppercase tracking-wide">
              <span>ความคืบหน้าการใช้จ่าย</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="h-6 w-full bg-[#1e5000]/25 rounded-full overflow-hidden p-1 border-2 border-[#1e5000]/30">
              <div
                className="h-full bg-white rounded-full progress-bar-glow transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. STATUS MESSAGE ── */}
      <div className={cn('p-5 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300', statusColorClass)}>
        <span className="text-3xl select-none leading-none">{statusEmoji}</span>
        <p className="font-bold text-sm leading-relaxed">{statusMessage}</p>
      </div>

      {/* ── 4. ROLLOVER CARD IF APPLICABLE ── */}
      {totalRollover > 0 && (
        <div className="bg-[#c8e6ff] text-[#001e2e] dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-100 p-4.5 rounded-2xl border-2 border-[#006590] dark:border-slate-700 shadow-[0_4px_0_0_#004c6e] dark:shadow-none flex items-center gap-4">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#006590] text-white flex items-center justify-center text-xl">
            💸
          </div>
          <div className="flex-grow">
            <p className="text-sm font-black">
              ทบยอดจากเดือนที่แล้ว +{formatCurrency(totalRollover)}
            </p>
            <p className="text-xs text-[#004c6e] dark:text-slate-400 mt-0.5 opacity-90 font-medium">
              {rolloverCount} หมวดหมู่มียอดทบสะสม · รวมเป็นงบเดือนนี้ทั้งสิ้น {formatCurrency(totalBudget)}
            </p>
          </div>
        </div>
      )}

      {/* ── 5. MINI STAT CARDS FOR GRID VIEW ── */}
      {budgetsWithSpent.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Budget Card */}
          <div className="bg-[#ffdcbf] border-2 border-[#ff9c27] shadow-[0_4px_0_0_#6a3b00] p-6 rounded-3xl dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-100 dark:shadow-none flex flex-col justify-between gap-3 h-28">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8c5000] dark:text-[#ffdcbf]">Total Budget</span>
              <PiggyBank className="w-5 h-5 text-[#8c5000] dark:text-[#ffdcbf]" />
            </div>
            <p className="text-xl font-black num leading-none text-[#2d1600] dark:text-white truncate">
              {formatCurrency(totalBudget)}
            </p>
          </div>

          {/* Spent Card */}
          <div className="bg-[#ffdad6] border-2 border-[#ba1a1a] shadow-[0_4px_0_0_#93000a] p-6 rounded-3xl dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-100 dark:shadow-none flex flex-col justify-between gap-3 h-28">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#ba1a1a] dark:text-[#ffdad6]">Total Spent</span>
              <TrendingDown className="w-5 h-5 text-[#ba1a1a] dark:text-[#ffdad6]" />
            </div>
            <p className="text-xl font-black num leading-none text-[#93000a] dark:text-white truncate">
              {formatCurrency(totalSpent)}
            </p>
          </div>

          {/* Remaining Card */}
          <div className="bg-[var(--quest-primary-container)]/20 border-2 border-[var(--quest-primary-container)] shadow-[0_4px_0_0_var(--quest-primary)] p-6 rounded-3xl dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-100 dark:shadow-none flex flex-col justify-between gap-3 h-28">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]">Remaining</span>
              <Shield className="w-5 h-5 text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]" />
            </div>
            <p className="text-xl font-black num leading-none text-slate-900 dark:text-white truncate">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
      )}

      {/* ── 6. CONTROLS, VIEW TOGGLE & PRIMARY ACTION ── */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Segmented control view toggle */}
        <div className="flex bg-[#eeeeed] dark:bg-slate-850 p-2 rounded-2xl border-2 border-[#becbb1] dark:border-slate-800 shadow-inner w-full md:w-auto flex-row gap-1">
          {([
            { key: 'grid', label: 'งบรายเดือน', Icon: LayoutGrid },
            { key: 'daily', label: 'แผนรายวัน', Icon: CalendarDays },
            { key: 'log', label: 'บันทึกรายจ่าย', Icon: History },
          ] as const).map(({ key, label }) => {
            const active = view === key
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  'flex-1 px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap text-xs sm:text-sm select-none cursor-pointer',
                  active
                    ? 'bg-white dark:bg-slate-700 text-[#2b6c00] dark:text-[#87fe45] shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active-press'
                    : 'text-[#6f7b64] dark:text-slate-400 hover:text-[#2b6c00] dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800'
                )}
              >
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* Primary Action Button */}
        {view !== 'log' && (
          <button
            onClick={handleOpenAdd}
            className="w-full md:w-auto px-10 py-4 bg-[var(--quest-primary-container)] text-white border-2 border-[var(--quest-primary)] rounded-2xl font-black text-sm shadow-[0_6px_0_0_var(--quest-primary)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-3 select-none cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3px]" /> ตั้งงบประมาณ
          </button>
        )}
      </div>

      {/* ── 7. MAIN VIEW CONTENT ── */}
      {view === 'log' ? (
        <div className="space-y-2">
          <div className="px-1">
            <h4 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              บันทึกรายจ่ายเดือนนี้
            </h4>
            <p className="text-xs text-slate-400/80 mt-0.5">
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
                className="font-black text-xs px-5 py-3 rounded-2xl bg-[var(--quest-primary-container)] text-white border-2 border-[var(--quest-primary)] border-b-4 shadow-[0_2px_0_0_var(--quest-primary)] active:translate-y-[2px] active:border-b-2 hover:bg-[var(--quest-primary-container)] flex items-center gap-1.5 transition-all select-none cursor-pointer"
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
              <h4 className="text-sm font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                ด่านงบประมาณย่อย
              </h4>
              <p className="text-xs text-slate-400/80 mt-0.5">
                ติดตามด่านการเก็บออมและสเปกเตอร์การใช้เงินแต่ละหมวด
              </p>
            </div>
            <span className="text-xs font-bold text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)] px-4 py-1 bg-[var(--quest-primary-container)]/20 rounded-full border border-[var(--quest-primary-container)]/30">
              {budgets.length} ภารกิจเปิดอยู่
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Empty State Placeholder to quickly add budget */}
            <div
              onClick={handleOpenAdd}
              className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 hover:border-[var(--quest-primary-container)] dark:hover:bg-slate-800/30 p-6 rounded-3xl border-2 border-dashed border-[#becbb1] dark:border-slate-800 flex flex-col items-center justify-center text-center opacity-65 cursor-pointer transition-colors group h-full min-h-[140px]"
            >
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🐣</span>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">เพิ่มงบหมวดหมู่ใหม่</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="px-1">
            <h4 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              แผนการจัดสรรเงินรายวัน
            </h4>
            <p className="text-xs text-slate-400/80 mt-0.5">
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
