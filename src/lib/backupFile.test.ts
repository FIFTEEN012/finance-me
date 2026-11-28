import { describe, expect, it } from 'vitest'
import { countItems } from './backupFile'

const move = { moveId: 'squat', sets: 3, count: 12, restSeconds: 60 }

describe('countItems', () => {
  it('counts the Moves of the active Workout Plan and the draft', () => {
    const stats = countItems({
      'finance-workout-plan': {
        state: {
          active: { plan: { activity: 'weights', moves: [move, move, move] }, startedAt: '', done: [] },
          draft: { activity: 'weights', moves: [move, move] },
        },
      },
    })
    expect(stats.workoutPlan).toBe(5)
  })

  it('counts no Workout Plan Moves when there is no active plan or draft', () => {
    expect(countItems({ 'finance-workout-plan': { state: { active: null, draft: null } } }).workoutPlan).toBe(0)
    expect(countItems({}).workoutPlan).toBe(0)
  })
})
