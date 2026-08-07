'use client'

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ElementType,
  type ReactNode,
  type SetStateAction,
} from 'react'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Circle,
  Dumbbell,
  Edit3,
  Flame,
  HeartPulse,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RunningQuestSection } from '@/components/health/RunningQuestSection'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PressCard } from '@/components/ui/PressCard'
import {
  HEALTH_BODY_PART_LABELS,
  HEALTH_EQUIPMENT_LABELS,
  HEALTH_EXERCISE_CATALOG,
  HEALTH_TARGET_LABELS,
} from '@/lib/healthExerciseCatalog'
import { cn } from '@/lib/utils'
import { getHealthDateKey, useHealthQuestStore } from '@/store/useHealthQuestStore'
import type {
  HealthCatalogExercise,
  HealthIntensity,
  HealthMood,
  HealthWorkoutLog,
} from '@/types/health'

type FormState = {
  exerciseId: string
  date: string
  sets: string
  reps: string
  durationMin: string
  intensity: HealthIntensity
  mood: HealthMood
  note: string
}

type LogFilter = {
  search: string
  bodyPart: string
}

const defaultForm = (): FormState => ({
  exerciseId: '',
  date: getHealthDateKey(),
  sets: '3',
  reps: '',
  durationMin: '',
  intensity: 'normal',
  mood: 'ok',
  note: '',
})

const EXERCISE_PAGE_SIZE = 80

const intensityLabel: Record<HealthIntensity, string> = {
  easy: 'เบา',
  normal: 'พอดี',
  hard: 'หนัก',
}

const intensityClass: Record<HealthIntensity, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  normal: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
  hard: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
}

const moodLabel: Record<HealthMood, string> = {
  great: 'รู้สึกดี',
  ok: 'โอเค',
  tired: 'เหนื่อย',
}

function toOptionalNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatShortDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day))
}

function getLogEffortText(log: HealthWorkoutLog) {
  const parts = []
  if (log.reps) parts.push(`${log.sets ?? 1} เซ็ต x ${log.reps} ครั้ง`)
  if (log.durationMin) parts.push(`${log.durationMin} นาที`)
  return parts.length > 0 ? parts.join(' · ') : 'บันทึกแล้ว'
}

function getExerciseById(exerciseId: string) {
  return HEALTH_EXERCISE_CATALOG.find((exercise) => exercise.id === exerciseId)
}

function getMonthLogCount(logs: HealthWorkoutLog[]) {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  return logs.filter((log) => {
    const [logYear, logMonth] = log.date.split('-').map(Number)
    return logYear === year && logMonth === month + 1
  }).length
}

function groupLogsByDate(logs: HealthWorkoutLog[]) {
  return logs.reduce<Array<{ date: string; logs: HealthWorkoutLog[] }>>((groups, log) => {
    const existing = groups.find((group) => group.date === log.date)
    if (existing) {
      existing.logs.push(log)
      return groups
    }

    groups.push({ date: log.date, logs: [log] })
    return groups
  }, [])
}

export default function HealthPage() {
  const logs = useHealthQuestStore((state) => state.logs)
  const xp = useHealthQuestStore((state) => state.xp)
  const streak = useHealthQuestStore((state) => state.streak)
  const achievements = useHealthQuestStore((state) => state.achievements)
  const addLog = useHealthQuestStore((state) => state.addLog)
  const updateLog = useHealthQuestStore((state) => state.updateLog)
  const deleteLog = useHealthQuestStore((state) => state.deleteLog)
  const todayCompleted = useHealthQuestStore((state) => state.getTodayCompleted())

  const [formOpen, setFormOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<HealthWorkoutLog | null>(null)
  const [form, setForm] = useState<FormState>(() => defaultForm())
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [selectedBodyPart, setSelectedBodyPart] = useState('all')
  const [selectedEquipment, setSelectedEquipment] = useState('all')
  const [selectedTarget, setSelectedTarget] = useState('all')
  const [visibleExerciseCount, setVisibleExerciseCount] = useState(EXERCISE_PAGE_SIZE)
  const [filter, setFilter] = useState<LogFilter>({ search: '', bodyPart: 'all' })

  const bodyParts = useMemo(
    () => Array.from(new Set(HEALTH_EXERCISE_CATALOG.map((exercise) => exercise.bodyPart))).sort(),
    []
  )
  const equipmentOptions = useMemo(
    () => Array.from(new Set(HEALTH_EXERCISE_CATALOG.map((exercise) => exercise.equipment))).sort(),
    []
  )
  const targetOptions = useMemo(
    () => Array.from(new Set(HEALTH_EXERCISE_CATALOG.map((exercise) => exercise.target))).sort(),
    []
  )
  const selectedExercise = useMemo(() => getExerciseById(form.exerciseId), [form.exerciseId])

  const exerciseOptions = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase()

    return HEALTH_EXERCISE_CATALOG.filter((exercise) => {
      const bodyPartLabel = HEALTH_BODY_PART_LABELS[exercise.bodyPart] ?? ''
      const equipmentLabel = HEALTH_EQUIPMENT_LABELS[exercise.equipment] ?? ''
      const targetLabel = HEALTH_TARGET_LABELS[exercise.target] ?? ''
      const searchText = [
        exercise.nameTh,
        exercise.nameEn,
        exercise.bodyPart,
        exercise.equipment,
        exercise.target,
        bodyPartLabel,
        equipmentLabel,
        targetLabel,
      ].join(' ').toLowerCase()
      const matchesSearch =
        !query ||
        searchText.includes(query)
      const matchesBodyPart = selectedBodyPart === 'all' || exercise.bodyPart === selectedBodyPart
      const matchesEquipment = selectedEquipment === 'all' || exercise.equipment === selectedEquipment
      const matchesTarget = selectedTarget === 'all' || exercise.target === selectedTarget

      return matchesSearch && matchesBodyPart && matchesEquipment && matchesTarget
    })
  }, [exerciseSearch, selectedBodyPart, selectedEquipment, selectedTarget])

  const visibleExerciseOptions = useMemo(
    () => exerciseOptions.slice(0, visibleExerciseCount),
    [exerciseOptions, visibleExerciseCount]
  )

  const filteredLogs = useMemo(() => {
    const query = filter.search.trim().toLowerCase()

    return logs.filter((log) => {
      const exercise = getExerciseById(log.exerciseId)
      const bodyPart = exercise?.bodyPart
      const matchesSearch =
        !query ||
        log.exerciseNameSnapshot.toLowerCase().includes(query) ||
        exercise?.nameEn.toLowerCase().includes(query) ||
        log.note?.toLowerCase().includes(query)
      const matchesBodyPart = filter.bodyPart === 'all' || bodyPart === filter.bodyPart

      return matchesSearch && matchesBodyPart
    })
  }, [filter, logs])

  const groupedLogs = useMemo(() => groupLogsByDate(filteredLogs), [filteredLogs])
  const monthLogCount = useMemo(() => getMonthLogCount(logs), [logs])
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length

  useEffect(() => {
    if (!formOpen) {
      setEditingLog(null)
      setForm(defaultForm())
      setExerciseSearch('')
      setSelectedBodyPart('all')
      setSelectedEquipment('all')
      setSelectedTarget('all')
      setVisibleExerciseCount(EXERCISE_PAGE_SIZE)
    }
  }, [formOpen])

  useEffect(() => {
    setVisibleExerciseCount(EXERCISE_PAGE_SIZE)
  }, [exerciseSearch, selectedBodyPart, selectedEquipment, selectedTarget])

  function clearExerciseFilters() {
    setExerciseSearch('')
    setSelectedBodyPart('all')
    setSelectedEquipment('all')
    setSelectedTarget('all')
  }

  function openAddForm() {
    setEditingLog(null)
    setForm(defaultForm())
    setFormOpen(true)
  }

  function openEditForm(log: HealthWorkoutLog) {
    setEditingLog(log)
    setForm({
      exerciseId: log.exerciseId,
      date: log.date,
      sets: log.sets ? String(log.sets) : '3',
      reps: log.reps ? String(log.reps) : '',
      durationMin: log.durationMin ? String(log.durationMin) : '',
      intensity: log.intensity,
      mood: log.mood ?? 'ok',
      note: log.note ?? '',
    })
    setFormOpen(true)
  }

  function handleSubmit() {
    const exercise = selectedExercise
    const sets = toOptionalNumber(form.sets)
    const reps = toOptionalNumber(form.reps)
    const durationMin = toOptionalNumber(form.durationMin)

    if (!exercise) {
      toast.error('เลือกท่าออกกำลังกายก่อนนะ')
      return
    }

    if (!reps && !durationMin) {
      toast.error('ใส่จำนวนครั้งหรือเวลาที่ทำอย่างน้อย 1 อย่าง')
      return
    }

    const payload = {
      exerciseId: exercise.id,
      exerciseNameSnapshot: exercise.nameTh,
      date: form.date,
      sets: reps ? sets ?? 1 : undefined,
      reps,
      durationMin,
      intensity: form.intensity,
      mood: form.mood,
      note: form.note,
    }

    if (editingLog) {
      updateLog(editingLog.id, payload)
      toast.success('อัปเดตบันทึกออกกำลังกายแล้ว')
    } else {
      addLog(payload)
      toast.success(`บันทึก ${exercise.nameTh} แล้ว รับ EXP เรียบร้อย`)
    }

    setFormOpen(false)
  }

  function handleDelete(log: HealthWorkoutLog) {
    if (!window.confirm(`ลบบันทึก ${log.exerciseNameSnapshot} ใช่ไหม?`)) return

    deleteLog(log.id)
    toast.success('ลบบันทึกแล้ว')
  }

  return (
    <div className="space-y-6 pb-24 text-slate-800 dark:text-slate-100">
      <PressCard
        shadow="0 8px 0 0 #14532d"
        shadowHover="0 5px 0 0 #14532d"
        className="overflow-hidden rounded-3xl border-[3px] border-emerald-900 bg-gradient-to-br from-[#58cc02] via-emerald-500 to-teal-600 p-5 text-white"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border-2 border-white/30 bg-white/20">
              <HeartPulse className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">
              บันทึกการออกกำลังกาย
            </h1>
            <p className="mt-3 text-sm font-bold leading-6 text-white/90 sm:text-base">
              เลือกท่า ใส่จำนวนหรือเวลา แล้วรับ EXP ทันที เหมือนบันทึกรายรับรายจ่าย แต่เปลี่ยนเป็นแต้มดูแลตัวเอง
            </p>
          </div>

          <Button
            onClick={openAddForm}
            className="h-12 rounded-2xl border-2 border-white bg-white px-5 font-black text-emerald-800 shadow-[0_4px_0_0_#14532d] hover:bg-emerald-50 active:translate-y-1"
          >
            <Plus className="h-5 w-5" />
            เพิ่มการออกกำลังกาย
          </Button>
        </div>
      </PressCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Zap} label="EXP รวม" value={xp.toLocaleString()} tone="emerald" />
        <SummaryCard icon={Flame} label="Streak" value={`${streak} วัน`} tone="orange" />
        <SummaryCard
          icon={CheckCircle2}
          label="วันนี้"
          value={todayCompleted ? 'บันทึกแล้ว' : 'ยังไม่บันทึก'}
          tone={todayCompleted ? 'sky' : 'zinc'}
        />
        <SummaryCard icon={CalendarDays} label="เดือนนี้" value={`${monthLogCount} logs`} tone="indigo" />
      </div>

      <RunningQuestSection />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filter.search}
                onChange={(event) => setFilter((current) => ({ ...current, search: event.target.value }))}
                placeholder="ค้นหาท่า หรือ note..."
                className="h-11 rounded-2xl border-2 pl-10 font-medium"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              <FilterChip
                active={filter.bodyPart === 'all'}
                onClick={() => setFilter((current) => ({ ...current, bodyPart: 'all' }))}
              >
                ทั้งหมด
              </FilterChip>
              {bodyParts.map((bodyPart) => (
                <FilterChip
                  key={bodyPart}
                  active={filter.bodyPart === bodyPart}
                  onClick={() => setFilter((current) => ({ ...current, bodyPart }))}
                >
                  {HEALTH_BODY_PART_LABELS[bodyPart] ?? bodyPart}
                </FilterChip>
              ))}
            </div>
          </div>

          {groupedLogs.length > 0 ? (
            <div className="space-y-4">
              {groupedLogs.map((group) => (
                <div key={group.date} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-black text-slate-500 dark:text-slate-400">
                      {formatDate(group.date)}
                    </h2>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                      +{group.logs.reduce((sum, log) => sum + log.xpEarned, 0)} EXP
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {group.logs.map((log) => (
                      <WorkoutLogCard
                        key={log.id}
                        log={log}
                        exercise={getExerciseById(log.exerciseId)}
                        onEdit={() => openEditForm(log)}
                        onDelete={() => handleDelete(log)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <Circle className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <h2 className="mt-3 text-lg font-black text-slate-900 dark:text-white">
                ยังไม่มีบันทึกที่ตรงกับเงื่อนไข
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                เริ่มจากท่าสั้น ๆ สักหนึ่งท่าก็พอ ระบบจะคำนวณ EXP และ streak ให้เอง
              </p>
              <Button onClick={openAddForm} className="mt-4 rounded-2xl bg-[#58cc02] font-black text-white hover:bg-[#46a302]">
                <Plus className="h-4 w-4" />
                เพิ่มบันทึกแรก
              </Button>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <PressCard
            shadow="0 5px 0 0 #cbd5e1"
            shadowHover="0 3px 0 0 #cbd5e1"
            className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-slate-900 dark:text-white">Achievement</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  ปลดล็อกแล้ว {unlockedCount}/{achievements.length}
                </p>
              </div>
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
            <div className="mt-4 grid gap-2">
              {achievements.slice(0, 6).map((achievement) => (
                <div
                  key={achievement.id}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border-2 p-3',
                    achievement.unlocked
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-500/10'
                      : 'border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-950/40'
                  )}
                >
                  <span className="text-xl">{achievement.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                      {achievement.title}
                    </p>
                    <p className="text-[11px] font-black uppercase text-slate-400">
                      {achievement.unlocked ? 'Unlocked' : 'Locked'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PressCard>

          <PressCard
            shadow="0 5px 0 0 #cbd5e1"
            shadowHover="0 3px 0 0 #cbd5e1"
            className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#58cc02]" />
              <h2 className="font-black text-slate-900 dark:text-white">Exercise catalog</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              ใช้ท่าออกกำลังกายจาก exercises-dataset ครบ 1,324 ท่า พร้อมรูปและ GIF แบบ lazy-load จากต้นทาง
            </p>
            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
              Media attribution: © Gym visual — https://gymvisual.com/
            </p>
          </PressCard>
        </aside>
      </div>

      <WorkoutLogDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        form={form}
        setForm={setForm}
        editingLog={editingLog}
        exerciseOptions={visibleExerciseOptions}
        totalExerciseCount={exerciseOptions.length}
        visibleExerciseCount={visibleExerciseOptions.length}
        selectedExercise={selectedExercise}
        exerciseSearch={exerciseSearch}
        setExerciseSearch={setExerciseSearch}
        bodyParts={bodyParts}
        selectedBodyPart={selectedBodyPart}
        setSelectedBodyPart={setSelectedBodyPart}
        equipmentOptions={equipmentOptions}
        selectedEquipment={selectedEquipment}
        setSelectedEquipment={setSelectedEquipment}
        targetOptions={targetOptions}
        selectedTarget={selectedTarget}
        setSelectedTarget={setSelectedTarget}
        onClearExerciseFilters={clearExerciseFilters}
        onLoadMoreExercises={() => setVisibleExerciseCount((count) => count + EXERCISE_PAGE_SIZE)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType
  label: string
  value: string
  tone: 'emerald' | 'orange' | 'sky' | 'zinc' | 'indigo'
}) {
  const toneClass = {
    emerald: 'border-emerald-700 bg-emerald-500 text-white',
    orange: 'border-orange-700 bg-orange-500 text-white',
    sky: 'border-sky-700 bg-sky-500 text-white',
    zinc: 'border-zinc-700 bg-zinc-600 text-white',
    indigo: 'border-indigo-700 bg-indigo-500 text-white',
  }[tone]
  const shadowClass = {
    emerald: '#14532d',
    orange: '#9a3412',
    sky: '#075985',
    zinc: '#3f3f46',
    indigo: '#3730a3',
  }[tone]

  return (
    <PressCard
      shadow={`0 5px 0 0 ${shadowClass}`}
      shadowHover={`0 3px 0 0 ${shadowClass}`}
      className={cn('h-28 min-w-0 rounded-3xl border-[3px] p-4', toneClass)}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase text-white/80">{label}</span>
          <Icon className="h-5 w-5 text-white/80" />
        </div>
        <p className="num truncate text-2xl font-black leading-none">{value}</p>
      </div>
    </PressCard>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border-2 px-3 py-2 text-xs font-black transition-colors',
        active
          ? 'border-[#2b6c00] bg-[#58cc02] text-white'
          : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
      )}
    >
      {children}
    </button>
  )
}

function WorkoutLogCard({
  log,
  exercise,
  onEdit,
  onDelete,
}: {
  log: HealthWorkoutLog
  exercise?: HealthCatalogExercise
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <PressCard
      shadow="0 5px 0 0 #cbd5e1"
      shadowHover="0 3px 0 0 #cbd5e1"
      className="rounded-3xl border-[3px] border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
          {exercise ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.nameTh}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Dumbbell className="h-8 w-8 text-slate-300" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-black text-slate-900 dark:text-white">
                {log.exerciseNameSnapshot}
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {exercise
                  ? `${HEALTH_TARGET_LABELS[exercise.target] ?? exercise.target} · ${getLogEffortText(log)}`
                  : `custom · ${getLogEffortText(log)}`}
              </p>
            </div>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
              +{log.xpEarned} EXP
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge className={intensityClass[log.intensity]}>{intensityLabel[log.intensity]}</Badge>
            {log.mood && <Badge variant="outline">{moodLabel[log.mood]}</Badge>}
            <span className="text-xs font-bold text-slate-400">{formatShortDate(log.date)}</span>
          </div>

          {log.note && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {log.note}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit} className="h-9 rounded-2xl border-2 font-black">
              <Edit3 className="h-3.5 w-3.5" />
              แก้ไข
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-9 rounded-2xl border-2 font-black text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              ลบ
            </Button>
          </div>
        </div>
      </div>
    </PressCard>
  )
}

function WorkoutLogDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editingLog,
  exerciseOptions,
  totalExerciseCount,
  visibleExerciseCount,
  selectedExercise,
  exerciseSearch,
  setExerciseSearch,
  bodyParts,
  selectedBodyPart,
  setSelectedBodyPart,
  equipmentOptions,
  selectedEquipment,
  setSelectedEquipment,
  targetOptions,
  selectedTarget,
  setSelectedTarget,
  onClearExerciseFilters,
  onLoadMoreExercises,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  editingLog: HealthWorkoutLog | null
  exerciseOptions: HealthCatalogExercise[]
  totalExerciseCount: number
  visibleExerciseCount: number
  selectedExercise?: HealthCatalogExercise
  exerciseSearch: string
  setExerciseSearch: (value: string) => void
  bodyParts: string[]
  selectedBodyPart: string
  setSelectedBodyPart: (value: string) => void
  equipmentOptions: string[]
  selectedEquipment: string
  setSelectedEquipment: (value: string) => void
  targetOptions: string[]
  selectedTarget: string
  setSelectedTarget: (value: string) => void
  onClearExerciseFilters: () => void
  onLoadMoreExercises: () => void
  onSubmit: () => void
}) {
  const hasMoreExercises = visibleExerciseCount < totalExerciseCount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] !w-[calc(100vw-1rem)] !max-w-[1120px] flex-col overflow-hidden rounded-3xl border-[3px] border-emerald-200 p-0 dark:border-emerald-900 sm:!w-[calc(100vw-2rem)] lg:!w-[min(1120px,calc(100vw-4rem))]"
      >
        <DialogHeader className="border-b px-5 py-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
              {editingLog ? 'แก้ไขบันทึก' : 'เพิ่มการออกกำลังกาย'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(420px,0.95fr)_minmax(460px,1.05fr)]">
          <div className="space-y-4 border-b p-4 dark:border-slate-800 sm:p-5 lg:border-b-0 lg:border-r">
            <div>
              <Label className="text-sm font-black">เลือกท่า</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={exerciseSearch}
                  onChange={(event) => setExerciseSearch(event.target.value)}
                  placeholder="ค้นหาชื่อท่า กล้ามเนื้อ หรืออุปกรณ์"
                  className="h-11 rounded-2xl border-2 pl-10 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/50">
              <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                พบ {totalExerciseCount.toLocaleString()} ท่า
                {totalExerciseCount > 0 && ` · แสดง ${visibleExerciseCount.toLocaleString()} ท่าแรก`}
              </p>
              <button
                type="button"
                onClick={onClearExerciseFilters}
                className="text-xs font-black text-emerald-700 hover:underline dark:text-emerald-300"
              >
                ล้างตัวกรอง
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={selectedBodyPart === 'all'} onClick={() => setSelectedBodyPart('all')}>
                ทุกส่วน
              </FilterChip>
              {bodyParts.map((bodyPart) => (
                <FilterChip
                  key={bodyPart}
                  active={selectedBodyPart === bodyPart}
                  onClick={() => setSelectedBodyPart(bodyPart)}
                >
                  {HEALTH_BODY_PART_LABELS[bodyPart] ?? bodyPart}
                </FilterChip>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={selectedEquipment === 'all'} onClick={() => setSelectedEquipment('all')}>
                ทุกอุปกรณ์
              </FilterChip>
              {equipmentOptions.map((equipment) => (
                <FilterChip
                  key={equipment}
                  active={selectedEquipment === equipment}
                  onClick={() => setSelectedEquipment(equipment)}
                >
                  {HEALTH_EQUIPMENT_LABELS[equipment] ?? equipment}
                </FilterChip>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={selectedTarget === 'all'} onClick={() => setSelectedTarget('all')}>
                ทุกกล้ามเนื้อ
              </FilterChip>
              {targetOptions.map((target) => (
                <FilterChip
                  key={target}
                  active={selectedTarget === target}
                  onClick={() => setSelectedTarget(target)}
                >
                  {HEALTH_TARGET_LABELS[target] ?? target}
                </FilterChip>
              ))}
            </div>

            <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 lg:max-h-[52vh]">
              {exerciseOptions.length > 0 ? exerciseOptions.map((exercise) => {
                const selected = form.exerciseId === exercise.id

                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, exerciseId: exercise.id }))}
                    className={cn(
                      'flex gap-3 rounded-2xl border-2 p-2 text-left transition-colors',
                      selected
                        ? 'border-[#2b6c00] bg-emerald-50 dark:bg-emerald-500/10'
                        : 'border-slate-200 hover:border-emerald-300 dark:border-slate-800'
                    )}
                  >
                    <img
                      src={exercise.imageUrl}
                      alt={exercise.nameTh}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-black text-slate-900 dark:text-white">
                        {exercise.nameTh}
                      </span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {HEALTH_EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment} · {HEALTH_TARGET_LABELS[exercise.target] ?? exercise.target}
                      </span>
                      <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {HEALTH_BODY_PART_LABELS[exercise.bodyPart] ?? exercise.bodyPart}
                      </span>
                      <span className="ml-1 mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {HEALTH_TARGET_LABELS[exercise.target] ?? exercise.target}
                      </span>
                    </span>
                  </button>
                )
              }) : (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                  <Activity className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">
                    ไม่พบท่าที่ตรงกับตัวกรอง
                  </p>
                  <button
                    type="button"
                    onClick={onClearExerciseFilters}
                    className="mt-2 text-xs font-black text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    ล้างตัวกรองแล้วดูทั้งหมด
                  </button>
                </div>
              )}
              {hasMoreExercises && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onLoadMoreExercises}
                  className="h-11 rounded-2xl border-2 font-black"
                >
                  โหลดเพิ่มอีก {Math.min(EXERCISE_PAGE_SIZE, totalExerciseCount - visibleExerciseCount).toLocaleString()} ท่า
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {selectedExercise ? (
              <div className="overflow-hidden rounded-3xl border-2 border-slate-200 dark:border-slate-800">
                <img
                  src={selectedExercise.gifUrl}
                  alt={selectedExercise.nameTh}
                  className="aspect-video w-full bg-slate-50 object-cover dark:bg-slate-950"
                />
                <div className="space-y-2 p-3">
                  <h3 className="font-black text-slate-900 dark:text-white">{selectedExercise.nameTh}</h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {HEALTH_BODY_PART_LABELS[selectedExercise.bodyPart] ?? selectedExercise.bodyPart} · {HEALTH_EQUIPMENT_LABELS[selectedExercise.equipment] ?? selectedExercise.equipment} · {HEALTH_TARGET_LABELS[selectedExercise.target] ?? selectedExercise.target}
                  </p>
                  <ol className="space-y-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {selectedExercise.instructionsTh.map((instruction) => (
                      <li key={instruction}>{instruction}</li>
                    ))}
                  </ol>
                  <p className="text-[11px] font-semibold text-slate-400">{selectedExercise.attribution}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                <Activity className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-500">เลือกท่าก่อน แล้วรายละเอียดจะแสดงตรงนี้</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="วันที่">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="h-11 rounded-2xl border-2 font-bold"
                />
              </Field>
              <Field label="เซ็ต">
                <Input
                  inputMode="numeric"
                  value={form.sets}
                  onChange={(event) => setForm((current) => ({ ...current, sets: event.target.value }))}
                  className="h-11 rounded-2xl border-2 font-bold"
                  placeholder="3"
                />
              </Field>
              <Field label="จำนวนครั้ง">
                <Input
                  inputMode="numeric"
                  value={form.reps}
                  onChange={(event) => setForm((current) => ({ ...current, reps: event.target.value }))}
                  className="h-11 rounded-2xl border-2 font-bold"
                  placeholder="12"
                />
              </Field>
              <Field label="เวลา (นาที)">
                <Input
                  inputMode="numeric"
                  value={form.durationMin}
                  onChange={(event) => setForm((current) => ({ ...current, durationMin: event.target.value }))}
                  className="h-11 rounded-2xl border-2 font-bold"
                  placeholder="10"
                />
              </Field>
            </div>

            <Field label="ความหนัก">
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'normal', 'hard'] as const).map((intensity) => (
                  <Button
                    key={intensity}
                    type="button"
                    variant={form.intensity === intensity ? 'default' : 'outline'}
                    onClick={() => setForm((current) => ({ ...current, intensity }))}
                    className={cn(
                      'h-10 rounded-2xl border-2 font-black',
                      form.intensity === intensity && 'border-[#2b6c00] bg-[#58cc02] text-white hover:bg-[#46a302]'
                    )}
                  >
                    {intensityLabel[intensity]}
                  </Button>
                ))}
              </div>
            </Field>

            <Field label="ความรู้สึก">
              <div className="grid grid-cols-3 gap-2">
                {(['great', 'ok', 'tired'] as const).map((mood) => (
                  <Button
                    key={mood}
                    type="button"
                    variant={form.mood === mood ? 'default' : 'outline'}
                    onClick={() => setForm((current) => ({ ...current, mood }))}
                    className={cn(
                      'h-10 rounded-2xl border-2 font-black',
                      form.mood === mood && 'border-[#2b6c00] bg-[#58cc02] text-white hover:bg-[#46a302]'
                    )}
                  >
                    {moodLabel[mood]}
                  </Button>
                ))}
              </div>
            </Field>

            <Field label="Note">
              <Input
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                className="h-11 rounded-2xl border-2"
                placeholder="เช่น วันนี้ทำแบบเบา ๆ"
              />
            </Field>
          </div>
        </div>

        <DialogFooter className="border-t bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl border-2 font-black">
            ยกเลิก
          </Button>
          <Button onClick={onSubmit} className="rounded-2xl bg-[#58cc02] font-black text-white hover:bg-[#46a302]">
            {editingLog ? 'บันทึกการแก้ไข' : 'รับ EXP'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
        {label}
      </Label>
      {children}
    </div>
  )
}
