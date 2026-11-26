import { describe, expect, it } from 'vitest'
import { FOCUS_GROUPS, getMove, type MoveLevel, type TrainingFocus } from './moves'
import { checklistSections, planMinutes } from './workoutPlan'
import {
  BUILDER_EQUIPMENT,
  buildPlanSections,
  buildWorkoutPlan,
  profileGoal,
  type BuilderEquipment,
  type PlanGoal,
} from './workoutBuilder'

const BODY_GOALS = [
  { goal: 'lose', activity: 'hiit', sets: 3, reps: 15, rest: 30 },
  { goal: 'maintain', activity: 'weights', sets: 3, reps: 12, rest: 60 },
  { goal: 'gain', activity: 'weights', sets: 4, reps: 10, rest: 90 },
] as const
const FOCUSES: TrainingFocus[] = ['full', 'upper', 'lower', 'core', 'cardio']
const LENGTHS = [15, 30, 45]
const LEVELS: MoveLevel[] = ['beginner', 'intermediate']
const EQUIPMENTS: BuilderEquipment[] = ['bodyweight', 'dumbbell']

describe('buildWorkoutPlan for every body goal × focus × time × level × equipment', () => {
  for (const g of BODY_GOALS)
    for (const focus of FOCUSES)
      for (const minutes of LENGTHS)
        for (const level of LEVELS)
          for (const equipment of EQUIPMENTS) {
            const choices = { goal: g.goal as PlanGoal, focus, minutes, level, equipment }
            it(`${g.goal} / ${focus} / ${minutes} min / ${level} / ${equipment}`, () => {
              const built = buildPlanSections(choices)
              expect(built.activity).toBe(g.activity)
              expect(built.warmUp.length).toBeGreaterThan(0)
              expect(built.coolDown.length).toBeGreaterThan(0)
              expect(built.main.length).toBeGreaterThanOrEqual(4)
              expect(built.main.length).toBeLessThanOrEqual(6)
              expect(new Set(built.main.map((m) => m.moveId)).size).toBe(built.main.length)

              for (const m of built.main) {
                const move = getMove(m.moveId)!
                expect(FOCUS_GROUPS[focus]).toContain(move.group)
                if (level === 'beginner') expect(move.level).toBe('beginner')
                if (equipment === 'bodyweight') expect(move.equipment).toBe('bodyweight')
                expect(m.restSeconds).toBe(g.rest)
                expect(m.sets).toBeGreaterThanOrEqual(1)
                expect(m.sets).toBeLessThanOrEqual(g.sets)
                if (move.countMode === 'reps') expect(m.count).toBe(g.reps)
              }

              const plan = buildWorkoutPlan(choices)
              expect(plan.activity).toBe(g.activity)
              expect(plan.moves).toEqual([...built.warmUp, ...built.main, ...built.coolDown])
              expect(plan.format).toBe(g.goal === 'lose' ? 'circuit' : 'straight')
              expect(planMinutes(plan)).toBeLessThanOrEqual(minutes)
              expect(buildWorkoutPlan(choices)).toEqual(plan)
            })
          }
})

describe('buildWorkoutPlan for stretching, every focus × time × level', () => {
  for (const focus of FOCUSES)
    for (const minutes of LENGTHS)
      for (const level of LEVELS) {
        const choices = { goal: 'stretch' as PlanGoal, focus, minutes, level, equipment: 'bodyweight' as const }
        it(`stretch / ${focus} / ${minutes} min / ${level}`, () => {
          const built = buildPlanSections(choices)
          expect(built.activity).toBe('yoga')
          expect(built.warmUp.length).toBeGreaterThan(0)
          expect(built.coolDown.length).toBeGreaterThan(0)
          expect(built.warmUp.every((m) => getMove(m.moveId)?.warmUp)).toBe(true)
          expect(built.coolDown.every((m) => getMove(m.moveId)?.coolDown)).toBe(true)
          expect(built.main.length).toBeGreaterThanOrEqual(4)
          expect(built.main.length).toBeLessThanOrEqual(6)
          expect(built.main.every((m) => getMove(m.moveId)?.group === 'stretch')).toBe(true)

          const plan = buildWorkoutPlan(choices)
          expect(plan.format).toBe('straight')
          expect(new Set(plan.moves.map((m) => m.moveId)).size).toBe(plan.moves.length)
          expect(planMinutes(plan)).toBeLessThanOrEqual(minutes)
          expect(buildWorkoutPlan(choices)).toEqual(plan)
        })
      }
})

describe('BUILDER_EQUIPMENT', () => {
  it('offers no equipment or dumbbells, using the library labels', () => {
    expect(BUILDER_EQUIPMENT).toEqual([
      { value: 'bodyweight', label: 'ไม่มีอุปกรณ์' },
      { value: 'dumbbell', label: 'ดัมเบล' },
    ])
  })
})

describe('buildPlanSections equipment', () => {
  it('uses dumbbell Moves when dumbbells are available', () => {
    const built = buildPlanSections({ goal: 'gain', focus: 'upper', minutes: 45, level: 'intermediate', equipment: 'dumbbell' })
    expect(built.main.some((m) => getMove(m.moveId)!.equipment === 'dumbbell')).toBe(true)
  })
})

describe('profileGoal', () => {
  it("starts the builder on the profile's body goal", () => {
    expect(profileGoal({ goal: 'gain' })).toBe('gain')
  })

  it('leaves the goal for the user to pick when there is no profile', () => {
    expect(profileGoal(null)).toBeNull()
  })
})

describe('buildPlanSections', () => {
  it('keeps the goal sets on every main Move when the time allows', () => {
    const built = buildPlanSections({ goal: 'gain', focus: 'lower', minutes: 45, level: 'beginner', equipment: 'dumbbell' })
    expect(built.main.map((m) => m.sets)).toEqual(built.main.map(() => 4))
  })

  it('drops sets only when even 4 Moves would not fit, never below 4 Moves', () => {
    const built = buildPlanSections({ goal: 'gain', focus: 'lower', minutes: 15, level: 'beginner', equipment: 'dumbbell' })
    expect(built.main.length).toBeGreaterThanOrEqual(4)
    expect(built.main[0].sets).toBeLessThan(4)
  })

  it('a full-body plan works the legs, chest, back and core before repeating a body part', () => {
    const built = buildPlanSections({ goal: 'maintain', focus: 'full', minutes: 15, level: 'beginner', equipment: 'dumbbell' })
    const groups = built.main.slice(0, 4).map((m) => getMove(m.moveId)!.group)
    expect(groups).toEqual(['legs', 'chest', 'back', 'core'])
  })

  it('an upper-body plan works chest, back, shoulders and arms', () => {
    const built = buildPlanSections({ goal: 'maintain', focus: 'upper', minutes: 45, level: 'beginner', equipment: 'dumbbell' })
    const groups = new Set(built.main.slice(0, 4).map((m) => getMove(m.moveId)!.group))
    expect(groups).toEqual(new Set(['chest', 'back', 'shoulders', 'arms']))
  })

  it('at intermediate level picks the harder Move of a body part first', () => {
    const built = buildPlanSections({ goal: 'maintain', focus: 'upper', minutes: 45, level: 'intermediate', equipment: 'dumbbell' })
    expect(built.main[0].moveId).toBe('push-up')
  })

  it('maintain: warm-up, then main Moves at 3 × 12 with 60 s rest, then cool-down, logged as weights', () => {
    const built = buildPlanSections({ goal: 'maintain', focus: 'full', minutes: 30, level: 'beginner', equipment: 'dumbbell' })
    expect(built.activity).toBe('weights')
    expect(built.warmUp.length).toBeGreaterThan(0)
    expect(built.coolDown.length).toBeGreaterThan(0)
    expect(built.warmUp.every((m) => getMove(m.moveId)?.warmUp)).toBe(true)
    expect(built.coolDown.every((m) => getMove(m.moveId)?.coolDown)).toBe(true)
    for (const m of built.main) {
      expect(m.sets).toBe(3)
      expect(m.restSeconds).toBe(60)
      if (getMove(m.moveId)?.countMode === 'reps') expect(m.count).toBe(12)
    }
  })

  it('lose: runs the main Moves as a circuit of 3 rounds, warm-up before and cool-down after', () => {
    const plan = buildWorkoutPlan({ goal: 'lose', focus: 'full', minutes: 30, level: 'beginner', equipment: 'bodyweight' })
    const built = buildPlanSections({ goal: 'lose', focus: 'full', minutes: 30, level: 'beginner', equipment: 'bodyweight' })
    const sections = checklistSections(plan)
    const w = built.warmUp.length
    const mainIndexes = built.main.map((_, i) => w + i)

    expect(plan.format).toBe('circuit')
    expect(sections[0]).toEqual({ kind: 'moves', part: 'warmUp', moveIndexes: built.warmUp.map((_, i) => i) })
    expect(sections.at(-1)).toEqual({
      kind: 'moves',
      part: 'coolDown',
      moveIndexes: built.coolDown.map((_, i) => w + built.main.length + i),
    })
    const rounds = sections.filter((s) => s.kind === 'round')
    expect(rounds).toHaveLength(3)
    rounds.forEach((r, i) => {
      expect(r.round).toBe(i + 1)
      expect(r.steps).toEqual(mainIndexes.map((moveIndex) => ({ moveIndex, setIndex: i })))
    })
  })
})
