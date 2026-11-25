'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MoveDetailDialog } from '@/components/workouts/MoveDetail'
import { getMove, type Move } from '@/lib/moves'
import { planFromSession } from '@/lib/workoutPlan'
import { useWorkoutPlanStore } from '@/store/useWorkoutPlanStore'
import type { ExerciseEntry } from '@/types'

/**
 * The Moves a logged Workout Session lists (Move, sets, reps/seconds), each
 * opening its how-to, plus "ทำซ้ำ" to start a Workout Plan like it.
 * Renders nothing for a quick log with no Moves.
 */
export function SessionMoveList({ entry }: { entry: ExerciseEntry }) {
  const router = useRouter()
  const hasActive = useWorkoutPlanStore((s) => s.active !== null)
  const repeatSession = useWorkoutPlanStore((s) => s.repeatSession)
  const [detail, setDetail] = useState<Move | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const moves = entry.moves ?? []
  if (moves.length === 0) return null
  const canRepeat = planFromSession(entry) !== null

  const repeat = () => {
    setConfirmOpen(false)
    if (!repeatSession(entry)) return
    toast.success('เริ่มแผนใหม่จากเซสชันนี้แล้ว')
    router.push('/workouts')
  }

  return (
    <div className="space-y-1.5">
      <ul className="space-y-1" aria-label={`ท่าใน ${entry.name}`}>
        {moves.map((sm, i) => {
          const move = getMove(sm.moveId)
          const unit = move?.countMode === 'seconds' ? 'วินาที' : 'ครั้ง'
          return (
            <li key={`${sm.moveId}-${i}`} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="min-w-0 flex-1 break-words">
                {move ? move.name : <span className="italic text-slate-400">ท่าที่ไม่มีในคลังแล้ว</span>}
              </span>
              <span className="num tabular-nums text-slate-500 dark:text-slate-400">
                {sm.sets} เซ็ต × {sm.count} {unit}
              </span>
              {move && (
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`วิธีทำ ${move.name}`} onClick={() => setDetail(move)}>
                  <Info className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {canRepeat && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => (hasActive ? setConfirmOpen(true) : repeat())}
        >
          <Repeat className="h-3.5 w-3.5" /> ทำซ้ำ
        </Button>
      )}

      <MoveDetailDialog move={detail} onOpenChange={(open) => !open && setDetail(null)} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="แทนที่แผนที่กำลังทำ?"
        description="มีแผนที่กำลังทำอยู่ ถ้าทำซ้ำเซสชันนี้ แผนเดิมและเซ็ตที่ติ๊กไว้จะหายไป"
        confirmLabel="แทนที่"
        onConfirm={repeat}
      />
    </div>
  )
}
