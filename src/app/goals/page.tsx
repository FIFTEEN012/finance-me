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
import { formatCurrency, cn } from '@/lib/utils'
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
  const remainingTotal = Math.max(totalTarget - totalSaved, 0)

  // Overall savings progress calculation
  const overallProgress = totalTarget > 0 ? Math.min(Math.round((totalSaved / totalTarget) * 100), 100) : 0

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

  // Calculate motivation message based on overall progress
  let motivationMessage = 'เริ่มต้นดีมีชัยไปกว่าครึ่ง ตั้งเป้าหมายออมเงินแล้วลุยกันเลย! 💰'
  if (totalTarget > 0) {
    if (overallProgress >= 100) {
      motivationMessage = 'สุดยอดมาก! คุณได้พิชิตเป้าหมายการออมเงินครบถ้วนทุกด่านแล้ว 🎉🏆'
    } else if (overallProgress >= 80) {
      motivationMessage = 'ใกล้ถึงเส้นชัยแล้ว! อีกเพียงนิดเดียวจะสำเร็จภารกิจการออมน้ำใจครั้งนี้แล้วนะ 🔥'
    } else if (overallProgress >= 50) {
      motivationMessage = 'เดินทางมาเกินครึ่งทางแล้ว! ยอดเยี่ยมมาก ออมเงินต่ออีกนิดในทุกสัปดาห์นะ ⭐'
    } else if (overallProgress > 0) {
      motivationMessage = `เดินทางมาแล้ว ${overallProgress}% ของเส้นทางการออมทั้งหมด สะสมวินัยต่อไปเพื่อปลดล็อกขั้นถัดไป 🎯`
    }
  }

  return (
    <div className="space-y-6 pb-28 text-slate-800 dark:text-slate-100">

      {/* ── 1. HERO GOAL QUEST CARD ── */}
      <PressCard
        shadow="0 6px 0 0 #2b6c00"
        shadowHover="0 3px 0 0 #2b6c00"
        className="relative overflow-hidden border-2 border-[#2b6c00] bg-gradient-to-r from-[#58cc02] to-[#2b6c00] p-6 sm:p-8 text-white rounded-[32px]"
      >
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-black">เส้นทางพิชิตเป้าหมายการออม</h2>
            <p className="text-xs sm:text-sm font-bold text-green-50 opacity-95">
              ออมทีละนิด ปลดล็อกความสำเร็จทีละด่าน พร้อมสะสมเกียรติยศการเงิน
            </p>
            <button
              onClick={() => setFormOpen(true)}
              className="font-black text-sm px-6 py-3 rounded-2xl bg-white text-[#2b6c00] border-2 border-[#2b6c00] border-b-4 shadow-[0_3px_0_0_#2b6c00] transform transition-all active:translate-y-[2px] active:border-b-2 hover:bg-slate-50 flex items-center justify-center gap-2 mx-auto md:mx-0"
            >
              <Plus className="w-4 h-4 stroke-[3px]" /> เริ่มสร้างด่านเป้าหมาย
            </button>
          </div>
          <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-white/30 text-6xl shrink-0 animate-bounce">
            🏆
          </div>
        </div>
      </PressCard>

      {/* ── 2. OVERALL PROGRESS TRACKER ── */}
      {goals.length > 0 && (
        <PressCard
          shadow="0 5px 0 0 #e5e5e5"
          shadowHover="0 3px 0 0 #e5e5e5"
          className="border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-3xl space-y-3"
        >
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              ⚡ พลังงานการออมรวม
            </h3>
            <span className="text-xl font-black text-[#2b6c00] dark:text-[#58cc02]">{overallProgress}%</span>
          </div>
          <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-full border-2 border-slate-200 dark:border-slate-700 overflow-hidden p-1.5">
            <div
              className="h-full bg-gradient-to-r from-[#58cc02] to-[#2b6c00] rounded-full relative transition-all duration-1000"
              style={{ width: `${overallProgress}%` }}
            >
              <div className="absolute top-0 right-0 h-full w-4 bg-white/30 rounded-full"></div>
            </div>
          </div>
          <p className="text-center font-bold text-slate-500 dark:text-slate-400 text-xs sm:text-sm uppercase tracking-wide px-2 mt-1 leading-relaxed">
            {motivationMessage}
          </p>
        </PressCard>
      )}

      {/* ── 3. SUMMARY STAT CARDS ── */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Targets Card */}
          <div className="bg-violet-50 dark:bg-violet-950/20 rounded-3xl p-5 border-2 border-violet-250 dark:border-violet-900 shadow-[0_5px_0_0_#4c1d95] flex flex-col justify-between gap-3 h-28">
            <p className="text-violet-700 dark:text-violet-300 font-black text-[10px] uppercase tracking-wider">เป้าหมายทั้งหมด</p>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-violet-900 dark:text-violet-200 num truncate">
                {formatCurrency(totalTarget)}
              </span>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 shrink-0">
                {goals.length} ด่าน
              </span>
            </div>
          </div>

          {/* Total Saved Card */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl p-5 border-2 border-emerald-250 dark:border-emerald-900 shadow-[0_5px_0_0_#065f46] flex flex-col justify-between gap-3 h-28">
            <p className="text-emerald-700 dark:text-emerald-300 font-black text-[10px] uppercase tracking-wider">ออมสะสมแล้ว</p>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200 num truncate">
                {formatCurrency(totalSaved)}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                เหลืออีก {formatCurrency(remainingTotal)}
              </span>
            </div>
          </div>

          {/* Completed Goals Count Card */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-3xl p-5 border-2 border-amber-250 dark:border-amber-900 shadow-[0_5px_0_0_#b45309] flex flex-col justify-between gap-3 h-28">
            <p className="text-amber-700 dark:text-amber-300 font-black text-[10px] uppercase tracking-wider">สำเร็จแล้ว</p>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-900 dark:text-amber-200 num">
                {completedGoals.length}
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                จากทั้งหมด {goals.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. PRIMARY ACTION BUTTON (CENTERED) ── */}
      {goals.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => setFormOpen(true)}
            className="w-full max-w-md bg-[#58cc02] text-white border-2 border-[#2b6c00] py-4 rounded-3xl font-black text-xl shadow-[0_5px_0_0_#2b6c00] active:translate-y-[2px] active:border-b-2 hover:bg-[#58cc02] flex items-center justify-center gap-2 select-none"
          >
            <Plus className="w-5 h-5 stroke-[3px]" /> เพิ่มเป้าหมายออมเงิน
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
                className="font-black text-xs px-5 py-3 rounded-2xl bg-[#58cc02] text-white border-2 border-[#2b6c00] border-b-4 shadow-[0_2px_0_0_#2b6c00] active:translate-y-[2px] active:border-b-2 hover:bg-[#58cc02] flex items-center gap-1.5 transition-all select-none"
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
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Target className="w-4 h-4 text-[#2b6c00] dark:text-[#58cc02]" />
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              ภารกิจที่กำลังดำเนินการ ({activeGoals.length})
            </h3>
          </div>
          
          <div className="quest-line p-4.5 rounded-[32px] bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-250 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={handleEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        </div>
      )}

      {/* ── 8. COMPLETED GOALS (ACHIEVEMENTS ROW) ── */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              ถ้วยรางวัลความสำเร็จที่ปลดล็อกแล้ว ({completedGoals.length})
            </h3>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-4 px-1 -mx-1 no-scrollbar">
            {completedGoals.map((g) => (
              <div key={g.id} className="flex-shrink-0 w-80">
                <GoalCard goal={g} onEdit={handleEdit} onDelete={setDeleteTarget} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 9. SAVINGS TRAVEL LOG (TIMELINE) ── */}
      {goals.length > 0 && (
        <div className="space-y-3">
          <div className="px-1">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              บันทึกการเดินทางการออม
            </h3>
          </div>
          <PressCard
            shadow="0 6px 0 0 #e5e5e5"
            shadowHover="0 3px 0 0 #e5e5e5"
            className="border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 p-0 overflow-hidden"
          >
            <GoalTimeline goals={goals} />
          </PressCard>
        </div>
      )}

      {/* ── MOBILE FLOATING ACTION BUTTON ── */}
      {goals.length > 0 && (
        <button
          onClick={() => setFormOpen(true)}
          aria-label="เพิ่มเป้าหมาย"
          className={cn(
            'lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-[#58cc02] text-white rounded-2xl shadow-[0_5px_0_0_#2b6c00] border-2 border-[#2b6c00]',
            'flex items-center justify-center active:translate-y-[3px] active:shadow-[0_2px_0_0_#2b6c00] transition-all z-40 select-none'
          )}
        >
          <Plus className="w-7 h-7 stroke-[3px]" />
        </button>
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
    </div>
  )
}
