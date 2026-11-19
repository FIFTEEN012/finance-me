'use client'

import { Lightbulb, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ACTIVITY_LEVELS, GOALS, recommend } from '@/lib/fitness'
import { formatMl } from '@/lib/nutrition'
import { HealthProfile } from '@/types'

interface Props {
  profile: HealthProfile | null
  calorieGoal: number
  waterGoal: number
  onEditProfile: () => void
  onApply: (calories: number, water: number) => void
}

export function AdviceCard({ profile, calorieGoal, waterGoal, onEditProfile, onApply }: Props) {
  if (!profile) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/15 shrink-0">
          <UserRound className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <p className="font-bold text-slate-800 dark:text-slate-100">รับคำแนะนำที่เหมาะกับคุณ</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            กรอกเพศ อายุ ส่วนสูง น้ำหนัก และเป้าหมาย ระบบจะคำนวณว่าควรกินกี่แคล ดื่มน้ำกี่ มล. และออกกำลังแค่ไหน
          </p>
        </div>
        <Button onClick={onEditProfile}>กรอกข้อมูล</Button>
      </div>
    )
  }

  const rec = recommend(profile)
  const applied = calorieGoal === rec.calories && waterGoal === rec.water
  const activity = ACTIVITY_LEVELS.find((a) => a.value === profile.activity)?.label
  const goal = GOALS.find((g) => g.value === profile.goal)?.label

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/15 shrink-0">
          <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <p className="font-bold text-slate-800 dark:text-slate-100">คำแนะนำสำหรับคุณ</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {profile.sex === 'male' ? 'ชาย' : 'หญิง'} {profile.age} ปี · {profile.heightCm} ซม. · {profile.weightKg} กก. · {activity} · {goal}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onEditProfile}>แก้ข้อมูล</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'ควรกินต่อวัน', value: `${rec.calories.toLocaleString('th-TH')} kcal`, sub: 'บวกเพิ่มตามที่ออกกำลัง' },
          { label: 'ควรดื่มน้ำ', value: formatMl(rec.water), sub: 'บวกเพิ่มวันที่ออกกำลัง' },
          { label: 'ออกกำลัง', value: `${rec.weeklyExerciseMinutes} นาที/สัปดาห์`, sub: `${rec.exerciseDays} วัน วันละ ${rec.minutesPerSession} นาที` },
          { label: 'BMI', value: rec.bmi.toLocaleString('th-TH'), sub: rec.bmiLabel },
        ].map((x) => (
          <div key={x.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{x.label}</p>
            <p className="font-black text-slate-800 dark:text-slate-100 num tabular-nums">{x.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{x.sub}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">แผนออกกำลังที่แนะนำ</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          {rec.plan.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        ใช้พลังงานขณะพัก (BMR) ราว {rec.bmr.toLocaleString('th-TH')} kcal และรวมกิจวัตรประจำวันราว {rec.tdee.toLocaleString('th-TH')} kcal
        {rec.calorieFloorApplied && ' · เป้าลดน้ำหนักถูกปรับขึ้นไม่ให้ต่ำกว่าปริมาณขั้นต่ำที่ปลอดภัย'}
        {' '}ตัวเลขเป็นการประมาณจากสูตรทั่วไป ถ้ามีโรคประจำตัว ตั้งครรภ์ หรือเป็นนักกีฬา ควรปรึกษาแพทย์หรือนักโภชนาการ
      </p>

      {applied ? (
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">เป้าหมายรายวันตรงกับคำแนะนำแล้ว</p>
      ) : (
        <Button onClick={() => onApply(rec.calories, rec.water)} className="w-full sm:w-auto">
          ใช้เป็นเป้าหมายรายวัน ({rec.calories.toLocaleString('th-TH')} kcal · {formatMl(rec.water)})
        </Button>
      )}
    </div>
  )
}
