'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Target, Scale, Trophy, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalForm } from '@/components/goals/GoalForm'
import { GoalBehindAlert } from '@/components/goals/GoalBehindAlert'
import { GoalTimeline } from '@/components/goals/GoalTimeline'
import { useGoalStore } from '@/store/useGoalStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { useExchangeRateStore } from '@/store/useExchangeRateStore'
import { Goal } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { PressCard } from '@/components/ui/PressCard'

const MILESTONE_EMOJI: Record<number, string> = { 25: '🎯', 50: '⭐', 75: '🔥', 100: '🎉' }

export default function GoalsPage() {
  const { goals, deleteGoal, syncPortfolioGoals } = useGoalStore()
  const holdings  = useInvestmentStore((s) => s.holdings)
  const getRate   = useExchangeRateStore((s) => s.getRate)

  /* Sync portfolio-linked goals every time portfolio value changes */
  const portfolioValueTHB = holdings.reduce(
    (s, h) => s + h.units * h.currentPricePerUnit * getRate(h.currency ?? 'THB'), 0
  )

  const syncGoals = useCallback(() => {
    const hasLinked = goals.some((g) => g.linkedPortfolio)
    if (!hasLinked) return

    const results = syncPortfolioGoals(portfolioValueTHB)
    Object.entries(results).forEach(([goalId, milestones]) => {
      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return
      milestones.forEach((m, i) => {
        setTimeout(() => {
          toast.success(`${MILESTONE_EMOJI[m]} พอร์ตถึง ${m}% แล้ว!`, {
            description: `เป้าหมาย "${goal.name}" — ยอดเยี่ยมมาก!`,
            duration: 5000,
          })
        }, (i + 1) * 800)
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioValueTHB, syncPortfolioGoals])

  useEffect(() => { syncGoals() }, [syncGoals])
  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)

  const activeGoals = goals.filter((g) => g.savedAmount < g.targetAmount)
  const completedGoals = goals.filter((g) => g.savedAmount >= g.targetAmount)

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0)

  function handleEdit(g: Goal) {
    setEditingGoal(g)
    setFormOpen(true)
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingGoal(null)
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteGoal(deleteTarget.id)
    toast.success(`ลบเป้าหมาย "${deleteTarget.name}" แล้ว`)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">เป้าหมายการออม</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">ติดตามความคืบหน้าการออมเงิน</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
          <Plus className="w-4 h-4" />
          เพิ่มเป้าหมาย
        </Button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <PressCard shadow="0 5px 0 0 #4c1d95" className="border-violet-400 bg-violet-500 p-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">เป้าหมายทั้งหมด</p>
            <p className="text-white font-black text-xl leading-none num">{formatCurrency(totalTarget)}</p>
          </PressCard>

          <PressCard shadow="0 5px 0 0 #065f46" className="border-emerald-400 bg-emerald-500 p-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">ออมไปแล้ว</p>
            <p className="text-white font-black text-xl leading-none num">{formatCurrency(totalSaved)}</p>
          </PressCard>

          <PressCard shadow="0 5px 0 0 #92400e" className="border-amber-400 bg-amber-500 p-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">สำเร็จแล้ว</p>
            <p className="text-white font-black text-xl leading-none num">{completedGoals.length}/{goals.length}</p>
          </PressCard>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <EmptyState
          icon={Target}
          title="ยังไม่มีเป้าหมายการออม"
          description="ตั้งเป้าหมายเพื่อติดตามการออมเงินของคุณ เช่น ออมซื้อบ้าน กองทุนฉุกเฉิน ท่องเที่ยว"
          action={
            <Button onClick={() => setFormOpen(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus className="w-4 h-4" />
              เพิ่มเป้าหมายแรก
            </Button>
          }
        />
      )}

      {/* Timeline */}
      {goals.length > 0 && (
        <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 overflow-hidden p-0">
          <GoalTimeline goals={goals} />
        </PressCard>
      )}

      {/* Behind-schedule alert */}
      {activeGoals.length > 0 && <GoalBehindAlert goals={activeGoals} />}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-violet-600" />
            <h2 className="text-base font-black text-gray-900 dark:text-white">กำลังดำเนินการ ({activeGoals.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={handleEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        </section>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-black text-gray-900 dark:text-white">สำเร็จแล้ว ({completedGoals.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedGoals.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={handleEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        </section>
      )}

      <GoalForm open={formOpen} onOpenChange={handleFormClose} editingGoal={editingGoal} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบเป้าหมาย"
        description={`ต้องการลบ "${deleteTarget?.name}" ใช่หรือไม่? ข้อมูลการออมทั้งหมดจะหายไป`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
