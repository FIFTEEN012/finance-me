import { describe, expect, it } from 'vitest'
import { MOVES } from './moves'
import { planMinutes } from './workoutPlan'

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
