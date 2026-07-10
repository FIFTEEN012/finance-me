'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus, Minus, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useGoalStore } from '@/store/useGoalStore'
import { Goal } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface GoalCardProps {
  goal: Goal
  onEdit: (g: Goal) => void
  onDelete: (g: Goal) => void
}

const MILESTONE_EMOJI: Record<number, string> = { 25: '🎯', 50: '⭐', 75: '🔥', 100: '🎉' }

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const { addSaving } = useGoalStore()
  const [savingOpen, setSavingOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'add' | 'subtract'>('add')

  const pct = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0
  const remaining = goal.targetAmount - goal.savedAmount
  const isCompleted = goal.savedAmount >= goal.targetAmount

  const targetDate = new Date(goal.targetDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isPastDue = daysLeft < 0 && !isCompleted

  const monthsLeft = daysLeft > 0 ? Math.max(1, Math.ceil(daysLeft / 30)) : 0
  const monthlyNeeded = remaining > 0 && monthsLeft > 0 ? remaining / monthsLeft : 0

  const celebrated = goal.milestonesCelebrated ?? []

  // Dynamic Level Calculation
  const lvl = isCompleted ? 5 : pct < 25 ? 1 : pct < 50 ? 2 : pct < 75 ? 3 : 4

  const handleSave = () => {
    const n = parseFloat(amount)
    if (isNaN(n) || n <= 0) {
      toast.error('กรุณาระบุจำนวนเงินที่ถูกต้อง')
      return
    }

    const newMilestones = addSaving(goal.id, mode === 'add' ? n : -n)
    toast.success(
      mode === 'add'
        ? `เพิ่มเงิน ${formatCurrency(n)} เข้าเป้าหมาย`
        : `ถอนเงิน ${formatCurrency(n)} จากเป้าหมาย`
    )

    newMilestones.forEach((m, i) => {
      setTimeout(() => {
        toast.success(`${MILESTONE_EMOJI[m]} ถึง ${m}% แล้ว!`, {
          description: `เป้าหมาย "${goal.name}" — ยอดเยี่ยมมาก!`,
          duration: 5000,
        })
      }, (i + 1) * 800)
    })

    setAmount('')
    setSavingOpen(false)
  }

  // Helper to render icon (emoji or Lucide icon fallback)
  const renderIcon = () => {
    if (isCompleted) {
      return <CheckCircle2 className="w-8 h-8 text-violet-600" />
    }
    const isEmoji = !/^[A-Za-z0-9]+$/.test(goal.icon)
    if (isEmoji) {
      return <span className="text-3xl select-none leading-none">{goal.icon}</span>
    }
    return <CategoryIcon name={goal.icon} className="w-8 h-8" style={{ color: goal.color }} />
  }

  // Dynamic colors for icon container based on goal HEX color
  const bgColor = goal.color + '15'
  const borderColor = goal.color + '35'
  const shadowColor = goal.color + '30'

  return (
    <>
      <div className={`bg-white dark:bg-slate-900 rounded-3xl border-2 p-6 shadow-[0_6px_0_0_#e2e8f0] dark:shadow-[0_6px_0_0_#1e293b] relative overflow-hidden group hover:scale-[1.02] transition-all duration-200 ${
        isCompleted
          ? 'border-violet-250 dark:border-violet-800'
          : isPastDue
            ? 'border-red-200 dark:border-red-900'
            : 'border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: isCompleted ? '#f5f3ff' : bgColor,
              borderColor: isCompleted ? '#ddd6fe' : borderColor,
              boxShadow: `0 4px 0 0 ${isCompleted ? '#ddd6fe' : shadowColor}`,
            }}
          >
            {renderIcon()}
          </div>
          
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => onEdit(goal)}
              className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="แก้ไขเป้าหมาย"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(goal)}
              className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-colors"
              title="ลบเป้าหมาย"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div
              className="text-white text-xs font-black px-3 py-1 rounded-full uppercase ml-1.5 shadow-[0_2px_0_0_rgba(0,0,0,0.15)]"
              style={{ backgroundColor: isCompleted ? '#8b5cf6' : goal.color }}
            >
              Lv. {lvl}
            </div>
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-0.5 truncate" title={goal.name}>
          {goal.name}
        </h3>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4">
          {goal.linkedPortfolio ? '📊 พอร์ตเป้าหมาย' : 'เป้าหมาย'}: {formatCurrency(goal.targetAmount)}
        </p>

        {/* Progress bar with milestone dots */}
        <div className="relative mb-5">
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 p-0.5 border border-slate-200/50 dark:border-slate-700/50">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: isCompleted ? '#8b5cf6' : goal.color,
              }}
            />
          </div>

          {/* Milestone markers along progress bar */}
          {[25, 50, 75].map((m) => {
            const reached = pct >= m
            const isCelebrated = celebrated.includes(m)
            return (
              <div
                key={m}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-help"
                style={{ left: `${m}%` }}
                title={`เป้าหมายย่อยที่ ${m}%`}
              >
                <div
                  className={`rounded-full border-2 border-white dark:border-slate-900 transition-all duration-300 ${
                    isCelebrated ? 'w-4 h-4 shadow-md' : reached ? 'w-3.5 h-3.5' : 'w-3 h-3 opacity-50'
                  }`}
                  style={{
                    backgroundColor: reached ? (isCompleted ? '#8b5cf6' : goal.color) : '#cbd5e1',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Bottom details and stats */}
        <div className="grid grid-cols-2 gap-2 text-xs font-medium mb-4">
          <div className="bg-slate-50 dark:bg-slate-850 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
              ออมสะสมแล้ว
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-350 num">
              {formatCurrency(goal.savedAmount)}
            </span>
          </div>

          <div className={`rounded-xl p-2.5 border ${isPastDue ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-855 border-slate-100 dark:border-slate-800'}`}>
            <span className={`text-[10px] font-black uppercase tracking-wider block mb-0.5 ${isPastDue ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
              ระยะเวลาที่เหลือ
            </span>
            <span className={`font-bold num ${isPastDue ? 'text-red-500' : 'text-slate-700 dark:text-slate-350'}`}>
              {isCompleted
                ? 'เสร็จสิ้น 🏆'
                : isPastDue
                  ? `เกินกำหนด ${Math.abs(daysLeft)} วัน`
                  : `${daysLeft} วัน`}
            </span>
          </div>

          {!isCompleted && monthlyNeeded > 0 && (
            <div className="col-span-2 bg-slate-50 dark:bg-slate-850 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">
                ต้องการออมต่อเดือน
              </span>
              <span className="font-bold text-slate-750 dark:text-slate-350 num">
                {formatCurrency(monthlyNeeded)}
              </span>
            </div>
          )}
        </div>

        {/* Footer row: status message & action button */}
        <div className="flex justify-between items-center gap-4">
          <span className="text-xs font-black uppercase tracking-wider" style={{ color: isCompleted ? '#8b5cf6' : goal.color }}>
            {isCompleted ? 'สำเร็จด่านแล้ว! 🎉' : `${Math.round(pct)}% สำเร็จ`}
          </span>

          {!isCompleted && !goal.linkedPortfolio && (
            <button
              onClick={() => setSavingOpen(true)}
              className="tactile-button bg-slate-800 hover:bg-slate-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-[0_4px_0_0_#000] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer select-none"
            >
              จัดการด่าน
            </button>
          )}

          {!isCompleted && goal.linkedPortfolio && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-500/20 shrink-0">
              <TrendingUp className="w-3 h-3" />
              ซิงค์อัตโนมัติ
            </span>
          )}

          {isCompleted && (
            <span className="text-sm font-black text-violet-650 dark:text-violet-400">
              🏆 Trophy
            </span>
          )}
        </div>
      </div>

      {/* Add saving dialog */}
      <Dialog open={savingOpen} onOpenChange={setSavingOpen}>
        <DialogContent className="max-w-xs bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 shadow-[0_12px_0_0_rgba(0,0,0,0.1)] rounded-3xl p-6 overflow-hidden">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-black text-slate-800 dark:text-slate-100">
              บันทึกการออม — {goal.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex rounded-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-850 p-1">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`flex-grow flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition-all ${
                  mode === 'add'
                    ? 'text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                style={mode === 'add' ? { backgroundColor: goal.color } : {}}
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มเงิน
              </button>
              <button
                type="button"
                onClick={() => setMode('subtract')}
                className={`flex-grow flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition-all ${
                  mode === 'subtract'
                    ? 'bg-slate-800 text-white shadow-[0_2px_0_0_#000]'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Minus className="w-3.5 h-3.5" /> ถอนเงิน
              </button>
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">฿</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-8 py-3 rounded-2xl border-2 border-slate-200 focus:border-primary-container focus:ring-0 font-bold text-slate-800 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 transition-all"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                ออมอยู่: <span className="font-bold text-slate-600 dark:text-slate-350">{formatCurrency(goal.savedAmount)}</span> / {formatCurrency(goal.targetAmount)}
              </p>
            </div>

            {/* Next milestone hint */}
            {(() => {
              const next = [25, 50, 75, 100].find((m) => pct < m && !celebrated.includes(m))
              if (!next) return null
              const needed = (goal.targetAmount * next) / 100 - goal.savedAmount
              return (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-base">{MILESTONE_EMOJI[next]}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    อีก <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(needed)}</span> ถึง milestone {next}%
                  </span>
                </div>
              )
            })()}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setSavingOpen(false)}
              className="rounded-xl border-2 font-bold cursor-pointer"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSave}
              className="text-white rounded-xl font-bold border-b-4 cursor-pointer"
              style={{
                backgroundColor: goal.color,
                borderBottomColor: '#00000030',
              }}
            >
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
