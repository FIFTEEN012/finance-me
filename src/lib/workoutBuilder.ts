import type { BodyGoal, HealthProfile, PlanMove, WorkoutPlan } from '@/types'
import {
  coolDownMoves,
  filterMoves,
  movesForFocus,
  warmUpMoves,
  type Move,
  type MoveGroup,
  type MoveLevel,
  type TrainingFocus,
} from '@/lib/moves'
import { planMinutes, planMoveFor } from '@/lib/workoutPlan'

/** What a built Workout Plan is for: a body goal from the profile, or stretching. */
export type PlanGoal = BodyGoal | 'stretch'

export const PLAN_GOALS: { value: PlanGoal; label: string }[] = [
  { value: 'lose', label: 'ลดน้ำหนัก' },
  { value: 'maintain', label: 'รักษาน้ำหนัก' },
  { value: 'gain', label: 'เพิ่มกล้ามเนื้อ' },
  { value: 'stretch', label: 'ยืดเหยียด' },
]

/** Minutes the builder offers. */
export const PLAN_LENGTHS = [15, 30, 45] as const

export interface BuilderChoices {
  goal: PlanGoal
  focus: TrainingFocus
  /** Minutes the user has; the plan never takes longer. */
  minutes: number
  level: MoveLevel
}

/** A built Workout Plan, split into its warm-up, main Moves and cool-down. */
export interface PlanSections {
  activity: string
  warmUp: PlanMove[]
  main: PlanMove[]
  coolDown: PlanMove[]
}

interface Prescription {
  activity: string
  sets: number
  reps: number
  restSeconds: number
}

const PRESCRIPTIONS: Record<BodyGoal, Prescription> = {
  lose: { activity: 'hiit', sets: 3, reps: 15, restSeconds: 30 },
  maintain: { activity: 'weights', sets: 3, reps: 12, restSeconds: 60 },
  gain: { activity: 'weights', sets: 4, reps: 10, restSeconds: 90 },
}

function prescribe(move: Move, p: Prescription, sets: number): PlanMove {
  return {
    moveId: move.id,
    sets,
    // Held / timed Moves keep their own seconds; only reps follow the goal.
    count: move.countMode === 'reps' ? p.reps : move.recommended.count,
    restSeconds: p.restSeconds,
  }
}

/** Body parts a plan takes a Move from, in turn, so a short plan still covers the big ones. */
const GROUP_TURNS: MoveGroup[] = ['legs', 'chest', 'back', 'core', 'shoulders', 'arms', 'cardio']

/**
 * The focus's Moves in the order a plan uses them: one from each body part in
 * turn, the harder Move of a body part first, otherwise library order.
 */
function orderedCandidates(focus: TrainingFocus, level: MoveLevel): Move[] {
  const byGroup = GROUP_TURNS.map((g) =>
    movesForFocus(focus, level)
      .filter((m) => m.group === g)
      .sort((a, b) => Number(b.level === 'intermediate') - Number(a.level === 'intermediate')),
  )
  const ordered: Move[] = []
  for (let i = 0; byGroup.some((list) => i < list.length); i++) {
    for (const list of byGroup) if (i < list.length) ordered.push(list[i])
  }
  return ordered
}

export const MIN_MAIN_MOVES = 4
export const MAX_MAIN_MOVES = 6

/** Stretching: each stretch held twice with a short pause, logged as yoga. */
const STRETCH = { activity: 'yoga', sets: 2, restSeconds: 15 }

/**
 * A stretching plan: one warm-up Move, the other stretches as the main Moves,
 * and one cool-down Move. Stretches suit any focus and level, so neither
 * narrows the choice.
 */
function buildStretchSections(minutes: number): PlanSections {
  const stretches = filterMoves({ group: 'stretch' })
  const warm = warmUpMoves()[0]
  const cool = coolDownMoves().at(-1)!
  const mainMoves = stretches.filter((m) => m !== warm && m !== cool).slice(0, MAX_MAIN_MOVES)
  const attempt = (sets: number): PlanSections => ({
    activity: STRETCH.activity,
    warmUp: [planMoveFor(warm)],
    main: mainMoves.map((m) => ({ moveId: m.id, sets, count: m.recommended.count, restSeconds: STRETCH.restSeconds })),
    coolDown: [planMoveFor(cool)],
  })
  for (let sets = STRETCH.sets; sets > 1; sets--) {
    const built = attempt(sets)
    if (planMinutes(flatten(built)) <= minutes) return built
  }
  return attempt(1)
}

export function buildPlanSections(choices: BuilderChoices): PlanSections {
  if (choices.goal === 'stretch') return buildStretchSections(choices.minutes)
  const p = PRESCRIPTIONS[choices.goal]
  const warm = warmUpMoves()
  const warmUp = warm.map(planMoveFor)
  const coolDown = coolDownMoves()
    .filter((m) => !warm.includes(m))
    .map(planMoveFor)
  const candidates = orderedCandidates(choices.focus, choices.level)

  const attempt = (sets: number, n: number): PlanSections => ({
    activity: p.activity,
    warmUp,
    main: candidates.slice(0, n).map((m) => prescribe(m, p, sets)),
    coolDown,
  })
  // Keep the goal's sets and fit as many Moves as the time allows; only when
  // even the minimum number of Moves doesn't fit, take sets off every Move.
  for (let sets = p.sets; sets >= 1; sets--) {
    for (let n = Math.min(MAX_MAIN_MOVES, candidates.length); n >= MIN_MAIN_MOVES; n--) {
      const built = attempt(sets, n)
      if (planMinutes(flatten(built)) <= choices.minutes) return built
    }
  }
  return attempt(1, MIN_MAIN_MOVES)
}

function flatten({ activity, warmUp, main, coolDown }: PlanSections): WorkoutPlan {
  return { activity, moves: [...warmUp, ...main, ...coolDown] }
}

/** The goal the builder starts on: the profile's body goal, or none (the user picks) without a profile. */
export function profileGoal(profile: Pick<HealthProfile, 'goal'> | null): PlanGoal | null {
  return profile?.goal ?? null
}

/** The built plan as the editor takes it: warm-up → main Moves → cool-down. */
export function buildWorkoutPlan(choices: BuilderChoices): WorkoutPlan {
  return flatten(buildPlanSections(choices))
}
