'use client'

import { useMemo, useState, type ElementType } from 'react'
import {
  CheckCircle2,
  Circle,
  Gift,
  Medal,
  Moon,
  PartyPopper,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PressCard } from '@/components/ui/PressCard'
import { cn } from '@/lib/utils'
import { useHealthQuestStore } from '@/store/useHealthQuestStore'
import type { HealthAchievement, HealthExercise, HealthSession } from '@/types/health'

type Mood = NonNullable<HealthSession['mood']>

type Celebration = {
  title: string
  xpEarned: number
  achievements: Array<Pick<HealthAchievement, 'id' | 'title' | 'emoji'>>
}

const moodOptions: Array<{ value: Mood; label: string; icon: ElementType }> = [
  { value: 'great', label: 'รู้สึกดี', icon: Sparkles },
  { value: 'ok', label: 'โอเค', icon: ShieldCheck },
  { value: 'tired', label: 'เหนื่อย', icon: Moon },
]

function isCompleted(session: HealthSession, exerciseId: string) {
  return session.completedExerciseIds.includes(exerciseId)
}

function isSkipped(session: HealthSession, exerciseId: string) {
  return session.skippedExerciseIds.includes(exerciseId)
}

function isReviewed(session: HealthSession, exerciseId: string) {
  return isCompleted(session, exerciseId) || isSkipped(session, exerciseId)
}

function getExerciseStatus(session: HealthSession, exerciseId: string) {
  if (isCompleted(session, exerciseId)) return 'เสร็จแล้ว'
  if (isSkipped(session, exerciseId)) return 'ข้ามแล้ว'
  return 'ยังไม่ทำ'
}

export function HealthSessionPlayer() {
  const activeSession = useHealthQuestStore((state) => state.activeSession)
  const achievements = useHealthQuestStore((state) => state.achievements)
  const completeExercise = useHealthQuestStore((state) => state.completeExercise)
  const skipExercise = useHealthQuestStore((state) => state.skipExercise)
  const finishSession = useHealthQuestStore((state) => state.finishSession)
  const cancelSession = useHealthQuestStore((state) => state.cancelSession)

  const [finishOpen, setFinishOpen] = useState(false)
  const [mood, setMood] = useState<Mood>('ok')
  const [note, setNote] = useState('')
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  const totalCount = activeSession?.exercises.length ?? 0
  const completedCount = activeSession?.completedExerciseIds.length ?? 0
  const skippedCount = activeSession?.skippedExerciseIds.length ?? 0
  const reviewedCount = completedCount + skippedCount
  const progressPercent = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 100

  const currentExercise = useMemo(() => {
    if (!activeSession) return undefined
    return activeSession.exercises.find((exercise) => !isReviewed(activeSession, exercise.id))
  }, [activeSession])

  const allReviewed = Boolean(
    activeSession &&
      (activeSession.exercises.length === 0 ||
        activeSession.exercises.every((exercise) => isReviewed(activeSession, exercise.id)))
  )

  function resetFinishForm() {
    setMood('ok')
    setNote('')
    setFinishOpen(false)
  }

  function handleCancelSession() {
    cancelSession()
    resetFinishForm()
    setCelebration(null)
  }

  function handleComplete(exerciseId: string) {
    completeExercise(exerciseId)
  }

  function handleSkip(exerciseId: string) {
    skipExercise(exerciseId)
  }

  function handleFinishSession() {
    if (!activeSession) return

    const previousUnlockedIds = new Set(
      achievements.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id)
    )

    finishSession({ mood, note })

    const nextState = useHealthQuestStore.getState()
    const latestSession = nextState.sessions[0]
    const newlyUnlocked = nextState.achievements
      .filter((achievement) => achievement.unlocked && !previousUnlockedIds.has(achievement.id))
      .map((achievement) => ({
        id: achievement.id,
        title: achievement.title,
        emoji: achievement.emoji,
      }))

    setCelebration({
      title: latestSession?.title ?? activeSession.title,
      xpEarned: latestSession?.xpEarned ?? 0,
      achievements: newlyUnlocked,
    })
    resetFinishForm()
  }

  if (!activeSession) {
    return (
      <PressCard
        shadow="0 6px 0 0 #cbd5e1"
        shadowHover="0 3px 0 0 #cbd5e1"
        className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        {celebration ? (
          <div className="rounded-3xl border-[3px] border-emerald-300 bg-emerald-50 p-5 text-center dark:border-emerald-800 dark:bg-emerald-500/10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border-2 border-emerald-300 bg-white text-emerald-600 shadow-[0_4px_0_0_#86efac] dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300">
              <PartyPopper className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">
              สำเร็จ! ได้รับ +{celebration.xpEarned} XP
            </h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
              {celebration.title} เสร็จแล้ว เก่งมาก เริ่มสั้น ๆ ก็สำคัญ
            </p>
            {celebration.achievements.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {celebration.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="rounded-2xl border-2 border-amber-300 bg-white p-3 text-left dark:border-amber-700 dark:bg-slate-900"
                  >
                    <p className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                      <span className="text-xl">{achievement.emoji}</span>
                      {achievement.title}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase text-amber-600 dark:text-amber-300">
                      badge ใหม่
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
            <Circle className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">
              ยังไม่มีภารกิจที่กำลังทำ
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
              เลือก Quick Start หรือ Daily Quest ได้เลย วันนี้ขยับนิดเดียวก็พอ
            </p>
          </div>
        )}
      </PressCard>
    )
  }

  return (
    <PressCard
      shadow="0 6px 0 0 #cbd5e1"
      shadowHover="0 3px 0 0 #cbd5e1"
      className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="space-y-5">
        <SessionHeader
          session={activeSession}
          completedCount={completedCount}
          skippedCount={skippedCount}
          totalCount={totalCount}
          progressPercent={progressPercent}
          onCancel={handleCancelSession}
        />

        <CurrentFocusCard
          exercise={currentExercise}
          allReviewed={allReviewed}
          hasExercises={totalCount > 0}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />

        <div className="grid gap-3">
          {activeSession.exercises.length > 0 ? (
            activeSession.exercises.map((exercise, index) => (
              <ExerciseChecklistCard
                key={exercise.id}
                session={activeSession}
                exercise={exercise}
                index={index}
                onComplete={handleComplete}
                onSkip={handleSkip}
              />
            ))
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 p-5 text-center dark:border-slate-700">
              <Gift className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
              <h4 className="mt-3 font-black text-slate-900 dark:text-white">session นี้ยังไม่มีท่า</h4>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                ไม่มีอะไรต้องทำเพิ่ม สามารถจบภารกิจเพื่อบันทึกได้เลย
              </p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border-2 border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          {allReviewed ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-black text-slate-900 dark:text-white">พร้อมจบภารกิจแล้ว</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  เลือกความรู้สึกหลังทำ แล้วรับ XP สุขภาพ
                </p>
              </div>
              <Button
                onClick={() => setFinishOpen(true)}
                className="h-12 rounded-2xl bg-[#58cc02] px-5 font-black text-white shadow-[0_4px_0_0_#2b6c00] hover:bg-[#46a302] active:translate-y-1"
              >
                <Trophy className="h-4 w-4" />
                จบภารกิจ
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <Medal className="mt-0.5 h-5 w-5 text-[#58cc02]" />
              <div>
                <h4 className="font-black text-slate-900 dark:text-white">ทำทีละท่าก็พอ</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  เมื่อทุกท่าถูกทำหรือข้ามแล้ว ปุ่มจบภารกิจจะแสดงตรงนี้
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="rounded-3xl border-[3px] border-emerald-300 bg-white p-5 dark:border-emerald-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
              จบภารกิจ
            </DialogTitle>
            <DialogDescription>
              บันทึกความรู้สึกสั้น ๆ แล้วรับ XP สุขภาพ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {moodOptions.map((option) => {
                const Icon = option.icon
                const selected = mood === option.value

                return (
                  <Button
                    key={option.value}
                    variant={selected ? 'default' : 'outline'}
                    onClick={() => setMood(option.value)}
                    className={cn(
                      'h-11 rounded-2xl border-2 font-black',
                      selected && 'border-[#2b6c00] bg-[#58cc02] text-white hover:bg-[#46a302]'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </Button>
                )
              })}
            </div>

            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="note สั้น ๆ เช่น วันนี้ทำเท่าที่ไหว"
              className="h-11 rounded-2xl border-2 bg-white font-medium dark:bg-slate-900"
            />
          </div>

          <DialogFooter className="gap-2 rounded-b-3xl">
            <Button
              variant="outline"
              onClick={() => setFinishOpen(false)}
              className="rounded-2xl border-2 font-black"
            >
              ไว้ก่อน
            </Button>
            <Button
              onClick={handleFinishSession}
              className="rounded-2xl bg-[#58cc02] font-black text-white shadow-[0_3px_0_0_#2b6c00] hover:bg-[#46a302] active:translate-y-1"
            >
              รับ XP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PressCard>
  )
}

function SessionHeader({
  session,
  completedCount,
  skippedCount,
  totalCount,
  progressPercent,
  onCancel,
}: {
  session: HealthSession
  completedCount: number
  skippedCount: number
  totalCount: number
  progressPercent: number
  onCancel: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge className="bg-[#58cc02]/15 text-[#2b6c00] dark:text-emerald-200">
            กำลังทำอยู่
          </Badge>
          <h3 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            {session.title}
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            เสร็จแล้ว {completedCount}/{totalCount} ท่า
            {skippedCount > 0 && ` - ข้ามแล้ว ${skippedCount}`}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="h-10 justify-start rounded-2xl px-3 font-black text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <X className="h-4 w-4" />
          ยกเลิก
        </Button>
      </div>

      <div className="space-y-2">
        <div className="h-5 overflow-hidden rounded-full border-2 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-[#58cc02] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs font-black text-slate-400 dark:text-slate-500">
          ตรวจครบ {totalCount > 0 ? completedCount + skippedCount : 0}/{totalCount} ท่า
        </p>
      </div>
    </div>
  )
}

function CurrentFocusCard({
  exercise,
  allReviewed,
  hasExercises,
  onComplete,
  onSkip,
}: {
  exercise?: HealthExercise
  allReviewed: boolean
  hasExercises: boolean
  onComplete: (exerciseId: string) => void
  onSkip: (exerciseId: string) => void
}) {
  if (!exercise) {
    return (
      <div className="rounded-3xl border-[3px] border-emerald-300 bg-emerald-50 p-5 text-center dark:border-emerald-800 dark:bg-emerald-500/10">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#58cc02]" />
        <h4 className="mt-3 text-xl font-black text-slate-900 dark:text-white">
          {allReviewed ? 'ทุกท่าถูกดูแลแล้ว' : 'พร้อมเริ่มเมื่อคุณพร้อม'}
        </h4>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {hasExercises ? 'พักหายใจสั้น ๆ แล้วจบภารกิจได้เลย' : 'session นี้ไม่มีท่าให้ทำเพิ่ม'}
        </p>
      </div>
    )
  }

  return (
    <PressCard
      shadow="0 7px 0 0 #2b6c00"
      shadowHover="0 4px 0 0 #2b6c00"
      className="rounded-3xl border-[3px] border-[#2b6c00] bg-[#58cc02] p-5 text-white"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border-2 border-white/40 bg-white/20 text-4xl">
          {exercise.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wider text-white/75">ท่าถัดไป</p>
          <h4 className="mt-1 text-2xl font-black">{exercise.name}</h4>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/90">{exercise.instruction}</p>
          <p className="mt-2 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-black">
            {exercise.targetText}
          </p>
          <p className="mt-3 text-sm font-black text-white/90">
            ทำเท่าที่ไหว พักได้เมื่อจำเป็น
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Button
          onClick={() => onComplete(exercise.id)}
          className="h-12 rounded-2xl border-2 border-[#2b6c00] bg-white font-black text-[#2b6c00] shadow-[0_4px_0_0_#2b6c00] hover:bg-emerald-50 active:translate-y-1"
        >
          <CheckCircle2 className="h-5 w-5" />
          เสร็จแล้ว
        </Button>
        <Button
          variant="outline"
          onClick={() => onSkip(exercise.id)}
          className="h-12 rounded-2xl border-2 border-white/50 bg-white/10 font-black text-white hover:bg-white/20"
        >
          <SkipForward className="h-4 w-4" />
          ข้าม
        </Button>
      </div>
    </PressCard>
  )
}

function ExerciseChecklistCard({
  session,
  exercise,
  index,
  onComplete,
  onSkip,
}: {
  session: HealthSession
  exercise: HealthExercise
  index: number
  onComplete: (exerciseId: string) => void
  onSkip: (exerciseId: string) => void
}) {
  const completed = isCompleted(session, exercise.id)
  const skipped = isSkipped(session, exercise.id)
  const status = getExerciseStatus(session, exercise.id)

  return (
    <PressCard
      shadow={completed ? '0 5px 0 0 #86efac' : skipped ? '0 5px 0 0 #fcd34d' : '0 5px 0 0 #cbd5e1'}
      shadowHover={completed ? '0 3px 0 0 #86efac' : skipped ? '0 3px 0 0 #fcd34d' : '0 3px 0 0 #cbd5e1'}
      className={cn(
        'rounded-3xl border-[3px] p-4',
        completed
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-500/10'
          : skipped
            ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-500/10'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/30'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-xl dark:border-slate-700 dark:bg-slate-900">
          {exercise.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-400">#{index + 1}</span>
            <h4 className="font-black text-slate-900 dark:text-white">{exercise.name}</h4>
            <Badge
              className={cn(
                completed && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
                skipped && 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
                !completed && !skipped && 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {completed && <CheckCircle2 className="h-3 w-3" />}
              {status}
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {exercise.instruction}
          </p>
          <p className="mt-1 text-xs font-black text-slate-400 dark:text-slate-500">
            {exercise.targetText}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant={completed ? 'default' : 'outline'}
          onClick={() => onComplete(exercise.id)}
          className={cn(
            'h-10 rounded-2xl border-2 font-black',
            completed && 'border-[#2b6c00] bg-[#58cc02] text-white hover:bg-[#46a302]'
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          เสร็จแล้ว
        </Button>
        <Button
          variant={skipped ? 'secondary' : 'outline'}
          onClick={() => onSkip(exercise.id)}
          className={cn(
            'h-10 rounded-2xl border-2 font-black',
            skipped && 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
          )}
        >
          <SkipForward className="h-4 w-4" />
          ข้าม
        </Button>
      </div>
    </PressCard>
  )
}
