export type HealthMode = 'easy' | 'normal' | 'strong' | 'recovery'

export type HealthMood = 'great' | 'ok' | 'tired'

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
