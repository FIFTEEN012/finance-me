'use client'

import { useState } from 'react'
import { Check, Flag, Info, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MoveDetailDialog } from '@/components/workouts/MoveDetail'
import { FALLBACK_WEIGHT_KG, estimateBurn, exerciseLabel } from '@/lib/fitness'
import { getMove, type Move } from '@/lib/moves'
import { planMinutes } from '@/lib/workoutPlan'
import { todayKey } from '@/lib/recurring'
import { cn } from '@/lib/utils'
import { useNutritionStore } from '@/store/useNutritionStore'
import { sessionMoves, useWorkoutPlanStore, type ActivePlan } from '@/store/useWorkoutPlanStore'

function FinishDialog({ active, open, onOpenChange }: { active: ActivePlan; open: boolean; onOpenChange: (o: boolean) => void }) {
  const finishPlan = useWorkoutPlanStore((s) => s.finishPlan)
  const weight = useNutritionStore((s) => s.profile?.weightKg) ?? FALLBACK_WEIGHT_KG
  const [minutes, setMinutes] = useState(() => String(Math.max(1, planMinutes(active.plan))))
  const mins = Number(minutes)
  const invalid = minutes === '' || !Number.isInteger(mins) || mins <= 0 || mins > 600
  const kcal = invalid ? 0 : estimateBurn(active.plan.activity, mins, weight)
  const done = sessionMoves(active)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle>จบแผนและบันทึก</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (invalid) return
            finishPlan({ date: todayKey(), minutes: mins, kcal })
            toast.success(`บันทึก${exerciseLabel(active.plan.activity)} ${mins} นาทีแล้ว`)
            onOpenChange(false)
          }}
        >
          <div>
            <Label htmlFor="finish-minutes" className="mb-1.5 block text-sm">เวลา (นาที) ตามแผน แก้ได้</Label>
            <Input id="finish-minutes" type="number" inputMode="numeric" min="1" step="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            {invalid && minutes !== '' && <p className="mt-1 text-xs text-red-500">ใส่ 1 – 600 นาที</p>}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {exerciseLabel(active.plan.activity)} ≈ <span className="num font-bold tabular-nums">{kcal}</span> kcal ·
            ทำแล้ว {done.length} จาก {active.plan.moves.length} ท่า
          </p>
          {done.length === 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-400">ยังไม่ได้ติ๊กเซ็ตไหนเลย จะบันทึกเฉพาะเวลาโดยไม่มีรายการท่า</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>กลับไปทำต่อ</Button>
            <Button type="submit" disabled={invalid}>บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** The in-progress Workout Plan as a checklist: tick each set, open a Move's how-to, finish or cancel. */
export function ActivePlanChecklist({ active }: { active: ActivePlan }) {
  const toggleSet = useWorkoutPlanStore((s) => s.toggleSet)
  const cancelPlan = useWorkoutPlanStore((s) => s.cancelPlan)
  const [detail, setDetail] = useState<Move | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const total = active.done.reduce((n, sets) => n + sets.length, 0)
  const ticked = active.done.reduce((n, sets) => n + sets.filter(Boolean).length, 0)

  return (
    <section className="space-y-3 rounded-2xl border-2 border-violet-200 bg-white p-4 dark:border-violet-500/30 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-slate-800 dark:text-slate-100">กำลังออกกำลังกาย</h3>
        <p className="num text-sm font-bold tabular-nums text-violet-700 dark:text-violet-400">
          {ticked}/{total} เซ็ต
        </p>
      </div>

      <ol className="space-y-2">
        {active.plan.moves.map((pm, i) => {
          const move = getMove(pm.moveId)
          const unit = move?.countMode === 'seconds' ? 'วินาที' : 'ครั้ง'
          return (
            <li key={`${pm.moveId}-${i}`} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800 dark:text-slate-100">{move?.name ?? pm.moveId}</p>
                  <p className="num text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {pm.sets} เซ็ต × {pm.count} {unit} · พัก {pm.restSeconds} วินาที
                  </p>
                </div>
                {move && (
                  <Button variant="ghost" size="icon" aria-label={`วิธีทำ ${move.name}`} onClick={() => setDetail(move)}>
                    <Info className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(active.done[i] ?? []).map((d, j) => (
                  <button
                    key={j}
                    type="button"
                    role="checkbox"
                    aria-checked={d}
                    aria-label={`${move?.name ?? pm.moveId} เซ็ต ${j + 1}`}
                    onClick={() => toggleSet(i, j)}
                    className={cn(
                      'flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border-2 px-3 text-sm font-bold transition-colors',
                      d
                        ? 'border-violet-500 bg-violet-500 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                    )}
                  >
                    {d && <Check className="h-4 w-4" aria-hidden />}
                    {j + 1}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" className="gap-1.5" onClick={() => setCancelOpen(true)}>
          <X className="h-4 w-4" /> ยกเลิก
        </Button>
        <Button className="gap-1.5" onClick={() => setFinishOpen(true)}>
          <Flag className="h-4 w-4" /> จบ
        </Button>
      </div>

      {finishOpen && <FinishDialog active={active} open={finishOpen} onOpenChange={setFinishOpen} />}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="ยกเลิกแผนนี้?"
        description="แผนที่กำลังทำจะถูกทิ้งและไม่บันทึกการออกกำลังกาย"
        confirmLabel="ทิ้งแผน"
        onConfirm={() => {
          cancelPlan()
          setCancelOpen(false)
        }}
      />
      <MoveDetailDialog move={detail} onOpenChange={(open) => !open && setDetail(null)} />
    </section>
  )
}
