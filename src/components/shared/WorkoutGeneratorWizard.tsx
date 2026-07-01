'use client'

import { useState } from 'react'
import { X, Flame, Target, Dumbbell, Award, ChevronLeft } from 'lucide-react'
import { PressCard } from '@/components/ui/PressCard'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useRoutineStore } from '@/store/useRoutineStore'
import { generateWorkoutRoutines } from '@/lib/workoutGenerator'
import { cn } from '@/lib/utils'

interface WorkoutGeneratorWizardProps {
  onClose: () => void
}

export function WorkoutGeneratorWizard({ onClose }: WorkoutGeneratorWizardProps) {
  const { exercises, loadExercises } = useExerciseStore()
  const { addRoutine } = useRoutineStore()
  const [step, setStep] = useState(1)

  // Form states
  const [goal, setGoal] = useState<'muscle' | 'loss' | 'strength'>('muscle')
  const [frequency, setFrequency] = useState<2 | 3 | 4>(3)
  const [equipment, setEquipment] = useState<'bodyweight' | 'dumbbell' | 'full'>('dumbbell')
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [focus, setFocus] = useState<'all' | 'upper' | 'lower' | 'abs'>('all')

  const handleNext = () => {
    if (step < 5) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleGenerate = async () => {
    await loadExercises() // ensure loaded
    const generated = generateWorkoutRoutines(exercises, {
      goal,
      frequency,
      equipment,
      level,
      focus
    })

    // Add generated routines to store
    for (const r of generated) {
      addRoutine(r)
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={handleBack} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <div>
              <h3 className="text-base font-black">AIสร้างแผนออกกำลังกาย</h3>
              <p className="text-[10px] text-white/70">ขั้นตอนที่ {step} จาก 5</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-full flex-1 transition-all duration-300',
                i + 1 <= step ? 'bg-violet-500' : 'bg-transparent'
              )}
            />
          ))}
        </div>

        {/* Wizard Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* STEP 1: Goal */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <Target className="w-10 h-10 mx-auto text-violet-500" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-white mt-2">เป้าหมายในการฝึกคืออะไร?</h4>
              </div>
              {[
                { id: 'muscle' as const, label: 'เพิ่มกล้ามเนื้อ (Build Muscle)', desc: 'เน้นกระตุ้นการเติบโตของกล้ามเนื้อ เซ็ตละ 10 ครั้ง', emoji: '💪' },
                { id: 'loss' as const, label: 'ลดไขมัน/คาร์ดิโอ (Weight Loss)', desc: 'เน้นเผาผลาญพลังงาน ทำความเร็วสูง เซ็ตละ 15 ครั้ง', emoji: '🏃' },
                { id: 'strength' as const, label: 'เพิ่มความแข็งแรง (Strength)', desc: 'เน้นยกหนักขึ้นเพื่อพละกำลังที่มากขึ้น เซ็ตละ 5 ครั้ง', emoji: '🏋️' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setGoal(opt.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 p-3 rounded-xl border-2 text-left transition-all active:scale-98',
                    goal === opt.id
                      ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-500/10'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">{opt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: Frequency */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <Flame className="w-10 h-10 mx-auto text-orange-500" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-white mt-2">ต้องการออกกำลังกายกี่วันต่อสัปดาห์?</h4>
              </div>
              {[
                { id: 2 as const, label: '2 วันต่อสัปดาห์', desc: 'แผน Full Body (ทั่วร่าง A & B)', emoji: '🔋' },
                { id: 3 as const, label: '3 วันต่อสัปดาห์', desc: 'แผนแยก Push, Pull, Legs ยอดนิยม', emoji: '⚡' },
                { id: 4 as const, label: '4 วันต่อสัปดาห์', desc: 'แผน Upper/Lower แยกบนล่างละเอียดขึ้น', emoji: '🔥' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFrequency(opt.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 p-3 rounded-xl border-2 text-left transition-all active:scale-98',
                    frequency === opt.id
                      ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-500/10'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">{opt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 3: Equipment */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <Dumbbell className="w-10 h-10 mx-auto text-sky-500" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-white mt-2">มีอุปกรณ์สำหรับฝึกแบบไหนบ้าง?</h4>
              </div>
              {[
                { id: 'bodyweight' as const, label: 'บอดี้เวทเท่านั้น (Body Weight)', desc: 'ไม่ใช้อุปกรณ์ ใช้แค่น้ำหนักตัว', emoji: '🧘' },
                { id: 'dumbbell' as const, label: 'ดัมเบล (Dumbbells)', desc: 'มีแค่ดัมเบลอย่างเดียว หรือดัมเบลคู่กับน้ำหนักตัว', emoji: '💪' },
                { id: 'full' as const, label: 'ฟิตเนสครบครัน (Full Gym)', desc: 'มีบาร์เบล, เครื่องเล่นแรงต้าน, เคเบิล ครบวงจร', emoji: '🏢' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setEquipment(opt.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 p-3 rounded-xl border-2 text-left transition-all active:scale-98',
                    equipment === opt.id
                      ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-500/10'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">{opt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 4: Level */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <Award className="w-10 h-10 mx-auto text-emerald-500" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-white mt-2">ระดับประสบการณ์ของคุณเป็นอย่างไร?</h4>
              </div>
              {[
                { id: 'beginner' as const, label: 'ผู้เริ่มต้น (Beginner)', desc: 'ท่าไม่ยาก แผนฝึกละ 4 ท่า ทำความคุ้นเคยกับฟอร์ม', emoji: '🌱' },
                { id: 'intermediate' as const, label: 'ปานกลาง (Intermediate)', desc: 'แผนฝึกละ 5 ท่า เพิ่มปริมาณความเข้มข้นขึ้น', emoji: '🌿' },
                { id: 'advanced' as const, label: 'ขั้นสูง (Advanced)', desc: 'แผนฝึกละ 7 ท่า ท้าทายกล้ามเนื้ออย่างหนักหน่วง', emoji: '🌲' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setLevel(opt.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 p-3 rounded-xl border-2 text-left transition-all active:scale-98',
                    level === opt.id
                      ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-500/10'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">{opt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 5: Focus */}
          {step === 5 && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <Award className="w-10 h-10 mx-auto text-rose-500" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-white mt-2">เน้นกลุ่มกล้ามเนื้อส่วนไหนพิเศษไหม?</h4>
              </div>
              {[
                { id: 'all' as const, label: 'ทั้งตัวเท่า ๆ กัน (Full Body)', desc: 'สัดส่วนและท่าฝึกกระจายทั่วทุกส่วน', emoji: '🌍' },
                { id: 'upper' as const, label: 'ส่วนบนร่างกาย (Upper Focus)', desc: 'เน้นอก, หลัง, ไหล่, แขน', emoji: '👕' },
                { id: 'lower' as const, label: 'ส่วนล่างร่างกาย (Lower Focus)', desc: 'เน้นก้น, ต้นขา, น่อง', emoji: '👖' },
                { id: 'abs' as const, label: 'เน้นแกนกลางลำตัว (Abs/Core)', desc: 'เน้นท่ากระชับหน้าท้องและแกนกลาง', emoji: '🎯' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFocus(opt.id)}
                  className={cn(
                    'w-full flex items-center gap-3.5 p-3 rounded-xl border-2 text-left transition-all active:scale-98',
                    focus === opt.id
                      ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-500/10'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">{opt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] flex gap-3">
          {step === 5 ? (
            <PressCard
              shadow="0 4px 0 0 #4c1d95"
              shadowHover="0 2px 0 0 #4c1d95"
              className="w-full border-violet-400 bg-violet-500 p-2.5 text-center"
              onClick={handleGenerate}
            >
              <span className="text-white font-bold text-sm">สร้างแผนการฝึกเลย ✨</span>
            </PressCard>
          ) : (
            <PressCard
              shadow="0 4px 0 0 #4c1d95"
              shadowHover="0 2px 0 0 #4c1d95"
              className="w-full border-violet-400 bg-violet-500 p-2.5 text-center"
              onClick={handleNext}
            >
              <span className="text-white font-bold text-sm font-semibold">ขั้นตอนต่อไป</span>
            </PressCard>
          )}
        </div>
      </div>
    </div>
  )
}
