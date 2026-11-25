import { describe, expect, it } from 'vitest'
import { MOVES } from './moves'
import { checklistSections, planFormat, planFromSession, planMinutes } from './workoutPlan'
import type { ExerciseEntry, WorkoutPlan } from '@/types'

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

// arm-circles is a warm-up Move, chest-stretch a cool-down Move, both 'stretch'.
const circuit: WorkoutPlan = {
  activity: 'hiit',
  format: 'circuit',
  moves: [
    { moveId: 'arm-circles', sets: 1, count: 30, restSeconds: 0 },
    { moveId: 'push-up', sets: 3, count: 15, restSeconds: 30 },
    { moveId: 'forearm-plank', sets: 2, count: 30, restSeconds: 30 },
    { moveId: 'chest-stretch', sets: 1, count: 30, restSeconds: 0 },
  ],
}

describe('planFormat', () => {
  it('reads a plan saved before formats existed as straight sets', () => {
    expect(planFormat({ activity: 'weights', moves: [] })).toBe('straight')
    expect(planFormat(circuit)).toBe('circuit')
  })
})

describe('checklistSections', () => {
  it('lists a straight plan as each Move with all its sets, in plan order', () => {
    expect(checklistSections({ ...circuit, format: undefined })).toEqual([
      { kind: 'moves', moveIndexes: [0, 1, 2, 3] },
    ])
  })

  it('runs a circuit as rounds of the main Moves, set n in round n, warm-up and cool-down once outside them', () => {
    expect(checklistSections(circuit)).toEqual([
      { kind: 'moves', part: 'warmUp', moveIndexes: [0] },
      { kind: 'round', round: 1, rounds: 3, steps: [{ moveIndex: 1, setIndex: 0 }, { moveIndex: 2, setIndex: 0 }] },
      { kind: 'round', round: 2, rounds: 3, steps: [{ moveIndex: 1, setIndex: 1 }, { moveIndex: 2, setIndex: 1 }] },
      // forearm-plank has only 2 sets, so it sits out round 3
      { kind: 'round', round: 3, rounds: 3, steps: [{ moveIndex: 1, setIndex: 2 }] },
      { kind: 'moves', part: 'coolDown', moveIndexes: [3] },
    ])
  })

  it('leaves out an empty warm-up or cool-down', () => {
    const noExtras: WorkoutPlan = { ...circuit, moves: circuit.moves.slice(1, 3) }
    expect(checklistSections(noExtras).map((s) => s.kind)).toEqual(['round', 'round', 'round'])
  })

  it('runs every Move in the rounds when a circuit has only warm-up-type Moves', () => {
    const onlyStretches: WorkoutPlan = { ...circuit, moves: [circuit.moves[0], circuit.moves[0]] }
    expect(checklistSections(onlyStretches)).toEqual([
      { kind: 'round', round: 1, rounds: 1, steps: [{ moveIndex: 0, setIndex: 0 }, { moveIndex: 1, setIndex: 0 }] },
    ])
  })
})

describe('planMinutes for a circuit', () => {
  it('takes the same work and rest as straight sets, without the rest after the very last set', () => {
    // arm-circles 30 s · push-up 3 × (45 s + 30 s) = 225 s · plank 2 × (30 s + 30 s) = 120 s
    // chest-stretch 30 s, the last set done, so no rest after it to take off: 405 s = 7 min
    expect(planMinutes(circuit)).toBe(7)
    expect(planMinutes(circuit)).toBe(planMinutes({ ...circuit, format: 'straight' }))
  })

  it('takes off the rest of the Move done last in the final round when there is no cool-down', () => {
    // Straight sets end on the plank; the circuit ends on push-up, alone in round 3.
    const plan: WorkoutPlan = {
      ...circuit,
      moves: [
        { moveId: 'push-up', sets: 3, count: 15, restSeconds: 90 },
        { moveId: 'forearm-plank', sets: 2, count: 30, restSeconds: 30 },
      ],
    }
    // push-up 3 × (45 + 90) = 405 s + plank 120 s = 525 s; circuit −90 s = 435 s → 8 min; straight −30 s = 495 s → 9 min
    expect(planMinutes(plan)).toBe(8)
    expect(planMinutes({ ...plan, format: 'straight' })).toBe(9)
  })
})
