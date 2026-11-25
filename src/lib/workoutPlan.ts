import type { ExerciseEntry, PlanMove, WorkoutPlan } from '@/types'
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

/**
 * Estimated minutes for a Workout Plan: every set's work time plus the rest
 * after it, without a rest after the plan's last set, rounded up.
 */
export function planMinutes(plan: WorkoutPlan): number {
  let seconds = 0
  for (const m of plan.moves) {
    const perSet = getMove(m.moveId)?.countMode === 'seconds' ? m.count : m.count * SECONDS_PER_REP
    seconds += m.sets * (perSet + m.restSeconds)
  }
  const last = plan.moves[plan.moves.length - 1]
  if (last && last.sets > 0) seconds -= last.restSeconds
  return seconds > 0 ? Math.ceil(seconds / 60) : 0
}

/**
 * A new Workout Plan like a logged Workout Session: same Session Type, Moves,
 * sets and count. A Session doesn't keep rest, so each Move rests as it
 * recommends. Moves no longer in the library are left out; null when nothing
 * is left to repeat (a quick log has no Moves).
 */
export function planFromSession(entry: ExerciseEntry): WorkoutPlan | null {
  const moves: PlanMove[] = []
  for (const m of entry.moves ?? []) {
    const move = getMove(m.moveId)
    if (move) moves.push({ moveId: m.moveId, sets: m.sets, count: m.count, restSeconds: move.recommended.restSeconds })
  }
  return moves.length > 0 ? { activity: entry.activity, moves } : null
}
