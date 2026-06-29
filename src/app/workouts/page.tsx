'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search, Dumbbell, Filter, Plus, Play, ChevronDown,
  Calendar, Clock, CheckCircle2, X, Flame, Trophy,
} from 'lucide-react'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useWorkoutStore } from '@/store/useWorkoutStore'
import { PressCard } from '@/components/ui/PressCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ExerciseData } from '@/types/workout'

/* ── Body part labels (Thai) ── */
const BODY_PART_LABELS: Record<string, string> = {
  'back': 'หลัง', 'cardio': 'คาร์ดิโอ', 'chest': 'อก',
  'lower arms': 'แขนล่าง', 'lower legs': 'ขาล่าง', 'neck': 'คอ',
  'shoulders': 'ไหล่', 'upper arms': 'แขนบน', 'upper legs': 'ขาบน', 'waist': 'เอว/ท้อง',
}

const BODY_PART_EMOJI: Record<string, string> = {
  'back': '🔙', 'cardio': '❤️', 'chest': '💪', 'lower arms': '🤲',
  'lower legs': '🦶', 'neck': '🦒', 'shoulders': '🏋️', 'upper arms': '💪',
  'upper legs': '🦵', 'waist': '🔥',
}

/* ── Exercise Detail Sheet ── */
function ExerciseDetailSheet({
  exercise,
  onClose,
  onAddToWorkout,
}: {
  exercise: ExerciseData
  onClose: () => void
  onAddToWorkout: (ex: ExerciseData) => void
}) {
  const { getImageUrl, getGifUrl } = useExerciseStore()
  const [showGif, setShowGif] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl">
        {/* Header Image / GIF */}
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-t-3xl sm:rounded-t-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showGif ? getGifUrl(exercise.gif_url) : getImageUrl(exercise.image)}
            alt={exercise.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowGif(!showGif)}
            className={cn(
              'absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5',
              showGif
                ? 'bg-violet-500 text-white'
                : 'bg-white/90 text-gray-700'
            )}
          >
            <Play className="w-3 h-3" />
            {showGif ? 'หยุด GIF' : 'ดู GIF'}
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name & badges */}
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white capitalize">
              {exercise.name}
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                {BODY_PART_EMOJI[exercise.body_part] ?? '💪'} {BODY_PART_LABELS[exercise.body_part] ?? exercise.body_part}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 capitalize">
                🎯 {exercise.target}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 capitalize">
                🏋️ {exercise.equipment}
              </span>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-white/70 mb-2">วิธีทำ</h3>
            <ol className="space-y-2">
              {exercise.instruction_steps.en.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600 dark:text-white/60">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Secondary muscles */}
          {exercise.secondary_muscles.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-white/70 mb-1.5">กล้ามเนื้อที่ใช้เพิ่มเติม</h3>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondary_muscles.map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-white/50 capitalize">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Add to workout button */}
          <PressCard
            shadow="0 4px 0 0 #4c1d95"
            shadowHover="0 2px 0 0 #4c1d95"
            className="w-full border-violet-400 bg-violet-500 p-3 text-center"
            onClick={() => { onAddToWorkout(exercise); onClose() }}
          >
            <span className="text-white font-bold flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> เพิ่มเข้า Workout วันนี้
            </span>
          </PressCard>
        </div>
      </div>
    </div>
  )
}

/* ── Active Workout Sheet ── */
function ActiveWorkoutPanel() {
  const {
    activeSession, addSet, removeSet, updateSet, toggleSetDone,
    removeExerciseFromActive, finishWorkout, cancelWorkout,
  } = useWorkoutStore()
  const [note, setNote] = useState('')

  if (!activeSession) return null

  const totalDoneSets = activeSession.exercises.reduce(
    (t, e) => t + e.sets.filter((s) => s.done).length, 0
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.06] px-5 py-4 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-violet-500" /> Workout กำลังทำ
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{totalDoneSets} เซ็ตเสร็จ · {activeSession.exercises.length} ท่า</p>
            </div>
            <button onClick={cancelWorkout} className="text-xs text-red-500 font-bold">ยกเลิก</button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {activeSession.exercises.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">ยังไม่มีท่า — เพิ่มท่าจากคลังท่าด้านล่าง</p>
            </div>
          ) : (
            activeSession.exercises.map((entry) => (
              <PressCard
                key={entry.id}
                shadow="0 3px 0 0 #d1d5db"
                shadowHover="0 1px 0 0 #d1d5db"
                className="border-gray-200 dark:border-white/10 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white capitalize">{entry.exerciseName}</h3>
                  <button onClick={() => removeExerciseFromActive(entry.id)} className="text-red-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sets table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    <span>เซ็ต</span><span>น้ำหนัก(kg)</span><span>ครั้ง</span><span></span>
                  </div>
                  {entry.sets.map((s, si) => (
                    <div key={si} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                      <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-[11px] font-bold text-gray-500">
                        {si + 1}
                      </span>
                      <input
                        type="number"
                        value={s.weight || ''}
                        onChange={(e) => updateSet(entry.id, si, { weight: Number(e.target.value) })}
                        placeholder="0"
                        className="h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-center text-sm font-semibold focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={s.reps || ''}
                        onChange={(e) => updateSet(entry.id, si, { reps: Number(e.target.value) })}
                        placeholder="0"
                        className="h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-center text-sm font-semibold focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => toggleSetDone(entry.id, si)}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                          s.done
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400'
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => addSet(entry.id)}
                    className="flex-1 h-7 rounded-lg border-2 border-dashed border-gray-200 dark:border-white/10 text-xs font-bold text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors"
                  >
                    + เพิ่มเซ็ต
                  </button>
                </div>
              </PressCard>
            ))
          )}

          {/* Note */}
          <Input
            placeholder="บันทึกเพิ่มเติม (ไม่จำเป็น)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-10"
          />

          {/* Finish button */}
          <PressCard
            shadow="0 4px 0 0 #065f46"
            shadowHover="0 2px 0 0 #065f46"
            className="w-full border-emerald-400 bg-emerald-500 p-3 text-center"
            onClick={() => finishWorkout(note || undefined)}
          >
            <span className="text-white font-bold flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" /> จบ Workout
            </span>
          </PressCard>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ── */
export default function WorkoutsPage() {
  const { exercises, loading, loaded, loadExercises, searchExercises, getImageUrl, getBodyParts, getEquipmentList } = useExerciseStore()
  const { activeSession, startWorkout, addExerciseToActive, sessions } = useWorkoutStore()

  const [tab, setTab] = useState<'library' | 'log'>('library')
  const [query, setQuery] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [equipment, setEquipment] = useState('')
  const [selectedExercise, setSelectedExercise] = useState<ExerciseData | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 30

  useEffect(() => { loadExercises() }, [loadExercises])

  const filtered = useMemo(
    () => searchExercises(query, bodyPart || undefined, equipment || undefined),
    [searchExercises, query, bodyPart, equipment]
  )

  const displayed = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])
  const hasMore = displayed.length < filtered.length

  const bodyParts = useMemo(() => (loaded ? getBodyParts() : []), [loaded, getBodyParts])
  const equipmentList = useMemo(() => (loaded ? getEquipmentList() : []), [loaded, getEquipmentList])

  const handleAddToWorkout = useCallback((ex: ExerciseData) => {
    if (!activeSession) startWorkout()
    // Small delay to ensure session is created
    setTimeout(() => addExerciseToActive(ex.id, ex.name), 50)
  }, [activeSession, startWorkout, addExerciseToActive])

  // Group sessions by date for log tab
  const groupedSessions = useMemo(() => {
    const groups: Record<string, typeof sessions> = {}
    for (const s of sessions) {
      if (!groups[s.date]) groups[s.date] = []
      groups[s.date].push(s)
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [sessions])

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">ออกกำลังกาย</h2>
          <p className="text-sm font-semibold text-gray-400">{loaded ? `${exercises.length} ท่า` : 'กำลังโหลด...'}</p>
        </div>
        {!activeSession ? (
          <PressCard
            shadow="0 3px 0 0 #4c1d95"
            shadowHover="0 1px 0 0 #4c1d95"
            className="border-violet-400 bg-violet-500 px-4 py-2"
            onClick={() => startWorkout()}
          >
            <span className="text-white font-bold text-sm flex items-center gap-1.5">
              <Play className="w-4 h-4" /> เริ่ม Workout
            </span>
          </PressCard>
        ) : (
          <PressCard
            shadow="0 3px 0 0 #065f46"
            shadowHover="0 1px 0 0 #065f46"
            className="border-emerald-400 bg-emerald-500 px-4 py-2 animate-pulse"
            onClick={() => {}} // Scroll to active workout
          >
            <span className="text-white font-bold text-sm flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4" /> กำลังทำ ({activeSession.exercises.length} ท่า)
            </span>
          </PressCard>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'library' as const, label: 'คลังท่า', icon: Dumbbell },
          { key: 'log' as const, label: 'ประวัติ', icon: Calendar },
        ].map(({ key, label, icon: Icon }) => (
          <PressCard
            key={key}
            shadow={tab === key ? '0 3px 0 0 #4c1d95' : '0 3px 0 0 #d1d5db'}
            shadowHover={tab === key ? '0 1px 0 0 #4c1d95' : '0 1px 0 0 #d1d5db'}
            className={cn(
              'flex-1 py-2.5 text-center',
              tab === key
                ? 'border-violet-400 bg-violet-500'
                : 'border-gray-200 dark:border-white/10'
            )}
            onClick={() => setTab(key)}
          >
            <span className={cn(
              'font-bold text-sm flex items-center justify-center gap-1.5',
              tab === key ? 'text-white' : 'text-gray-500 dark:text-white/50'
            )}>
              <Icon className="w-4 h-4" /> {label}
            </span>
          </PressCard>
        ))}
      </div>

      {/* ── TAB: Library ── */}
      {tab === 'library' && (
        <>
          {/* Search + filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="ค้นหาท่าออกกำลังกาย..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                className="pl-10 h-11"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors',
                  showFilters || bodyPart || equipment
                    ? 'border-violet-400 bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-400'
                    : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50'
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                กรอง {(bodyPart || equipment) && '•'}
              </button>
              {bodyPart && (
                <button
                  onClick={() => { setBodyPart(''); setPage(1) }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
                >
                  {BODY_PART_LABELS[bodyPart] ?? bodyPart} <X className="w-3 h-3" />
                </button>
              )}
              {equipment && (
                <button
                  onClick={() => { setEquipment(''); setPage(1) }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 capitalize"
                >
                  {equipment} <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {showFilters && (
              <PressCard shadow="0 3px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 dark:border-white/10 p-4 space-y-3">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">ส่วนร่างกาย</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bodyParts.map((bp) => (
                      <button
                        key={bp}
                        onClick={() => { setBodyPart(bodyPart === bp ? '' : bp); setPage(1) }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors capitalize',
                          bodyPart === bp
                            ? 'bg-violet-500 text-white'
                            : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 hover:bg-violet-100 hover:text-violet-600'
                        )}
                      >
                        {BODY_PART_EMOJI[bp] ?? ''} {BODY_PART_LABELS[bp] ?? bp}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">อุปกรณ์</p>
                  <div className="flex flex-wrap gap-1.5">
                    {equipmentList.map((eq) => (
                      <button
                        key={eq}
                        onClick={() => { setEquipment(equipment === eq ? '' : eq); setPage(1) }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors capitalize',
                          equipment === eq
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 hover:bg-amber-100 hover:text-amber-600'
                        )}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>
              </PressCard>
            )}
          </div>

          {/* Result count */}
          <p className="text-xs font-bold text-gray-400">{filtered.length} ท่าที่พบ</p>

          {/* Exercise Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.04] aspect-square" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {displayed.map((ex) => (
                  <PressCard
                    key={ex.id}
                    shadow="0 3px 0 0 #d1d5db"
                    shadowHover="0 1px 0 0 #d1d5db"
                    className="border-gray-200 dark:border-white/10 overflow-hidden p-0 text-left"
                    onClick={() => setSelectedExercise(ex)}
                  >
                    <div className="aspect-square bg-gray-50 dark:bg-white/[0.04] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImageUrl(ex.image)}
                        alt={ex.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-gray-800 dark:text-white capitalize line-clamp-2 leading-tight">
                        {ex.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 capitalize">
                        {BODY_PART_LABELS[ex.body_part] ?? ex.body_part} · {ex.equipment}
                      </p>
                    </div>
                  </PressCard>
                ))}
              </div>

              {hasMore && (
                <div className="text-center">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                    <ChevronDown className="w-4 h-4 mr-1" /> โหลดเพิ่ม
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── TAB: Log ── */}
      {tab === 'log' && (
        <div className="space-y-3">
          {groupedSessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">ยังไม่มีประวัติการออกกำลังกาย</p>
              <p className="text-xs mt-1">เริ่ม Workout แรกของคุณเลย!</p>
            </div>
          ) : (
            groupedSessions.map(([date, dateSessions]) => {
              const d = new Date(date)
              const dayLabel = d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })
              return (
                <div key={date}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{dayLabel}</p>
                  <div className="space-y-2">
                    {dateSessions.map((session) => {
                      const totalSets = session.exercises.reduce((t, e) => t + e.sets.filter((s) => s.done).length, 0)
                      const duration = session.startTime && session.endTime
                        ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)
                        : null
                      return (
                        <PressCard
                          key={session.id}
                          shadow="0 3px 0 0 #d1d5db"
                          shadowHover="0 1px 0 0 #d1d5db"
                          className="border-gray-200 dark:border-white/10 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
                                <Dumbbell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{session.exercises.length} ท่า · {totalSets} เซ็ต</p>
                                <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                  {duration && <><Clock className="w-3 h-3" /> {duration} นาที</>}
                                  {session.note && <> · {session.note}</>}
                                </p>
                              </div>
                            </div>
                          </div>
                          {/* Exercise list */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {session.exercises.map((e) => (
                              <span key={e.id} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 capitalize">
                                {e.exerciseName}
                              </span>
                            ))}
                          </div>
                        </PressCard>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Exercise Detail Sheet */}
      {selectedExercise && (
        <ExerciseDetailSheet
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
          onAddToWorkout={handleAddToWorkout}
        />
      )}

      {/* Active Workout Panel */}
      {activeSession && activeSession.exercises.length > 0 && <ActiveWorkoutPanel />}
    </div>
  )
}
