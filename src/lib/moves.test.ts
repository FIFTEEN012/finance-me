import { describe, expect, it } from 'vitest'
import {
  MOVES,
  MOVE_GROUPS,
  coolDownMoves,
  filterMoves,
  formatRecommendation,
  getMove,
  movesForFocus,
  warmUpMoves,
  type MoveLevel,
  type TrainingFocus,
} from './moves'

describe('MOVES library', () => {
  it('has about 30 Moves', () => {
    expect(MOVES.length).toBeGreaterThanOrEqual(28)
    expect(MOVES.length).toBeLessThanOrEqual(40)
  })

  it('gives every Move a unique, stable kebab-case id', () => {
    const ids = MOVES.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('gives every Move a Thai name, 3–5 steps, mistakes and cautions', () => {
    for (const m of MOVES) {
      expect(m.name, m.id).toMatch(/[฀-๿]/)
      expect(m.steps.length, m.id).toBeGreaterThanOrEqual(3)
      expect(m.steps.length, m.id).toBeLessThanOrEqual(5)
      expect(m.mistakes.length, m.id).toBeGreaterThanOrEqual(1)
      expect(m.cautions.length, m.id).toBeGreaterThanOrEqual(1)
      for (const text of [...m.steps, ...m.mistakes, ...m.cautions]) {
        expect(text.trim().length, m.id).toBeGreaterThan(0)
      }
    }
  })
})

describe('Move fields', () => {
  const groups = MOVE_GROUPS.map((g) => g.value)

  it('puts every Move in one of the eight groups', () => {
    expect(groups).toEqual(['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'stretch'])
    for (const m of MOVES) expect(groups, m.id).toContain(m.group)
    for (const g of groups) expect(MOVES.some((m) => m.group === g), g).toBe(true)
  })

  it('gives every Move a known equipment, level and counting mode', () => {
    for (const m of MOVES) {
      expect(['bodyweight', 'dumbbell'], m.id).toContain(m.equipment)
      expect(['beginner', 'intermediate'], m.id).toContain(m.level)
      expect(['reps', 'seconds'], m.id).toContain(m.countMode)
    }
  })

  it('gives every Move a sensible recommendation', () => {
    for (const m of MOVES) {
      const { sets, count, restSeconds } = m.recommended
      expect(Number.isInteger(sets) && sets >= 1 && sets <= 5, m.id).toBe(true)
      expect(Number.isInteger(count) && count >= 1, m.id).toBe(true)
      expect(count, m.id).toBeLessThanOrEqual(m.countMode === 'reps' ? 30 : 120)
      expect(restSeconds >= 0 && restSeconds <= 180, m.id).toBe(true)
    }
  })

  it('cites ACE, NSCA or NHS for every Move', () => {
    for (const m of MOVES) {
      expect(['ACE', 'NSCA', 'NHS'], m.id).toContain(m.source.org)
      expect(m.source.title.length, m.id).toBeGreaterThan(0)
      if (m.source.url) expect(m.source.url, m.id).toMatch(/^https:\/\//)
    }
  })
})

describe('warm-up and cool-down Moves', () => {
  it('has warm-up and cool-down Moves, all in the stretch / warm-up group', () => {
    expect(warmUpMoves().length).toBeGreaterThanOrEqual(2)
    expect(coolDownMoves().length).toBeGreaterThanOrEqual(2)
    for (const m of [...warmUpMoves(), ...coolDownMoves()]) expect(m.group, m.id).toBe('stretch')
  })

  it('marks only stretch Moves as warm-up or cool-down', () => {
    for (const m of MOVES.filter((x) => x.group !== 'stretch')) {
      expect(m.warmUp || m.coolDown, m.id).toBe(false)
    }
  })
})

describe('movesForFocus', () => {
  const focuses: TrainingFocus[] = ['full', 'upper', 'lower', 'core', 'cardio']
  const levels: MoveLevel[] = ['beginner', 'intermediate']

  it('has at least 4 Moves for every focus at every level, even with no equipment', () => {
    for (const focus of focuses) {
      for (const level of levels) {
        expect(movesForFocus(focus, level).length, `${focus}/${level}`).toBeGreaterThanOrEqual(4)
        expect(movesForFocus(focus, level, ['bodyweight']).length, `${focus}/${level}/bodyweight`).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('draws upper-body Moves only from chest, back, shoulders and arms', () => {
    const groups = new Set(movesForFocus('upper', 'intermediate').map((m) => m.group))
    expect([...groups].sort()).toEqual(['arms', 'back', 'chest', 'shoulders'])
  })

  it('never includes stretch Moves as main Moves', () => {
    expect(movesForFocus('full', 'intermediate').some((m) => m.group === 'stretch')).toBe(false)
  })

  it('keeps beginners to beginner Moves and lets intermediates use both', () => {
    expect(movesForFocus('lower', 'beginner').every((m) => m.level === 'beginner')).toBe(true)
    const intermediate = movesForFocus('lower', 'intermediate')
    expect(intermediate.some((m) => m.level === 'beginner')).toBe(true)
    expect(intermediate.some((m) => m.level === 'intermediate')).toBe(true)
  })

  it('leaves out dumbbell Moves when only bodyweight is available', () => {
    const ids = movesForFocus('upper', 'beginner', ['bodyweight']).map((m) => m.id)
    expect(ids).toContain('wall-push-up')
    expect(ids).not.toContain('dumbbell-shoulder-press')
  })
})

describe('getMove', () => {
  it('finds a Move by id', () => {
    expect(getMove('push-up')?.name).toBe('วิดพื้น')
  })

  it('returns undefined for an unknown id', () => {
    expect(getMove('burpee-deluxe')).toBeUndefined()
  })
})

describe('filterMoves', () => {
  it('returns every Move with no filters', () => {
    expect(filterMoves({})).toHaveLength(MOVES.length)
  })

  it('combines group, equipment and level', () => {
    expect(filterMoves({ group: 'chest', equipment: 'bodyweight', level: 'beginner' }).map((m) => m.id)).toEqual([
      'wall-push-up',
      'knee-push-up',
    ])
  })

  it('filters by exact level', () => {
    const intermediate = filterMoves({ level: 'intermediate' })
    expect(intermediate.length).toBeGreaterThan(0)
    expect(intermediate.every((m) => m.level === 'intermediate')).toBe(true)
  })
})

describe('formatRecommendation', () => {
  it('describes a reps Move in Thai', () => {
    expect(formatRecommendation({ countMode: 'reps', recommended: { sets: 3, count: 12, restSeconds: 60 } })).toBe(
      '3 เซ็ต × 12 ครั้ง · พัก 60 วินาที',
    )
  })

  it('describes a timed Move in seconds', () => {
    expect(formatRecommendation({ countMode: 'seconds', recommended: { sets: 2, count: 20, restSeconds: 45 } })).toBe(
      '2 เซ็ต × 20 วินาที · พัก 45 วินาที',
    )
  })

  it('leaves out rest when there is none', () => {
    expect(formatRecommendation({ countMode: 'seconds', recommended: { sets: 1, count: 30, restSeconds: 0 } })).toBe(
      '1 เซ็ต × 30 วินาที',
    )
  })
})
