'use client'

import { ArrowDown, ArrowUp, ClipboardList, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EXERCISES } from '@/lib/fitness'
import { getMove } from '@/lib/moves'
import { DEFAULT_PLAN_ACTIVITY, planMinutes } from '@/lib/workoutPlan'
import { useWorkoutPlanStore } from '@/store/useWorkoutPlanStore'
import type { PlanMove, WorkoutPlan } from '@/types'

const selectClass = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-slate-900'

function clampInt(value: string, min: number, max: number): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/** Edits the draft Workout Plan: change sets, reps/seconds and rest, remove or reorder Moves, then start. */
export function PlanEditor({ hasActive }: { hasActive: boolean }) {
  const draft = useWorkoutPlanStore((s) => s.draft)
  const setDraft = useWorkoutPlanStore((s) => s.setDraft)
  const startPlan = useWorkoutPlanStore((s) => s.startPlan)

  if (!draft || draft.moves.length === 0) {
    return (
      <section className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <ClipboardList className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
        <p>สร้างแผนออกกำลังกายเอง: กด &quot;เพิ่มในแผน&quot; ที่ท่าในคลังด้านล่าง แล้วปรับเซ็ตและครั้งได้ที่นี่</p>
      </section>
    )
  }

  const update = (next: Partial<WorkoutPlan>) => setDraft({ ...draft, ...next })
  const updateMove = (i: number, patch: Partial<PlanMove>) =>
    update({ moves: draft.moves.map((m, j) => (j === i ? { ...m, ...patch } : m)) })
  const swap = (i: number, j: number) => {
    if (j < 0 || j >= draft.moves.length) return
    const moves = [...draft.moves]
    ;[moves[i], moves[j]] = [moves[j], moves[i]]
    update({ moves })
  }

  const minutes = planMinutes(draft)

  return (
    <section className="space-y-3 rounded-2xl border-2 border-emerald-200 bg-white p-4 dark:border-emerald-500/30 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-slate-800 dark:text-slate-100">แผนของฉัน</h3>
        <p className="num text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">ประมาณ {minutes} นาที</p>
      </div>

      <div>
        <label htmlFor="plan-activity" className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
          บันทึกเป็นประเภท (ใช้คำนวณแคลอรี่)
        </label>
        <select
          id="plan-activity"
          value={draft.activity || DEFAULT_PLAN_ACTIVITY}
          onChange={(e) => update({ activity: e.target.value })}
          className={selectClass}
        >
          {EXERCISES.filter((x) => x.value !== 'other').map((x) => (
            <option key={x.value} value={x.value}>{x.label}</option>
          ))}
        </select>
      </div>

      <ol className="space-y-2">
        {draft.moves.map((pm, i) => {
          const move = getMove(pm.moveId)
          const unit = move?.countMode === 'seconds' ? 'วินาที/เซ็ต' : 'ครั้ง/เซ็ต'
          return (
            <li key={`${pm.moveId}-${i}`} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate font-bold text-slate-800 dark:text-slate-100">
                  {i + 1}. {move?.name ?? pm.moveId}
                </p>
                <div className="flex flex-shrink-0 items-center">
                  <Button variant="ghost" size="icon" aria-label={`เลื่อน ${move?.name} ขึ้น`} disabled={i === 0} onClick={() => swap(i, i - 1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`เลื่อน ${move?.name} ลง`} disabled={i === draft.moves.length - 1} onClick={() => swap(i, i + 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`ลบ ${move?.name}`}
                    onClick={() => update({ moves: draft.moves.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  เซ็ต
                  <Input type="number" inputMode="numeric" min="1" max="10" value={pm.sets}
                    onChange={(e) => updateMove(i, { sets: clampInt(e.target.value, 1, 10) })} />
                </label>
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  {unit}
                  <Input type="number" inputMode="numeric" min="1" max="600" value={pm.count}
                    onChange={(e) => updateMove(i, { count: clampInt(e.target.value, 1, 600) })} />
                </label>
                <label className="text-xs text-slate-500 dark:text-slate-400">
                  พัก (วินาที)
                  <Input type="number" inputMode="numeric" min="0" max="600" value={pm.restSeconds}
                    onChange={(e) => updateMove(i, { restSeconds: clampInt(e.target.value, 0, 600) })} />
                </label>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {hasActive && <p className="mr-auto text-xs text-amber-700 dark:text-amber-400">จบหรือยกเลิกแผนที่กำลังทำก่อน จึงเริ่มแผนใหม่ได้</p>}
        <Button variant="outline" onClick={() => setDraft(null)}>ล้างแผน</Button>
        <Button className="gap-1.5" disabled={hasActive} onClick={() => startPlan(draft)}>
          <Play className="h-4 w-4" /> เริ่ม
        </Button>
      </div>
    </section>
  )
}
