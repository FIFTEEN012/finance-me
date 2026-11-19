import type { BodyGoal, DailyActivity, ExerciseEntry, HealthProfile, Sex } from '@/types'
import { addDays } from '@/lib/supplies'

/**
 * Activities with their MET value (energy cost relative to resting),
 * from the Compendium of Physical Activities. kcal = MET × kg × hours.
 */
export const EXERCISES: { value: string; label: string; met: number }[] = [
  { value: 'walk', label: 'เดิน', met: 3.5 },
  { value: 'brisk_walk', label: 'เดินเร็ว', met: 4.3 },
  { value: 'run', label: 'วิ่ง', met: 8.3 },
  { value: 'cycle', label: 'ปั่นจักรยาน', met: 6.8 },
  { value: 'swim', label: 'ว่ายน้ำ', met: 6 },
  { value: 'weights', label: 'เวทเทรนนิ่ง', met: 5 },
  { value: 'hiit', label: 'HIIT / คาร์ดิโอหนัก', met: 8 },
  { value: 'aerobic', label: 'แอโรบิก / เต้น', met: 6.5 },
  { value: 'yoga', label: 'โยคะ / ยืดเหยียด', met: 2.5 },
  { value: 'football', label: 'ฟุตบอล', met: 7 },
  { value: 'badminton', label: 'แบดมินตัน', met: 5.5 },
  { value: 'other', label: 'อื่น ๆ', met: 0 },
]

/** Used to estimate burn before the user fills in a profile. */
export const FALLBACK_WEIGHT_KG = 60

export const ACTIVITY_LEVELS: { value: DailyActivity; label: string; desc: string; factor: number }[] = [
  { value: 'sedentary', label: 'นั่งเป็นส่วนใหญ่', desc: 'ทำงานโต๊ะ เดินน้อย', factor: 1.2 },
  { value: 'light', label: 'เดินบ้าง', desc: 'ลุกเดินเป็นระยะระหว่างวัน', factor: 1.375 },
  { value: 'active', label: 'ยืนหรือเดินทั้งวัน', desc: 'งานขาย งานบริการ', factor: 1.55 },
  { value: 'very_active', label: 'ใช้แรงหนัก', desc: 'งานก่อสร้าง ยกของ', factor: 1.725 },
]

export const GOALS: { value: BodyGoal; label: string }[] = [
  { value: 'lose', label: 'ลดน้ำหนัก' },
  { value: 'maintain', label: 'รักษาน้ำหนัก' },
  { value: 'gain', label: 'เพิ่มน้ำหนัก / กล้ามเนื้อ' },
]

export function exerciseLabel(activity: string): string {
  return EXERCISES.find((e) => e.value === activity)?.label ?? 'อื่น ๆ'
}

/** Calories burned by an activity, rounded; 0 for 'other' (user types it). */
export function estimateBurn(activity: string, minutes: number, weightKg: number): number {
  const met = EXERCISES.find((e) => e.value === activity)?.met ?? 0
  if (met <= 0 || minutes <= 0 || weightKg <= 0) return 0
  return Math.round(met * weightKg * (minutes / 60))
}

export function burnedOn(entries: ExerciseEntry[], date: string): number {
  return entries.reduce((sum, e) => (e.date === date ? sum + e.kcal : sum), 0)
}

export function minutesOn(entries: ExerciseEntry[], date: string): number {
  return entries.reduce((sum, e) => (e.date === date ? sum + e.minutes : sum), 0)
}

/** Monday-to-Sunday week containing `date`. */
export function weekMinutes(entries: ExerciseEntry[], date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 // Monday = 0
  const start = addDays(date, -weekday)
  const end = addDays(start, 6)
  return entries.reduce((sum, e) => (e.date >= start && e.date <= end ? sum + e.minutes : sum), 0)
}

/** Extra water for sweat: about 500 ml per hour of exercise, in 50 ml steps. */
export function exerciseWater(minutes: number): number {
  return Math.round((minutes * (500 / 60)) / 50) * 50
}

/** Resting energy, Mifflin–St Jeor. */
export function bmr(p: Pick<HealthProfile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age
  return Math.round(base + (p.sex === 'male' ? 5 : -161))
}

const MIN_INTAKE: Record<Sex, number> = { male: 1500, female: 1200 }
const GOAL_ADJUST: Record<BodyGoal, number> = { lose: -500, maintain: 0, gain: 300 }
const WEEKLY_MINUTES: Record<BodyGoal, number> = { lose: 250, maintain: 150, gain: 150 }

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step
}

export interface Recommendation {
  bmr: number
  /** Daily burn without exercise. */
  tdee: number
  /** Calories to eat on a rest day; exercise burn is added on top. */
  calories: number
  /** True when the goal deficit was capped by the minimum safe intake. */
  calorieFloorApplied: boolean
  /** Base water for a rest day, ml. */
  water: number
  bmi: number
  bmiLabel: string
  weeklyExerciseMinutes: number
  exerciseDays: number
  minutesPerSession: number
  strengthDays: number
  plan: string[]
}

export function bmiLabel(bmi: number): string {
  // Asian cut-offs (WHO Western Pacific).
  if (bmi < 18.5) return 'น้ำหนักน้อย'
  if (bmi < 23) return 'ปกติ'
  if (bmi < 25) return 'น้ำหนักเกิน'
  if (bmi < 30) return 'อ้วนระดับ 1'
  return 'อ้วนระดับ 2'
}

export function recommend(p: HealthProfile): Recommendation {
  const rest = bmr(p)
  const factor = ACTIVITY_LEVELS.find((a) => a.value === p.activity)?.factor ?? 1.2
  const tdee = Math.round(rest * factor)
  const raw = tdee + GOAL_ADJUST[p.goal]
  const floor = MIN_INTAKE[p.sex]
  const calories = roundTo(Math.max(raw, floor), 50)
  const bmi = Math.round((p.weightKg / (p.heightCm / 100) ** 2) * 10) / 10

  const weekly = WEEKLY_MINUTES[p.goal]
  const exerciseDays = 5
  const minutesPerSession = roundTo(weekly / exerciseDays, 5)
  const strengthDays = p.goal === 'gain' ? 3 : 2

  const burn = (activity: string) => estimateBurn(activity, minutesPerSession, p.weightKg)
  const plan =
    p.goal === 'lose'
      ? [
          `คาร์ดิโอ ${exerciseDays} วัน/สัปดาห์ วันละ ${minutesPerSession} นาที เช่น เดินเร็ว (≈${burn('brisk_walk')} kcal) หรือปั่นจักรยาน (≈${burn('cycle')} kcal)`,
          `เวทเทรนนิ่ง ${strengthDays} วัน/สัปดาห์ ช่วยรักษากล้ามเนื้อระหว่างลดน้ำหนัก`,
          'ลดราว 0.5 กก./สัปดาห์ ถ้าน้ำหนักไม่ลงใน 2–3 สัปดาห์ค่อยปรับลดอีกเล็กน้อย',
        ]
      : p.goal === 'gain'
        ? [
            `เวทเทรนนิ่ง ${strengthDays}–4 วัน/สัปดาห์ เน้นท่าหลัก เช่น สควอต วิดพื้น ดึงข้อ`,
            `คาร์ดิโอเบา ๆ วันละ ${minutesPerSession} นาที ${exerciseDays} วัน/สัปดาห์ เช่น เดินเร็ว (≈${burn('brisk_walk')} kcal)`,
            'กินโปรตีนให้ถึงราว 1.6 กรัมต่อน้ำหนักตัว 1 กก. ต่อวัน',
          ]
        : [
            `ออกกำลังระดับปานกลาง ${exerciseDays} วัน/สัปดาห์ วันละ ${minutesPerSession} นาที เช่น เดินเร็ว (≈${burn('brisk_walk')} kcal) หรือว่ายน้ำ (≈${burn('swim')} kcal)`,
            `เวทเทรนนิ่ง ${strengthDays} วัน/สัปดาห์`,
          ]

  return {
    bmr: rest,
    tdee,
    calories,
    calorieFloorApplied: raw < floor,
    water: roundTo(p.weightKg * 33, 50),
    bmi,
    bmiLabel: bmiLabel(bmi),
    weeklyExerciseMinutes: weekly,
    exerciseDays,
    minutesPerSession,
    strengthDays,
    plan,
  }
}
