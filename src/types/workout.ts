// Exercise types from the exercises-dataset
export interface ExerciseData {
  id: string
  name: string
  category: string        // e.g. "waist", "chest", "back"
  body_part: string       // same as category
  equipment: string       // e.g. "body weight", "dumbbell"
  instructions: {
    en: string
    es?: string
    it?: string
    tr?: string
  }
  instruction_steps: {
    en: string[]
    es?: string[]
    it?: string[]
    tr?: string[]
  }
  muscle_group: string    // e.g. "hip flexors"
  secondary_muscles: string[]
  target: string          // e.g. "abs"
  image: string           // reference path only; media is resolved from the ExerciseDB CDN token
  gif_url: string         // reference path only; media is resolved from the ExerciseDB CDN token
  created_at: string
}

// Workout tracking types
export interface WorkoutSet {
  reps: number
  weight: number   // kg
  done: boolean
}

export interface WorkoutExerciseEntry {
  id: string
  exerciseId: string
  exerciseName: string
  sets: WorkoutSet[]
}

export interface WorkoutSession {
  id: string
  date: string           // YYYY-MM-DD
  startTime?: string     // ISO timestamp
  endTime?: string
  note?: string
  exercises: WorkoutExerciseEntry[]
  createdAt: string
}

// Routine types
export interface RoutineExercise {
  exerciseId: string
  exerciseName: string
  targetSets: number
  targetReps: number
  targetWeight?: number
}

export interface Routine {
  id: string
  name: string
  emoji: string
  color: string
  exercises: RoutineExercise[]
  createdAt: string
}
