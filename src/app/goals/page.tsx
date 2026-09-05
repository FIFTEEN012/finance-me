'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Target, Trophy, Sparkles, AlertCircle, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalForm } from '@/components/goals/GoalForm'
import { GoalBehindAlert } from '@/components/goals/GoalBehindAlert'
import { GoalTimeline } from '@/components/goals/GoalTimeline'
import { useGoalStore } from '@/store/useGoalStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { Goal } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { PressCard } from '@/components/ui/PressCard'
import { CategoryIcon } from '@/components/shared/CategoryIcon'

const MILESTONE_EMOJI: Record<number, string> = { 25: '🎯', 50: '⭐', 75: '🔥', 100: '🎉' }

export default function GoalsPage() {
  const { goals, deleteGoal, syncPortfolioGoals } = useGoalStore()
  const holdings = useInvestmentStore((s) => s.holdings)

  /* Sync portfolio-linked goals every time portfolio value changes */
  const portfolioValueTHB = holdings.reduce(
    (s, h) => s + h.units * h.currentPricePerUnit,
    0
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

  useEffect(() => {
    syncGoals()
  }, [syncGoals])

  const [formOpen, setFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)
  const [selectedCompletedGoal, setSelectedCompletedGoal] = useState<Goal | null>(null)

  const activeGoals = goals.filter((g) => g.savedAmount < g.targetAmount)
  const completedGoals = goals.filter((g) => g.savedAmount >= g.targetAmount)

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0)
  const remainingTotal = Math.max(totalTarget - totalSaved, 0)

  // Overall savings progress calculation
  const overallProgress = totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0

  function handleEdit(g: Goal) {
    setEditingGoal(g)
    setFormOpen(true)
    setSelectedCompletedGoal(null)
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

  // Calculate motivation message based on overall progress
  let motivationMessage = 'เริ่มต้นดีมีชัยไปกว่าครึ่ง ตั้งเป้าหมายออมเงินแล้วลุยกันเลย! 💰'
  if (totalTarget > 0) {
    if (overallProgress >= 100) {
      motivationMessage = 'สำเร็จแล้ว 100% สู้ต่อไปนะ อีกนิดเดียว!'
    } else if (overallProgress >= 80) {
      motivationMessage = `สำเร็จแล้ว ${overallProgress}% สู้ต่อไปนะ อีกนิดเดียว!`
    } else if (overallProgress >= 50) {
      motivationMessage = `สำเร็จแล้ว ${overallProgress}% สู้ต่อไปนะ อีกนิดเดียว!`
    } else if (overallProgress > 0) {
      motivationMessage = `สำเร็จแล้ว ${overallProgress}% สู้ต่อไปนะ อีกนิดเดียว!`
    }
  }

  // Helper to render completed goal trophy icon (emoji or Lucide icon fallback)
  const renderCompletedIcon = (goal: Goal) => {
    const isEmoji = !/^[A-Za-z0-9]+$/.test(goal.icon)
    if (isEmoji) {
      return <span className="text-5xl select-none leading-none text-white group-hover:scale-110 transition-transform">{goal.icon}</span>
    }
    return (
      <CategoryIcon
        name={goal.icon}
        className="w-14 h-14 text-white group-hover:scale-110 transition-transform"
      />
    )
  }

  return (
    <div className="space-y-6 pb-28 text-slate-800 dark:text-slate-100">

      {/* ── 1. HERO GOAL CARD ── */}
      <section className="relative overflow-hidden rounded-[32px] bg-[#58cc02] p-8 border-b-8 border-[#2b6c00] text-white shadow-[0_6px_0_0_#1f5100]">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 flex flex-col gap-4 text-center md:text-left items-center md:items-start">
            <h1 className="text-3xl md:text-5xl font-black leading-tight">เส้นทางพิชิตเป้าหมายการออม</h1>
            <p className="text-base sm:text-lg font-medium opacity-90">
              ออมทีละนิด ปลดล็อกความสำเร็จทีละด่าน
            </p>
            <button
              onClick={() => setFormOpen(true)}
              className="tactile-button mt-4 bg-white text-[#2b6c00] px-8 py-4 rounded-2xl font-black text-xl shadow-[0_6px_0_0_#cbd5e1] border border-slate-200 w-fit transition-transform select-none cursor-pointer flex items-center gap-2"
            >
              เริ่มออมเลย!
            </button>
          </div>
          <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/40 animate-bounce shrink-0 text-[100px] select-none">
            🏆
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </section>

      {/* ── 2. OVERALL PROGRESS TRACKER ── */}
      {goals.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-slate-200 dark:border-slate-800 shadow-[0_6px_0_0_#e2e8f0] dark:shadow-none space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <span className="text-xl">⚡</span> พลังงานการออมรวม
            </h3>
            <span className="text-2xl font-black text-[#2b6c00] dark:text-[#58cc02]">{overallProgress}%</span>
          </div>
          <div className="w-full h-10 bg-slate-100 dark:bg-slate-800 rounded-full border-2 border-slate-200 dark:border-slate-700 overflow-hidden p-1.5">
            <div
              className="h-full bg-[#58cc02] rounded-full relative transition-all duration-1000"
              style={{ width: `${overallProgress}%` }}
            >
              <div className="absolute top-0 right-0 h-full w-4 bg-white/30 rounded-full"></div>
            </div>
          </div>
          <p className="mt-3 text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-sm">
            {motivationMessage}
          </p>
        </section>
      )}

      {/* ── 3. TACTILE SUMMARY CARDS ── */}
      {goals.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-violet-100 dark:bg-violet-950/20 rounded-3xl p-6 border-2 border-violet-200 dark:border-violet-900 shadow-[0_6px_0_0_#4c1d95] dark:shadow-none flex flex-col gap-2">
            <p className="text-violet-750 dark:text-violet-300 font-bold text-xs uppercase tracking-wider">เป้าหมายทั้งหมด</p>
            <div className="flex items-baseline justify-between mt-1 min-w-0">
              <span className="text-3xl font-black text-violet-900 dark:text-violet-250 truncate">
                {formatCurrency(totalTarget)}
              </span>
              <span className="text-violet-650 dark:text-violet-400 font-bold text-sm shrink-0">
                {goals.length} ด่าน
              </span>
            </div>
          </div>

          <div className="bg-emerald-150 dark:bg-emerald-950/20 rounded-3xl p-6 border-2 border-emerald-200 dark:border-emerald-900 shadow-[0_6px_0_0_#16a34a] dark:shadow-none flex flex-col gap-2">
            <p className="text-emerald-750 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">ออมไปแล้ว</p>
            <div className="flex items-baseline justify-between mt-1 min-w-0">
              <span className="text-3xl font-black text-emerald-900 dark:text-emerald-250 truncate">
                {formatCurrency(totalSaved)}
              </span>
              <span className="text-emerald-650 dark:text-emerald-450 font-bold text-xs shrink-0 truncate ml-1">
                เหลืออีก {formatCurrency(remainingTotal)}
              </span>
            </div>
          </div>

          <div className="bg-amber-100 dark:bg-amber-950/20 rounded-3xl p-6 border-2 border-amber-200 dark:border-amber-900 shadow-[0_6px_0_0_#92400e] dark:shadow-none flex flex-col gap-2">
            <p className="text-amber-750 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">สำเร็จแล้ว</p>
            <div className="flex items-baseline justify-between mt-1 min-w-0">
              <span className="text-4xl font-black text-amber-900 dark:text-amber-250">
                {completedGoals.length}
              </span>
              <span className="text-amber-650 dark:text-amber-450 font-bold text-sm shrink-0">
                โทรฟี่สะสม
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── 4. PRIMARY ACTION BUTTON (CENTERED) ── */}
      {goals.length > 0 && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => setFormOpen(true)}
            className="tactile-button w-full max-w-md bg-[#58cc02] text-white border-2 border-[#2b6c00] py-5 rounded-3xl font-black text-2xl shadow-[0_6px_0_0_#16a34a] flex items-center justify-center gap-4 group cursor-pointer hover:bg-[#58cc02] active:translate-y-[2px] transition-transform select-none"
          >
            <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform stroke-[3px]" />
            เพิ่มเป้าหมายใหม่
          </button>
        </div>
      )}

      {/* ── 5. EMPTY STATE ── */}
      {goals.length === 0 && (
        <div className="p-4">
          <EmptyState
            icon={Target}
            title="ยังไม่มีเป้าหมายการออมเงิน"
            description="ตั้งเป้าหมายการออมเงินเพื่อรับ XP และปลดล็อกด่านความสำเร็จแรกของคุณ เช่น ท่องเที่ยว ซื้ออุปกรณ์ หรือเงินสำรองฉุกเฉิน"
            action={
              <button
                onClick={() => setFormOpen(true)}
                className="font-black text-xs px-5 py-3 rounded-2xl bg-[#58cc02] text-white border-2 border-[#2b6c00] border-b-4 shadow-[0_2px_0_0_#2b6c00] active:translate-y-[2px] active:border-b-2 hover:bg-[#58cc02] flex items-center gap-1.5 transition-all select-none cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3px]" /> สร้างเป้าหมายแรก
              </button>
            }
          />
        </div>
      )}

      {/* ── 6. BEHIND-SCHEDULE ALERTS ── */}
      {activeGoals.length > 0 && <GoalBehindAlert goals={activeGoals} />}

      {/* ── 7. ACTIVE GOALS (QUEST PATH MAP) ── */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3 px-1">
            <span className="text-2xl">🗺️</span>
            ภารกิจที่กำลังดำเนินการ ({activeGoals.length})
          </h2>
          
          <div
            className="p-6 rounded-[32px] bg-slate-50 dark:bg-slate-900/20 border-2 border-dashed border-slate-300 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8"
            style={{
              backgroundImage: 'radial-gradient(#6f7b64 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          >
            {activeGoals.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={handleEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        </div>
      )}

      {/* ── 8. COMPLETED GOALS (ACHIEVEMENTS / TROPHIES ROW) ── */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3 px-1">
            <span className="text-2xl">🏆</span>
            ความสำเร็จสูงสุด (Achievements)
          </h2>
          
          <div className="flex overflow-x-auto gap-8 pb-6 pt-2 px-3 -mx-3 no-scrollbar">
            {completedGoals.map((g) => (
              <div key={g.id} className="flex-shrink-0 w-36 flex flex-col items-center gap-3">
                <div
                  onClick={() => setSelectedCompletedGoal(g)}
                  className="w-32 h-32 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 border-4 border-amber-600 shadow-[0_6px_0_0_#92400e] flex items-center justify-center group cursor-pointer relative hover:scale-105 active:translate-y-[2px] transition-all"
                  title="คลิกเพื่อจัดการภารกิจสำเร็จ"
                >
                  {renderCompletedIcon(g)}
                </div>
                <p className="text-center font-black text-slate-700 dark:text-slate-350 text-sm mt-1 truncate max-w-full px-2" title={g.name}>
                  {g.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 9. SAVINGS TRAVEL LOG (TIMELINE) ── */}
      {goals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3 px-1">
            <span className="text-2xl">⏳</span>
            บันทึกการเดินทาง
          </h2>
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border-2 border-slate-200 dark:border-slate-800 shadow-[0_6px_0_0_#e2e8f0] dark:shadow-none">
            <GoalTimeline goals={goals} />
          </section>
        </div>
      )}

      {/* ── 10. MOTIVATIONAL INSIGHTS CARD ── */}
      {goals.length > 0 && (
        <section className="bg-slate-800 dark:bg-slate-900 rounded-3xl p-6 text-white border-b-8 border-slate-900 shadow-[0_6px_0_0_#0f172a] flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-2xl shrink-0">
            <Sparkles className="w-8 h-8 text-[#87fe45]" />
          </div>
          <div>
            <h4 className="text-lg font-black mb-1">คำแนะนำจากกูรู</h4>
            <p className="text-slate-300 leading-relaxed font-medium text-sm sm:text-base">
              "ออมต่ออีกนิดทุกสัปดาห์ คุณกำลังทำได้ดีมากในภารกิจการออม! หากออมเพิ่มอีกเพียงวันละ ฿50 คุณจะพิชิตเป้าหมายการเงินทั้งหมดได้เร็วกว่ากำหนดถึง 2 เดือน"
            </p>
          </div>
        </section>
      )}

      {/* ── FORM & DIALOGS ── */}
      <GoalForm open={formOpen} onOpenChange={handleFormClose} editingGoal={editingGoal} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบเป้าหมาย"
        description={`ต้องการลบ "${deleteTarget?.name}" ใช่หรือไม่? ข้อมูลการออมทั้งหมดจะหายไป`}
        onConfirm={handleConfirmDelete}
      />

      {/* Dialog for selecting completed goal actions */}
      <Dialog
        open={!!selectedCompletedGoal}
        onOpenChange={(open) => !open && setSelectedCompletedGoal(null)}
      >
        {selectedCompletedGoal && (
          <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 shadow-[0_12px_0_0_rgba(0,0,0,0.1)] rounded-[32px] p-6 overflow-hidden">
            <DialogHeader className="text-center space-y-2">
              <div className="mx-auto inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full border-2 border-amber-300 text-amber-500 mb-1 animate-pulse">
                🏆
              </div>
              <DialogTitle className="text-xl font-black text-slate-850 dark:text-slate-100 leading-tight">
                ภารกิจสำเร็จแล้ว!
              </DialogTitle>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {selectedCompletedGoal.name}
              </p>
            </DialogHeader>

            <div className="py-4 space-y-3.5 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
              <p>
                ยอดออมสำเร็จ: <span className="font-black text-slate-800 dark:text-slate-200">{formatCurrency(selectedCompletedGoal.targetAmount)}</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                สำเร็จเมื่อ: {new Date(selectedCompletedGoal.targetDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {selectedCompletedGoal.description && (
                <p className="bg-slate-50 dark:bg-slate-850 border rounded-xl p-3 text-xs italic">
                  "{selectedCompletedGoal.description}"
                </p>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
              <Button
                variant="outline"
                className="w-full rounded-xl border-2 font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                onClick={() => handleEdit(selectedCompletedGoal)}
              >
                <Edit className="w-4 h-4" /> แก้ไขภารกิจ
              </Button>
              <Button
                variant="destructive"
                className="w-full rounded-xl border-b-4 font-bold flex items-center justify-center gap-1.5 cursor-pointer bg-red-650"
                onClick={() => {
                  setDeleteTarget(selectedCompletedGoal)
                  setSelectedCompletedGoal(null)
                }}
              >
                <Trash2 className="w-4 h-4" /> ลบเป้าหมาย
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
