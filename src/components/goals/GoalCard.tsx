'use client'

import { useState } from 'react'
import { Pencil, Trash2, Plus, Minus, CheckCircle2, TrendingUp } from 'lucide-react'
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

  const handleSave = () => {
    const n = parseFloat(amount)
    if (isNaN(n) || n <= 0) { toast.error('กรุณาระบุจำนวนเงินที่ถูกต้อง'); return }

    const newMilestones = addSaving(goal.id, mode === 'add' ? n : -n)
    toast.success(mode === 'add' ? `เพิ่มเงิน ${formatCurrency(n)} เข้าเป้าหมาย` : `ถอนเงิน ${formatCurrency(n)} จากเป้าหมาย`)

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

  return (
    <>
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${
        isCompleted ? 'border-violet-200 dark:border-violet-800' : isPastDue ? 'border-red-200 dark:border-red-900' : 'border-gray-200 dark:border-gray-700'
      }`}>
        {/* Color bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: goal.color }} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: goal.color + '20' }}>
                {isCompleted
                  ? <CheckCircle2 className="w-5 h-5 text-violet-500" />
                  : <CategoryIcon name={goal.icon} className="w-5 h-5" style={{ color: goal.color }} />
                }
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{goal.name}</h3>
                {goal.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{goal.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <button onClick={() => onEdit(goal)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(goal)} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Amounts */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(goal.savedAmount)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {goal.linkedPortfolio ? '📊 มูลค่าพอร์ต / เป้าหมาย' : 'จาก'} {formatCurrency(goal.targetAmount)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-lg font-semibold" style={{ color: goal.color }}>{Math.round(pct)}%</p>
              {goal.linkedPortfolio && (
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
                  <TrendingUp className="w-2.5 h-2.5" />
                  ซิงค์อัตโนมัติ
                </span>
              )}
            </div>
          </div>

          {/* Progress bar with milestone markers */}
          <div className="relative mb-6">
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: isCompleted ? '#22c55e' : goal.color }}
              />
            </div>

            {/* Milestone dots */}
            {[25, 50, 75, 100].map((m) => {
              const reached = pct >= m
              const isCelebrated = celebrated.includes(m)
              return (
                <div
                  key={m}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${m}%` }}
                  title={`${m}%`}
                >
                  <div
                    className={`rounded-full border-2 border-white dark:border-gray-900 transition-all duration-300 ${
                      isCelebrated
                        ? 'w-3.5 h-3.5 shadow-md ring-2 ring-offset-1 ring-white/60 dark:ring-gray-900/60'
                        : reached
                          ? 'w-3 h-3'
                          : 'w-2.5 h-2.5 opacity-35'
                    }`}
                    style={{ backgroundColor: reached ? (isCompleted ? '#22c55e' : goal.color) : '#d1d5db' }}
                  />
                </div>
              )
            })}

            {/* Milestone labels below */}
            <div className="flex justify-between mt-2 px-0">
              {[25, 50, 75, 100].map((m) => (
                <div key={m} className="flex flex-col items-center" style={{ width: 0, marginLeft: `${m === 25 ? 25 : m === 50 ? 50 : m === 75 ? 75 : 100}%`, position: 'absolute', left: `${m}%`, transform: 'translateX(-50%)' }}>
                  <span className={`text-[9px] mt-1 font-medium transition-colors ${
                    pct >= m ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-700'
                  }`}>
                    {celebrated.includes(m) ? MILESTONE_EMOJI[m] : `${m}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
              <p className="text-gray-400 dark:text-gray-500 mb-0.5">เหลืออีก</p>
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                {isCompleted ? '🎉 สำเร็จแล้ว!' : formatCurrency(remaining)}
              </p>
            </div>
            <div className={`rounded-lg p-2.5 ${isPastDue ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
              <p className={`mb-0.5 ${isPastDue ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>วันที่เป้าหมาย</p>
              <p className={`font-semibold ${isPastDue ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                {isCompleted
                  ? targetDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
                  : isPastDue
                    ? `เกินกำหนด ${Math.abs(daysLeft)} วัน`
                    : `${daysLeft} วัน`
                }
              </p>
            </div>
            {!isCompleted && monthlyNeeded > 0 && (
              <div className="col-span-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                <p className="text-gray-400 dark:text-gray-500 mb-0.5">ต้องออมต่อเดือน</p>
                <p className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(monthlyNeeded)}</p>
              </div>
            )}
          </div>

          {/* Action button */}
          {!isCompleted && !goal.linkedPortfolio && (
            <Button
              onClick={() => setSavingOpen(true)}
              className="w-full gap-2 text-white"
              style={{ backgroundColor: goal.color }}
            >
              <Plus className="w-4 h-4" />
              บันทึกการออม
            </Button>
          )}
          {!isCompleted && goal.linkedPortfolio && (
            <div className="w-full py-2 px-4 rounded-xl text-center text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
              📊 อัปเดตอัตโนมัติจากพอร์ตลงทุน
            </div>
          )}
          {isCompleted && (
            <div className="w-full py-2 text-center text-sm font-medium text-violet-600 dark:text-violet-400">
              🎉 บรรลุเป้าหมายแล้ว!
            </div>
          )}
        </div>
      </div>

      {/* Add saving dialog */}
      <Dialog open={savingOpen} onOpenChange={setSavingOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>บันทึกการออม — {goal.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${mode === 'add' ? 'text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                style={mode === 'add' ? { backgroundColor: goal.color } : {}}
              >
                <Plus className="w-4 h-4" /> เพิ่มเงิน
              </button>
              <button
                type="button"
                onClick={() => setMode('subtract')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${mode === 'subtract' ? 'bg-gray-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <Minus className="w-4 h-4" /> ถอนเงิน
              </button>
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">฿</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                ออมอยู่: {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}
              </p>
            </div>

            {/* Next milestone hint */}
            {(() => {
              const next = [25, 50, 75, 100].find((m) => pct < m && !celebrated.includes(m))
              if (!next) return null
              const needed = (goal.targetAmount * next / 100) - goal.savedAmount
              return (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs">
                  <span>{MILESTONE_EMOJI[next]}</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    อีก <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(needed)}</span> ถึง milestone {next}%
                  </span>
                </div>
              )
            })()}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSavingOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} className="text-white" style={{ backgroundColor: goal.color }}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
