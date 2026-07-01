'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, X, Search, Dumbbell, Play, Trash2, Edit3, ListPlus, Sparkles,
} from 'lucide-react'
import { useRoutineStore } from '@/store/useRoutineStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useWorkoutStore } from '@/store/useWorkoutStore'
import { PressCard } from '@/components/ui/PressCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ExerciseData, Routine, RoutineExercise } from '@/types/workout'
import { WorkoutGeneratorWizard } from '@/components/shared/WorkoutGeneratorWizard'

const ROUTINE_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#ec4899', '#06b6d4', '#8b5cf6']
const ROUTINE_EMOJIS = ['🏋️', '💪', '🦵', '🏃', '🔥', '⚡', '🎯', '🌟', '🦾', '👊', '🤸', '🧘']

/* ── Add Exercises Sheet ── */
function AddExercisesSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (ex: ExerciseData) => void
}) {
  const { exercises, loaded, loadExercises, searchExercises, getImageUrl } = useExerciseStore()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { loadExercises() }, [loadExercises])

  const filtered = useMemo(() => searchExercises(q), [searchExercises, q])
  const displayed = filtered.slice(0, page * 30)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.06] p-4 rounded-t-3xl sm:rounded-t-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-gray-900 dark:text-white">เลือกท่า</h3>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="ค้นหาท่า..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="pl-10 h-10" />
          </div>
        </div>
        <div className="p-4 space-y-2">
          {displayed.map((ex) => (
            <button
              key={ex.id}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors text-left"
              onClick={() => onAdd(ex)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(ex.image)}
                alt={ex.name}
                className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/[0.06] object-contain"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 dark:text-white capitalize truncate">{ex.name}</p>
                <p className="text-[10px] text-gray-400 capitalize">{ex.body_part} · {ex.equipment}</p>
              </div>
              <Plus className="w-4 h-4 text-violet-500 flex-shrink-0" />
            </button>
          ))}
          {displayed.length < filtered.length && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setPage((p) => p + 1)}>
              โหลดเพิ่ม
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Create / Edit Routine Sheet ── */
function RoutineEditorSheet({
  editRoutine,
  onClose,
}: {
  editRoutine?: Routine
  onClose: () => void
}) {
  const { addRoutine, updateRoutine } = useRoutineStore()
  const [name, setName] = useState(editRoutine?.name ?? '')
  const [emoji, setEmoji] = useState(editRoutine?.emoji ?? '🏋️')
  const [color, setColor] = useState(editRoutine?.color ?? ROUTINE_COLORS[0])
  const [exercises, setExercises] = useState<RoutineExercise[]>(editRoutine?.exercises ?? [])
  const [showAddEx, setShowAddEx] = useState(false)

  const handleAddExercise = (ex: ExerciseData) => {
    setExercises((prev) => [
      ...prev,
      { exerciseId: ex.id, exerciseName: ex.name, targetSets: 3, targetReps: 10 },
    ])
    setShowAddEx(false)
  }

  const handleSave = () => {
    if (!name.trim() || exercises.length === 0) return
    if (editRoutine) {
      updateRoutine(editRoutine.id, { name, emoji, color, exercises })
    } else {
      addRoutine({ name, emoji, color, exercises })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.06] px-5 py-4 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              {editRoutine ? 'แก้ไขแผน' : 'สร้างแผนใหม่'}
            </h2>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ชื่อแผน</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Push Day, Leg Day"
              className="mt-1 h-11"
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ไอคอน</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ROUTINE_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all',
                    emoji === e
                      ? 'bg-violet-100 dark:bg-violet-500/15 ring-2 ring-violet-500 scale-110'
                      : 'bg-gray-100 dark:bg-white/[0.06] hover:scale-105'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">สี</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ROUTINE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ท่าออกกำลังกาย ({exercises.length})</label>
              <button
                onClick={() => setShowAddEx(true)}
                className="text-xs font-bold text-violet-500 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มท่า
              </button>
            </div>
            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <PressCard
                  key={`${ex.exerciseId}-${i}`}
                  shadow="0 2px 0 0 #d1d5db"
                  shadowHover="0 1px 0 0 #d1d5db"
                  className="border-gray-200 dark:border-white/10 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-800 dark:text-white capitalize">{ex.exerciseName}</p>
                    <button onClick={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400">เซ็ต</label>
                      <input
                        type="number"
                        value={ex.targetSets}
                        onChange={(e) => {
                          const updated = [...exercises]
                          updated[i] = { ...updated[i], targetSets: Number(e.target.value) }
                          setExercises(updated)
                        }}
                        className="w-full h-7 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-center text-sm font-semibold"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400">ครั้ง</label>
                      <input
                        type="number"
                        value={ex.targetReps}
                        onChange={(e) => {
                          const updated = [...exercises]
                          updated[i] = { ...updated[i], targetReps: Number(e.target.value) }
                          setExercises(updated)
                        }}
                        className="w-full h-7 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-center text-sm font-semibold"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400">kg (ไม่จำเป็น)</label>
                      <input
                        type="number"
                        value={ex.targetWeight ?? ''}
                        onChange={(e) => {
                          const updated = [...exercises]
                          updated[i] = { ...updated[i], targetWeight: e.target.value ? Number(e.target.value) : undefined }
                          setExercises(updated)
                        }}
                        placeholder="-"
                        className="w-full h-7 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] text-center text-sm font-semibold"
                      />
                    </div>
                  </div>
                </PressCard>
              ))}
              {exercises.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">ยังไม่มีท่า — กดปุ่ม &quot;เพิ่มท่า&quot; ด้านบน</p>
                </div>
              )}
            </div>
          </div>

          {/* Save button */}
          <PressCard
            shadow="0 4px 0 0 #4c1d95"
            shadowHover="0 2px 0 0 #4c1d95"
            className={cn(
              'w-full p-3 text-center',
              name.trim() && exercises.length > 0
                ? 'border-violet-400 bg-violet-500'
                : 'border-gray-300 bg-gray-300 cursor-not-allowed'
            )}
            onClick={handleSave}
          >
            <span className="text-white font-bold">
              {editRoutine ? 'บันทึกการแก้ไข' : 'สร้างแผน'}
            </span>
          </PressCard>
        </div>
      </div>

      {showAddEx && <AddExercisesSheet onClose={() => setShowAddEx(false)} onAdd={handleAddExercise} />}
    </div>
  )
}

/* ── Main Page ── */
export default function RoutinesPage() {
  const { routines, deleteRoutine } = useRoutineStore()
  const { startWorkout, addExerciseToActive } = useWorkoutStore()
  const [showEditor, setShowEditor] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | undefined>()

  const handleStartRoutine = (routine: Routine) => {
    startWorkout()
    // Add all exercises from routine with pre-filled sets
    setTimeout(() => {
      for (const ex of routine.exercises) {
        addExerciseToActive(ex.exerciseId, ex.exerciseName)
      }
    }, 50)
  }

  const handleEdit = (routine: Routine) => {
    setEditingRoutine(routine)
    setShowEditor(true)
  }

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">แผนออกกำลังกาย</h2>
          <p className="text-sm font-semibold text-gray-400">{routines.length} แผน</p>
        </div>
        <div className="flex gap-2">
          <PressCard
            shadow="0 3px 0 0 #d97706"
            shadowHover="0 1px 0 0 #d97706"
            className="border-amber-400 bg-amber-500 px-3.5 py-2"
            onClick={() => setShowGenerator(true)}
          >
            <span className="text-white font-bold text-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI สร้างแผน
            </span>
          </PressCard>
          <PressCard
            shadow="0 3px 0 0 #4c1d95"
            shadowHover="0 1px 0 0 #4c1d95"
            className="border-violet-400 bg-violet-500 px-3.5 py-2"
            onClick={() => { setEditingRoutine(undefined); setShowEditor(true) }}
          >
            <span className="text-white font-bold text-sm flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> สร้างเอง
            </span>
          </PressCard>
        </div>
      </div>

      {/* Routines List */}
      {routines.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ListPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">ยังไม่มีแผนออกกำลังกาย</p>
          <p className="text-xs mt-1">ให้ AI สร้างตารางฝึก หรือสร้างแผนใหม่ด้วยตนเองด้านบน</p>
        </div>
      ) : (
        <div className="space-y-3">
          {routines.map((routine) => (
            <PressCard
              key={routine.id}
              shadow={`0 4px 0 0 ${routine.color}66`}
              shadowHover={`0 2px 0 0 ${routine.color}66`}
              className="p-4"
              style={{ borderColor: `${routine.color}44` } as React.CSSProperties}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${routine.color}15` }}
                  >
                    {routine.emoji}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">{routine.name}</h3>
                    <p className="text-xs text-gray-400">{routine.exercises.length} ท่า</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleEdit(routine)}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-gray-400 hover:text-gray-600"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteRoutine(routine.id)}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Exercise tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {routine.exercises.map((ex, i) => (
                  <span
                    key={`${ex.exerciseId}-${i}`}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                    style={{
                      backgroundColor: `${routine.color}12`,
                      color: routine.color,
                    }}
                  >
                    {ex.exerciseName} ({ex.targetSets}×{ex.targetReps})
                  </span>
                ))}
              </div>

              {/* Start button */}
              <PressCard
                shadow={`0 3px 0 0 ${routine.color}`}
                shadowHover={`0 1px 0 0 ${routine.color}`}
                className="w-full mt-3 py-2.5 text-center"
                style={{ borderColor: routine.color, backgroundColor: routine.color } as React.CSSProperties}
                onClick={() => handleStartRoutine(routine)}
              >
                <span className="text-white font-bold text-sm flex items-center justify-center gap-1.5">
                  <Play className="w-4 h-4" /> เริ่มแผนนี้
                </span>
              </PressCard>
            </PressCard>
          ))}
        </div>
      )}

      {/* Editor Sheet */}
      {showEditor && (
        <RoutineEditorSheet
          editRoutine={editingRoutine}
          onClose={() => { setShowEditor(false); setEditingRoutine(undefined) }}
        />
      )}

      {/* AI Generator Wizard */}
      {showGenerator && (
        <WorkoutGeneratorWizard
          onClose={() => setShowGenerator(false)}
        />
      )}
    </div>
  )
}

