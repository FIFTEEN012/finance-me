import { describe, expect, it } from 'vitest'
import { MOVES } from './moves'
import { planFromSession, planMinutes } from './workoutPlan'
import type { ExerciseEntry } from '@/types'

const repsMove = MOVES.find((m) => m.countMode === 'reps')!
const holdMove = MOVES.find((m) => m.countMode === 'seconds')!

describe('planMinutes', () => {
  it('adds work time and the rest between sets, with no rest after the last set', () => {
    // 3 × 10 reps at 3 s a rep = 90 s work + 3 × 60 s rest = 270 s
    // 2 × 30 s hold = 60 s work + 2 × 30 s rest = 120 s
    // minus the final rest (30 s) = 360 s = 6 min
    const minutes = planMinutes({
      activity: 'weights',
      moves: [
        { moveId: repsMove.id, sets: 3, count: 10, restSeconds: 60 },
        { moveId: holdMove.id, sets: 2, count: 30, restSeconds: 30 },
      ],
    })
    expect(minutes).toBe(6)
  })

  it('rounds a part minute up', () => {
    // 1 × 10 reps = 30 s, no rest after the only set
    expect(planMinutes({ activity: 'weights', moves: [{ moveId: repsMove.id, sets: 1, count: 10, restSeconds: 60 }] })).toBe(1)
  })

  it('is 0 for an empty plan', () => {
    expect(planMinutes({ activity: 'weights', moves: [] })).toBe(0)
  })
})

const session = (moves?: ExerciseEntry['moves']): ExerciseEntry => ({
  id: 's1', date: '2026-11-20', activity: 'hiit', name: 'HIIT', minutes: 20, kcal: 150, createdAt: '2026-11-20T08:00:00Z', moves,
})

describe('planFromSession', () => {
  it('copies the Session Type and each Move with its sets and count, resting as the Move recommends', () => {
    const plan = planFromSession(session([
      { moveId: 'push-up', sets: 2, count: 8 },
      { moveId: 'forearm-plank', sets: 1, count: 40 },
    ]))
    // push-up recommends 60 s rest, forearm-plank 45 s
    expect(plan).toEqual({
      activity: 'hiit',
      moves: [
        { moveId: 'push-up', sets: 2, count: 8, restSeconds: 60 },
        { moveId: 'forearm-plank', sets: 1, count: 40, restSeconds: 45 },
      ],
    })
  })

  it('leaves out a Move no longer in the library', () => {
    const plan = planFromSession(session([
      { moveId: 'retired-move', sets: 3, count: 10 },
      { moveId: 'push-up', sets: 2, count: 8 },
    ]))
    expect(plan?.moves.map((m) => m.moveId)).toEqual(['push-up'])
  })

  it('is null for a quick log with no Moves, or when none of its Moves still exist', () => {
    expect(planFromSession(session())).toBeNull()
    expect(planFromSession(session([]))).toBeNull()
    expect(planFromSession(session([{ moveId: 'retired-move', sets: 3, count: 10 }]))).toBeNull()
  })
})
