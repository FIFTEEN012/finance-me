import { describe, expect, it } from 'vitest'
import {
  bmiLabel,
  bmr,
  burnedOn,
  estimateBurn,
  exerciseWater,
  minutesOn,
  recommend,
  weekMinutes,
} from './fitness'
import type { ExerciseEntry, HealthProfile } from '@/types'

let seq = 0
function ex(date: string, minutes: number, kcal: number): ExerciseEntry {
  seq++
  return { id: `e-${seq}`, date, activity: 'run', name: 'วิ่ง', minutes, kcal, createdAt: `${date}T01:00:00Z` }
}

const man: HealthProfile = {
  sex: 'male',
  age: 30,
  heightCm: 175,
  weightKg: 70,
  activity: 'sedentary',
  goal: 'maintain',
  updatedAt: '2026-11-19T00:00:00Z',
}

describe('estimateBurn', () => {
  it('uses MET × kg × hours', () => {
    // running 8.3 MET, 70 kg, 30 min
    expect(estimateBurn('run', 30, 70)).toBe(291)
    expect(estimateBurn('brisk_walk', 60, 60)).toBe(258)
  })

  it('leaves "other" and invalid input at zero', () => {
    expect(estimateBurn('other', 30, 70)).toBe(0)
    expect(estimateBurn('run', 0, 70)).toBe(0)
    expect(estimateBurn('unknown', 30, 70)).toBe(0)
  })
})

describe('daily and weekly exercise totals', () => {
  const entries = [
    ex('2026-11-16', 30, 250), // Monday
    ex('2026-11-19', 20, 150), // Thursday
    ex('2026-11-19', 40, 300),
    ex('2026-11-22', 15, 100), // Sunday
    ex('2026-11-23', 60, 500), // next Monday
  ]

  it('sums one day', () => {
    expect(minutesOn(entries, '2026-11-19')).toBe(60)
    expect(burnedOn(entries, '2026-11-19')).toBe(450)
  })

  it('sums Monday to Sunday of the week', () => {
    expect(weekMinutes(entries, '2026-11-19')).toBe(105)
    expect(weekMinutes(entries, '2026-11-22')).toBe(105)
    expect(weekMinutes(entries, '2026-11-23')).toBe(60)
  })
})

describe('exerciseWater', () => {
  it('adds about 500 ml per hour in 50 ml steps', () => {
    expect(exerciseWater(0)).toBe(0)
    expect(exerciseWater(60)).toBe(500)
    expect(exerciseWater(30)).toBe(250)
    expect(exerciseWater(45)).toBe(400)
  })
})

describe('bmr', () => {
  it('follows Mifflin–St Jeor', () => {
    expect(bmr(man)).toBe(1649) // 700 + 1093.75 - 150 + 5
    expect(bmr({ ...man, sex: 'female' })).toBe(1483)
  })
})

describe('recommend', () => {
  it('maintains at TDEE rounded to 50, with water at 33 ml/kg', () => {
    const r = recommend(man)
    expect(r.tdee).toBe(1979)
    expect(r.calories).toBe(2000)
    expect(r.water).toBe(2300)
    expect(r.weeklyExerciseMinutes).toBe(150)
    expect(r.minutesPerSession).toBe(30)
    expect(r.calorieFloorApplied).toBe(false)
  })

  it('takes 500 kcal off to lose weight and suggests more exercise', () => {
    const r = recommend({ ...man, goal: 'lose' })
    expect(r.calories).toBe(1500)
    expect(r.weeklyExerciseMinutes).toBe(250)
    expect(r.minutesPerSession).toBe(50)
  })

  it('never goes below the minimum safe intake', () => {
    const small: HealthProfile = { ...man, sex: 'female', age: 60, heightCm: 150, weightKg: 45, goal: 'lose' }
    const r = recommend(small)
    expect(r.calories).toBe(1200)
    expect(r.calorieFloorApplied).toBe(true)
  })

  it('adds a surplus to gain weight', () => {
    expect(recommend({ ...man, goal: 'gain' }).calories).toBe(2300)
  })

  it('scales with daily activity', () => {
    expect(recommend({ ...man, activity: 'very_active' }).tdee).toBe(2845)
  })

  it('reports BMI with Asian cut-offs', () => {
    expect(recommend(man).bmi).toBe(22.9)
    expect(bmiLabel(22.9)).toBe('ปกติ')
    expect(bmiLabel(24)).toBe('น้ำหนักเกิน')
    expect(bmiLabel(17)).toBe('น้ำหนักน้อย')
    expect(bmiLabel(31)).toBe('อ้วนระดับ 2')
  })
})
