'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MOVE_LEVELS, TRAINING_FOCUSES, type MoveLevel, type TrainingFocus } from '@/lib/moves'
import { PLAN_GOALS, PLAN_LENGTHS, buildWorkoutPlan, profileGoal, type PlanGoal } from '@/lib/workoutBuilder'
import { useNutritionStore } from '@/store/useNutritionStore'
import { useWorkoutPlanStore } from '@/store/useWorkoutPlanStore'
import { cn } from '@/lib/utils'

function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-full text-xs font-bold text-slate-500 sm:w-auto dark:text-slate-400">{label}</span>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors',
              active
                ? 'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-500 dark:bg-emerald-600'
                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500/50',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const LENGTH_OPTIONS = PLAN_LENGTHS.map((n) => ({ value: n as number, label: `${n} นาที` }))

/** Builds a Workout Plan from the user's choices and opens it in the plan editor. */
export function WorkoutBuilder() {
  const profile = useNutritionStore((s) => s.profile)
  const draft = useWorkoutPlanStore((s) => s.draft)
  const setDraft = useWorkoutPlanStore((s) => s.setDraft)

  const [pickedGoal, setGoal] = useState<PlanGoal | null>(null)
  const [focus, setFocus] = useState<TrainingFocus>('full')
  const [minutes, setMinutes] = useState<number>(30)
  const [level, setLevel] = useState<MoveLevel>('beginner')
  const goal = pickedGoal ?? profileGoal(profile)

  const build = () => {
    if (!goal) return
    const replacing = draft !== null && draft.moves.length > 0
    setDraft(buildWorkoutPlan({ goal, focus, minutes, level }))
    toast.success(replacing ? 'จัดชุดใหม่แทนแผนเดิมแล้ว แก้ต่อได้ก่อนเริ่ม' : 'จัดชุดแล้ว แก้ต่อได้ก่อนเริ่ม')
  }

  return (
    <section
      aria-labelledby="workout-builder-title"
      className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div>
        <h3 id="workout-builder-title" className="font-black text-slate-800 dark:text-slate-100">
          จัดชุดให้
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          วอร์มอัพ → 4–6 ท่า → คูลดาวน์ ตามเป้าหมายและเวลาที่มี
          {!profile && ' (ยังไม่มีโปรไฟล์สุขภาพ เลือกเป้าหมายเองได้เลย)'}
        </p>
      </div>
      <Choice label="เป้าหมาย" options={PLAN_GOALS} value={goal} onChange={setGoal} />
      <Choice label="ส่วนที่ฝึก" options={TRAINING_FOCUSES} value={focus} onChange={setFocus} />
      <Choice label="เวลาที่มี" options={LENGTH_OPTIONS} value={minutes} onChange={setMinutes} />
      <Choice label="ระดับ" options={MOVE_LEVELS} value={level} onChange={setLevel} />
      <Button className="gap-1.5" disabled={!goal} onClick={build}>
        <Sparkles className="h-4 w-4" aria-hidden /> จัดชุด
      </Button>
    </section>
  )
}
