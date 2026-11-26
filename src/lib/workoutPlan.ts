import type { ExerciseEntry, PlanFormat, PlanMove, WorkoutPlan } from '@/types'
import { getMove, type Move } from '@/lib/moves'

/** A Move added to a plan starts at its recommended sets, reps/seconds and rest. */
export function planMoveFor(move: Move): PlanMove {
  const { sets, count, restSeconds } = move.recommended
  return { moveId: move.id, sets, count, restSeconds }
}

/** Rough time one rep takes, used to turn reps into minutes. */
export const SECONDS_PER_REP = 3

/** Session Type a hand-built Workout Plan is logged as by default. */
export const DEFAULT_PLAN_ACTIVITY = 'weights'

/** A plan's format; plans saved before formats existed are straight sets. */
export function planFormat(plan: WorkoutPlan): PlanFormat {
  return plan.format ?? 'straight'
}

/** One set of one Move: done[moveIndex][setIndex] of an active plan. */
export interface PlanStep {
  moveIndex: number
  setIndex: number
}

/** A stretch of a plan as the checklist shows it, in the order it is done. */
export type ChecklistSection =
  /** Moves done one after another, each with all its sets. */
  | { kind: 'moves'; part?: 'warmUp' | 'coolDown'; moveIndexes: number[] }
  /** One round of a circuit: each main Move with a set left, once. */
  | { kind: 'round'; round: number; rounds: number; steps: PlanStep[] }

/**
 * A circuit's warm-up is its leading run of warm-up Moves and its cool-down
 * the trailing run of cool-down Moves; the Moves between are the rounds. When
 * nothing would be left for the rounds, every Move goes in them.
 */
function circuitParts(plan: WorkoutPlan): { warmUp: number[]; main: number[]; coolDown: number[] } {
  const n = plan.moves.length
  let start = 0
  while (start < n && getMove(plan.moves[start].moveId)?.warmUp) start++
  let end = n
  while (end > start && getMove(plan.moves[end - 1].moveId)?.coolDown) end--
  const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i)
  if (start === end) return { warmUp: [], main: range(0, n), coolDown: [] }
  return { warmUp: range(0, start), main: range(start, end), coolDown: range(end, n) }
}

/**
 * The plan as the checklist runs it. Straight sets: every Move with all its
 * sets. A circuit: the warm-up, then round 1 … N doing set r of every main
 * Move that has one in round r (N = the most sets of any main Move), then the
 * cool-down.
 */
export function checklistSections(plan: WorkoutPlan): ChecklistSection[] {
  if (planFormat(plan) === 'straight') return [{ kind: 'moves', moveIndexes: plan.moves.map((_, i) => i) }]
  const { warmUp, main, coolDown } = circuitParts(plan)
  const rounds = Math.max(0, ...main.map((i) => plan.moves[i].sets))
  const sections: ChecklistSection[] = []
  if (warmUp.length > 0) sections.push({ kind: 'moves', part: 'warmUp', moveIndexes: warmUp })
  for (let r = 0; r < rounds; r++) {
    const steps = main.filter((i) => plan.moves[i].sets > r).map((moveIndex) => ({ moveIndex, setIndex: r }))
    sections.push({ kind: 'round', round: r + 1, rounds, steps })
  }
  if (coolDown.length > 0) sections.push({ kind: 'moves', part: 'coolDown', moveIndexes: coolDown })
  return sections
}

/** Every set of the plan in the order it is done. */
export function planSteps(plan: WorkoutPlan): PlanStep[] {
  return checklistSections(plan).flatMap((section) =>
    section.kind === 'round'
      ? section.steps
      : section.moveIndexes.flatMap((moveIndex) =>
          Array.from({ length: plan.moves[moveIndex].sets }, (_, setIndex) => ({ moveIndex, setIndex })),
        ),
  )
}

/**
 * Estimated minutes for a Workout Plan: every set's work time plus the rest
 * after it, without a rest after the plan's last set (in a circuit, the set
 * done last), rounded up.
 */
export function planMinutes(plan: WorkoutPlan): number {
  const steps = planSteps(plan)
  let seconds = 0
  for (const { moveIndex } of steps) {
    const m = plan.moves[moveIndex]
    const work = getMove(m.moveId)?.countMode === 'seconds' ? m.count : m.count * SECONDS_PER_REP
    seconds += work + m.restSeconds
  }
  const last = steps.at(-1)
  if (last) seconds -= plan.moves[last.moveIndex].restSeconds
  return seconds > 0 ? Math.ceil(seconds / 60) : 0
}

/**
 * A new Workout Plan like a logged Workout Session: same Session Type, plan
 * format, Moves, sets, count and rest. A session logged before rest was kept
 * rests each Move as it recommends; one logged before formats existed comes
 * back as straight sets. Moves no longer in the library are left out; null
 * when nothing is left to repeat (a quick log has no Moves).
 */
export function planFromSession(entry: ExerciseEntry): WorkoutPlan | null {
  const moves: PlanMove[] = []
  for (const m of entry.moves ?? []) {
    const move = getMove(m.moveId)
    if (move) moves.push({ moveId: m.moveId, sets: m.sets, count: m.count, restSeconds: m.restSeconds ?? move.recommended.restSeconds })
  }
  if (moves.length === 0) return null
  return entry.planFormat ? { activity: entry.activity, moves, format: entry.planFormat } : { activity: entry.activity, moves }
}
