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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">งบประมาณ</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{budgets.length} หมวดหมู่</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.05]">
              {([
                { key: 'grid',  label: 'งบรายเดือน', Icon: LayoutGrid  },
                { key: 'daily', label: 'แผนรายวัน',  Icon: CalendarDays },
                { key: 'log',   label: 'บันทึกรายจ่าย', Icon: History   },
              ] as const).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    view === key
                      ? 'bg-violet-600 text-white shadow-[0_2px_0_0_#4c1d95]'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          {view !== 'log' && (
            <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 shrink-0">
              <Plus className="w-4 h-4 mr-1" />
              ตั้งงบประมาณ
            </Button>
          )}
        </div>
      </div>

      {/* Month navigator */}
      <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-black text-gray-800 dark:text-gray-100">
            {THAI_MONTHS[month - 1]} {year + 543}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </PressCard>

      {/* Rollover summary */}
      {(() => {
        const totalRollover = budgetsWithSpent.reduce((sum, b) => sum + (b.rollover ?? 0), 0)
        const rolloverCount = budgetsWithSpent.filter(b => (b.rollover ?? 0) > 0).length
        if (totalRollover <= 0) return null
        return (
          <PressCard shadow="0 4px 0 0 #1d4ed8" shadowHover="0 2px 0 0 #1d4ed8" className="border-blue-400 bg-blue-500 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  ทบยอดจากเดือนที่แล้ว +{formatCurrency(totalRollover)}
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  {rolloverCount} หมวดหมู่มียอดทบ · งบรวมเดือนนี้ {formatCurrency(budgetsWithSpent.reduce((s, b) => s + b.amount + (b.rollover ?? 0), 0))}
                </p>
              </div>
            </div>
          </PressCard>
        )
      })()}

      {/* Summary stats */}
      {budgetsWithSpent.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-3 gap-3">
          <PressCard shadow="0 5px 0 0 #4c1d95" className="border-violet-400 bg-violet-500 p-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <PiggyBank className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">งบทั้งหมด</p>
            <p className="text-white font-black text-xl leading-none num">{formatCurrency(totalBudget)}</p>
          </PressCard>

          <PressCard shadow="0 5px 0 0 #9f1239" className="border-rose-400 bg-rose-500 p-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">ใช้ไปแล้ว</p>
            <p className="text-white font-black text-xl leading-none num">{formatCurrency(totalSpent)}</p>
          </PressCard>

          {remaining >= 0 ? (
            <PressCard shadow="0 5px 0 0 #4c1d95" className="border-violet-400 bg-violet-500 p-4">
              <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">คงเหลือ</p>
              <p className="text-white font-black text-xl leading-none num">{formatCurrency(remaining)}</p>
            </PressCard>
          ) : (
            <PressCard shadow="0 5px 0 0 #9f1239" className="border-rose-400 bg-rose-500 p-4">
              <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">เกินงบ</p>
              <p className="text-white font-black text-xl leading-none num">{formatCurrency(Math.abs(remaining))}</p>
            </PressCard>
          )}
        </div>
      )}

      {/* Content */}
      {view === 'log' ? (
        <MonthlyExpenseLogView month={month} year={year} />
      ) : budgetsWithSpent.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="ยังไม่มีงบประมาณ"
          description="ตั้งงบประมาณรายหมวดหมู่เพื่อควบคุมค่าใช้จ่ายของคุณ"
          action={
            <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" />
              ตั้งงบประมาณแรก
            </Button>
          }
        />
      ) : view === 'grid' ? (
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
      ) : (
        <DailyBudgetPlanner
          budgets={budgetsWithSpent}
          month={month}
          year={year}
        />
      )}

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
