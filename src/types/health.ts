export type HealthMode = 'easy' | 'normal' | 'strong' | 'recovery'

export type HealthMood = 'great' | 'ok' | 'tired'

export type HealthIntensity = 'easy' | 'normal' | 'hard'

export type HealthExerciseDifficulty = 'beginner' | 'intermediate'

export type HealthRunType = 'easy' | 'long' | 'tempo' | 'interval' | 'treadmill' | 'recovery'

export type HealthCatalogExercise = {
  id: string
  sourceId: string
  nameTh: string
  nameEn: string
  bodyPart: string
  equipment: string
  target: string
  imageUrl: string
  gifUrl: string
  instructionsTh: string[]
  instructionsEn: string[]
  attribution: string
  difficulty: HealthExerciseDifficulty
}

export type HealthWorkoutLog = {
  id: string
  exerciseId: string
  exerciseNameSnapshot: string
  date: string
  sets?: number
  reps?: number
  durationMin?: number
  intensity: HealthIntensity
  mood?: HealthMood
  note?: string
  xpEarned: number
  createdAt: string
  updatedAt: string
}

export type HealthRunningLog = {
  id: string
  date: string
  distanceKm: number
  durationSec: number
  paceSecPerKm: number
  runType: HealthRunType
  intensity: HealthIntensity
  mood?: HealthMood
  note?: string
  xpEarned: number
  createdAt: string
  updatedAt: string
}

export type HealthRunningStats = {
  weeklyGoalKm: number
  weeklyDistanceKm: number
  weeklyProgressPercent: number
  totalRuns: number
  totalDistanceKm: number
  averagePaceSecPerKm?: number
  longestRunKm?: number
}

export type HealthExercise = {
  id: string
  name: string
  emoji: string
  instruction: string
  targetText: string
  durationSec?: number
  reps?: number
}

export type HealthQuest = {
  id: string
  title: string
  description: string
  mode: HealthMode
  durationMin: number
  xpReward: number
  exercises: HealthExercise[]
}

export type HealthSession = {
  id: string
  questId?: string
  title: string
  date: string
  startedAt: string
  endedAt?: string
  durationMin: number
  exercises: HealthExercise[]
  completedExerciseIds: string[]
  skippedExerciseIds: string[]
  xpEarned: number
  mood?: HealthMood
  note?: string
}

export type HealthAchievement = {
  id: string
  title: string
  description: string
  emoji: string
  unlocked: boolean
  unlockedAt?: string
}
