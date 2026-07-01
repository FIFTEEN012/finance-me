import type { ExerciseData, Routine, RoutineExercise } from '@/types/workout'

export interface GeneratorInputs {
  goal: 'muscle' | 'loss' | 'strength'
  frequency: 2 | 3 | 4
  equipment: 'bodyweight' | 'dumbbell' | 'full'
  level: 'beginner' | 'intermediate' | 'advanced'
  focus: 'all' | 'upper' | 'lower' | 'abs'
}

const ROUTINE_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#ec4899', '#06b6d4', '#8b5cf6']
const ROUTINE_EMOJIS = ['🏋️', '💪', '🦵', '🏃', '🔥', '⚡', '🎯', '🌟', '🦾', '👊', '🤸', '🧘']

/**
 * Generates workout routines based on user questionnaire inputs
 */
export function generateWorkoutRoutines(
  exercises: ExerciseData[],
  inputs: GeneratorInputs
): Omit<Routine, 'id' | 'createdAt'>[] {
  const { goal, frequency, equipment, level, focus } = inputs

  // 1. Filter exercises by equipment
  let pool = exercises.filter((ex) => {
    const eq = ex.equipment.toLowerCase()
    if (equipment === 'bodyweight') {
      return eq === 'body weight'
    }
    if (equipment === 'dumbbell') {
      return eq === 'body weight' || eq === 'dumbbell'
    }
    return true // Full gym: any equipment
  })

  // 2. Filter exercises by muscle focus
  if (focus !== 'all') {
    pool = pool.filter((ex) => {
      const part = ex.body_part.toLowerCase()
      if (focus === 'upper') {
        return part === 'chest' || part === 'back' || part === 'shoulders' || part === 'upper arms' || part === 'lower arms'
      }
      if (focus === 'lower') {
        return part === 'upper legs' || part === 'lower legs'
      }
      if (focus === 'abs') {
        return part === 'waist'
      }
      return true
    })
  }

  // Fallback if pool is too small
  if (pool.length < 10) {
    pool = exercises
  }

  // Determine number of exercises per routine based on level
  const numExercises = level === 'beginner' ? 4 : level === 'intermediate' ? 5 : 7

  // Determine sets and reps based on goal
  let targetSets = 3
  let targetReps = 10
  if (goal === 'strength') {
    targetSets = 4
    targetReps = 5
  } else if (goal === 'loss') {
    targetSets = 3
    targetReps = 15
  }

  // 3. Create routines based on frequency
  const generated: Omit<Routine, 'id' | 'createdAt'>[] = []

  // Helper to shuffle and pick N exercises from a filtered pool
  const pickExercises = (filterFn: (ex: ExerciseData) => boolean, count: number): RoutineExercise[] => {
    let subPool = pool.filter(filterFn)
    if (subPool.length < count) {
      // Fallback: merge with general pool
      subPool = [...subPool, ...pool.filter(ex => !subPool.includes(ex))]
    }
    // Shuffle
    const shuffled = [...subPool].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count).map((ex) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      targetSets,
      targetReps,
      targetWeight: goal === 'strength' && equipment !== 'bodyweight' ? 10 : undefined // default initial weight for strength
    }))
  }

  if (frequency === 2) {
    // Full Body A & Full Body B
    generated.push({
      name: 'AI: Full Body A (ทั่วร่าง A)',
      emoji: '⚡',
      color: ROUTINE_COLORS[0],
      exercises: pickExercises(
        (ex) =>
          ex.body_part === 'chest' ||
          ex.body_part === 'upper legs' ||
          ex.body_part === 'back',
        numExercises
      ),
    })
    generated.push({
      name: 'AI: Full Body B (ทั่วร่าง B)',
      emoji: '🔥',
      color: ROUTINE_COLORS[1],
      exercises: pickExercises(
        (ex) =>
          ex.body_part === 'shoulders' ||
          ex.body_part === 'waist' ||
          ex.body_part === 'upper arms',
        numExercises
      ),
    })
  } else if (frequency === 3) {
    // Push / Pull / Legs
    generated.push({
      name: 'AI: Push Day (อก/ไหล่/หลังแขน)',
      emoji: '💪',
      color: ROUTINE_COLORS[4],
      exercises: pickExercises(
        (ex) =>
          ex.body_part === 'chest' ||
          ex.body_part === 'shoulders' ||
          ex.target === 'triceps',
        numExercises
      ),
    })
    generated.push({
      name: 'AI: Pull Day (หลัง/หน้าแขน)',
      emoji: '🏋️',
      color: ROUTINE_COLORS[0],
      exercises: pickExercises(
        (ex) => ex.body_part === 'back' || ex.target === 'biceps',
        numExercises
      ),
    })
    generated.push({
      name: 'AI: Legs & Abs (ขาและหน้าท้อง)',
      emoji: '🦵',
      color: ROUTINE_COLORS[2],
      exercises: pickExercises(
        (ex) =>
          ex.body_part === 'upper legs' ||
          ex.body_part === 'lower legs' ||
          ex.body_part === 'waist',
        numExercises
      ),
    })
  } else if (frequency === 4) {
    // Upper A / Lower A / Upper B / Lower B
    generated.push({
      name: 'AI: Upper Body A (ช่วงบน A)',
      emoji: '💪',
      color: ROUTINE_COLORS[0],
      exercises: pickExercises(
        (ex) => ex.body_part === 'chest' || ex.body_part === 'back',
        numExercises
      ),
    })
    generated.push({
      name: 'AI: Lower Body A (ช่วงล่าง A)',
      emoji: '🦵',
      color: ROUTINE_COLORS[1],
      exercises: pickExercises(
        (ex) => ex.body_part === 'upper legs' || ex.body_part === 'waist',
        numExercises
      ),
    })
    generated.push({
      name: 'AI: Upper Body B (ช่วงบน B)',
      emoji: '⚡',
      color: ROUTINE_COLORS[6],
      exercises: pickExercises(
        (ex) => ex.body_part === 'shoulders' || ex.body_part === 'upper arms',
        numExercises
      ),
    })
    generated.push({
      name: 'AI: Lower Body B (ช่วงล่าง B)',
      emoji: '🔥',
      color: ROUTINE_COLORS[3],
      exercises: pickExercises(
        (ex) => ex.body_part === 'upper legs' || ex.body_part === 'lower legs' || ex.body_part === 'waist',
        numExercises
      ),
    })
  }

  return generated
}
