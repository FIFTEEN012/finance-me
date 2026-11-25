'use client'

import { useMemo, useState } from 'react'
import { Dumbbell, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PressCard } from '@/components/ui/PressCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { MoveBadges } from '@/components/workouts/MoveBadges'
import { MedicalNotice, MoveDetailDialog } from '@/components/workouts/MoveDetail'
import { PlanEditor } from '@/components/workouts/PlanEditor'
import { ActivePlanChecklist } from '@/components/workouts/ActivePlanChecklist'
import { DEFAULT_PLAN_ACTIVITY, planMoveFor } from '@/lib/workoutPlan'
import { useWorkoutPlanStore } from '@/store/useWorkoutPlanStore'
import {
  EQUIPMENT,
  MOVE_GROUPS,
  MOVE_LEVELS,
  filterMoves,
  formatRecommendation,
  type Equipment,
  type Move,
  type MoveGroup,
  type MoveLevel,
} from '@/lib/moves'
import { cn } from '@/lib/utils'

function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T | null) => void
}) {
  const all = [{ value: null, label: 'ทั้งหมด' }, ...options]
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
      {all.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value ?? 'all'}
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

export default function WorkoutsPage() {
  const [group, setGroup] = useState<MoveGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [level, setLevel] = useState<MoveLevel | null>(null)
  const [selected, setSelected] = useState<Move | null>(null)

  const moves = useMemo(
    () => filterMoves({ group: group ?? undefined, equipment: equipment ?? undefined, level: level ?? undefined }),
    [group, equipment, level],
  )
  const filtered = group !== null || equipment !== null || level !== null

  const active = useWorkoutPlanStore((s) => s.active)
  const draft = useWorkoutPlanStore((s) => s.draft)
  const setDraft = useWorkoutPlanStore((s) => s.setDraft)
  const addToPlan = (m: Move) => {
    const plan = draft ?? { activity: DEFAULT_PLAN_ACTIVITY, moves: [] }
    setDraft({ ...plan, moves: [...plan.moves, planMoveFor(m)] })
    toast.success(`เพิ่ม ${m.name} ในแผนแล้ว`)
  }

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">ท่าออกกำลังกาย</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          คลังท่าที่ใช้น้ำหนักตัวและดัมเบล พร้อมวิธีทำที่ถูกต้องและค่าแนะนำ แตะท่าเพื่อดูรายละเอียด
        </p>
      </div>

      <MedicalNotice />

      {active && <ActivePlanChecklist active={active} />}
      <PlanEditor hasActive={active !== null} />

      <section className="space-y-2">
        <FilterChips label="กลุ่ม" options={MOVE_GROUPS} value={group} onChange={setGroup} />
        <FilterChips label="อุปกรณ์" options={EQUIPMENT} value={equipment} onChange={setEquipment} />
        <FilterChips label="ระดับ" options={MOVE_LEVELS} value={level} onChange={setLevel} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">
            พบ <span className="num tabular-nums">{moves.length.toLocaleString('th-TH')}</span> ท่า
          </h3>
          {filtered && (
            <button
              type="button"
              className="text-xs text-emerald-700 underline dark:text-emerald-400"
              onClick={() => {
                setGroup(null)
                setEquipment(null)
                setLevel(null)
              }}
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {moves.length === 0 ? (
          <EmptyState icon={Dumbbell} title="ไม่พบท่าที่ตรงกับตัวกรอง" description="ลองเปลี่ยนกลุ่ม อุปกรณ์ หรือระดับ" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moves.map((m) => (
              <PressCard
                key={m.id}
                shadow="0 4px 0 0 #e5e5e5"
                shadowHover="0 2px 0 0 #e5e5e5"
                className="rounded-2xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className="w-full space-y-2 rounded-2xl p-4 text-left focus-visible:outline-2 focus-visible:outline-emerald-500"
                >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{m.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{m.nameEn}</p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />
                </div>
                <MoveBadges move={m} />
                <p className="num text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatRecommendation(m)}
                </p>
                </button>
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => addToPlan(m)}
                    aria-label={`เพิ่ม ${m.name} ในแผน`}
                    className="inline-flex items-center gap-1 rounded-full border-2 border-emerald-500 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden /> เพิ่มในแผน
                  </button>
                </div>
              </PressCard>
            ))}
          </div>
        )}
      </section>

      <MoveDetailDialog move={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
