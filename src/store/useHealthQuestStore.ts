'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  DEFAULT_HEALTH_ACHIEVEMENTS,
  DEFAULT_HEALTH_QUESTS,
} from '@/lib/healthQuestTemplates'
import type {
  HealthAchievement,
  HealthExercise,
  HealthMode,
  HealthQuest,
  HealthSession,
} from '@/types/health'

const STORE_NAME = 'finance-health-quest'
const STORE_VERSION = 2

type FinishSessionPayload = {
  mood?: HealthSession['mood']
  note?: string
}

type HealthQuestState = {
  quests: HealthQuest[]
  sessions: HealthSession[]
  activeSession: HealthSession | null
  xp: number
  streak: number
  achievements: HealthAchievement[]
}

export interface HealthQuestStore extends HealthQuestState {
  startQuest: (questId: string) => void
  startCustomQuest: (quest: HealthQuest) => void
  completeExercise: (exerciseId: string) => void
  skipExercise: (exerciseId: string) => void
  finishSession: (payload?: FinishSessionPayload) => void
  cancelSession: () => void
  getTodaySession: () => HealthSession | undefined
  getTodayCompleted: () => boolean
  recalculateStats: () => void
  unlockAchievements: () => void
}

function cloneExercise(exercise: HealthExercise): HealthExercise {
  return { ...exercise }
}

function cloneQuest(quest: HealthQuest): HealthQuest {
  return {
    ...quest,
    exercises: quest.exercises.map(cloneExercise),
  }
}

function cloneAchievement(achievement: HealthAchievement): HealthAchievement {
  return { ...achievement }
}

function getDefaultState(): HealthQuestState {
  return {
    quests: DEFAULT_HEALTH_QUESTS.map(cloneQuest),
    sessions: [],
    activeSession: null,
    xp: 0,
    streak: 0,
    achievements: DEFAULT_HEALTH_ACHIEVEMENTS.map(cloneAchievement),
  }
}

export function getHealthDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftDateKey(dateKey: string, days: number) {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return getHealthDateKey(date)
}

function diffDays(fromKey: string, toKey: string) {
  const from = parseDateKey(fromKey)
  const to = parseDateKey(toKey)
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createSessionFromQuest(quest: HealthQuest): HealthSession {
  const now = new Date()
  return {
    id: createId('health-session'),
    questId: quest.id,
    title: quest.title,
    date: getHealthDateKey(now),
    startedAt: now.toISOString(),
    durationMin: quest.durationMin,
    exercises: quest.exercises.map(cloneExercise),
    completedExerciseIds: [],
    skippedExerciseIds: [],
    xpEarned: 0,
  }
}

function getFinishedSessions(sessions: HealthSession[]) {
  return sessions.filter((session) => Boolean(session.endedAt))
}

function getCompletedSessions(sessions: HealthSession[]) {
  return getFinishedSessions(sessions).filter((session) => session.xpEarned > 0)
}

function calculateTotalXp(sessions: HealthSession[]) {
  return getFinishedSessions(sessions).reduce((sum, session) => sum + Math.max(0, session.xpEarned), 0)
}

function calculateStreak(sessions: HealthSession[], today = getHealthDateKey()) {
  const completedDays = new Set(getCompletedSessions(sessions).map((session) => session.date))
  if (completedDays.size === 0) return 0

  let cursor = completedDays.has(today) ? today : shiftDateKey(today, -1)
  let streak = 0

  while (completedDays.has(cursor)) {
    streak += 1
    cursor = shiftDateKey(cursor, -1)
  }

  return streak
}

function calculateEarnedXp(session: HealthSession, quest?: HealthQuest) {
  const exerciseCount = session.exercises.length
  if (exerciseCount === 0) return 0

  const completedCount = session.completedExerciseIds.filter((id) =>
    session.exercises.some((exercise) => exercise.id === id)
  ).length

  if (completedCount === 0) return 0

  const reward = quest?.xpReward ?? 0
  return Math.round((reward * completedCount) / exerciseCount)
}

function hasComebackGap(sessions: HealthSession[]) {
  const completedDates = Array.from(
    new Set(getCompletedSessions(sessions).map((session) => session.date))
  ).sort()

  return completedDates.some((dateKey, index) => {
    if (index === 0) return false
    return diffDays(completedDates[index - 1], dateKey) >= 3
  })
}

function getCompletedModes(sessions: HealthSession[], quests: HealthQuest[]) {
  const questMode = new Map<string, HealthMode>()
  quests.forEach((quest) => questMode.set(quest.id, quest.mode))

  return new Set(
    getCompletedSessions(sessions)
      .map((session) => (session.questId ? questMode.get(session.questId) : undefined))
      .filter((mode): mode is HealthMode => Boolean(mode))
  )
}

function mergeAchievementUnlocks(
  achievements: HealthAchievement[],
  sessions: HealthSession[],
  quests: HealthQuest[],
  streak: number,
  now = new Date().toISOString()
) {
  const completedSessions = getCompletedSessions(sessions)
  const completedCount = completedSessions.length
  const completedModes = getCompletedModes(sessions, quests)
  const comebackUnlocked = hasComebackGap(sessions)

  return achievements.map((achievement) => {
    if (achievement.unlocked) return achievement

    const shouldUnlock =
      (achievement.id === 'first-quest' && completedCount >= 1) ||
      (achievement.id === 'three-sessions' && completedCount >= 3) ||
      (achievement.id === 'seven-sessions' && completedCount >= 7) ||
      (achievement.id === 'three-day-streak' && streak >= 3) ||
      (achievement.id === 'try-recovery' && completedModes.has('recovery')) ||
      (achievement.id === 'comeback' && comebackUnlocked)

    return shouldUnlock ? { ...achievement, unlocked: true, unlockedAt: now } : achievement
  })
}

function mergeDefaultAchievements(achievements: unknown) {
  const existing = Array.isArray(achievements)
    ? achievements.filter(isHealthAchievement)
    : []
  const byId = new Map(existing.map((achievement) => [achievement.id, achievement]))

  return DEFAULT_HEALTH_ACHIEVEMENTS.map((template) => {
    const previous = byId.get(template.id)
    return previous?.unlocked
      ? { ...template, unlocked: true, unlockedAt: previous.unlockedAt }
      : { ...template }
  })
}

function deriveState(
  state: Pick<HealthQuestState, 'quests' | 'sessions' | 'achievements' | 'activeSession'>
): HealthQuestState {
  const xp = calculateTotalXp(state.sessions)
  const streak = calculateStreak(state.sessions)
  const achievements = mergeAchievementUnlocks(
    mergeDefaultAchievements(state.achievements),
    state.sessions,
    state.quests,
    streak
  )

  return {
    quests: state.quests,
    sessions: state.sessions,
    activeSession: state.activeSession,
    xp,
    streak,
    achievements,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHealthMode(value: unknown): value is HealthMode {
  return value === 'easy' || value === 'normal' || value === 'strong' || value === 'recovery'
}

function isHealthExercise(value: unknown): value is HealthExercise {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.emoji === 'string' &&
    typeof value.instruction === 'string' &&
    typeof value.targetText === 'string'
  )
}

function isHealthQuest(value: unknown): value is HealthQuest {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    isHealthMode(value.mode) &&
    typeof value.durationMin === 'number' &&
    typeof value.xpReward === 'number' &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isHealthExercise)
  )
}

function isHealthSession(value: unknown): value is HealthSession {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.date === 'string' &&
    typeof value.startedAt === 'string' &&
    typeof value.durationMin === 'number' &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isHealthExercise) &&
    Array.isArray(value.completedExerciseIds) &&
    value.completedExerciseIds.every((id) => typeof id === 'string') &&
    Array.isArray(value.skippedExerciseIds) &&
    value.skippedExerciseIds.every((id) => typeof id === 'string') &&
    typeof value.xpEarned === 'number'
  )
}

function isHealthAchievement(value: unknown): value is HealthAchievement {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.emoji === 'string' &&
    typeof value.unlocked === 'boolean'
  )
}

function migrateHealthState(persistedState: unknown): HealthQuestState {
  const defaults = getDefaultState()
  if (!isRecord(persistedState)) return defaults

  const quests = Array.isArray(persistedState.quests) && persistedState.quests.every(isHealthQuest)
    ? persistedState.quests.map(cloneQuest)
    : defaults.quests

  const sessions = Array.isArray(persistedState.sessions) && persistedState.sessions.every(isHealthSession)
    ? persistedState.sessions.map((session) => ({
        ...session,
        exercises: session.exercises.map(cloneExercise),
        completedExerciseIds: [...session.completedExerciseIds],
        skippedExerciseIds: [...session.skippedExerciseIds],
      }))
    : []

  const activeSession = isHealthSession(persistedState.activeSession)
    ? {
        ...persistedState.activeSession,
        exercises: persistedState.activeSession.exercises.map(cloneExercise),
        completedExerciseIds: [...persistedState.activeSession.completedExerciseIds],
        skippedExerciseIds: [...persistedState.activeSession.skippedExerciseIds],
      }
    : null

  return deriveState({
    quests,
    sessions,
    activeSession,
    achievements: mergeDefaultAchievements(persistedState.achievements),
  })
}

export const useHealthQuestStore = create<HealthQuestStore>()(
  persist(
    (set, get) => ({
      ...getDefaultState(),
      startQuest: (questId) => {
        const quest = get().quests.find((item) => item.id === questId)
        if (!quest) return

        set({ activeSession: createSessionFromQuest(quest) })
      },
      startCustomQuest: (quest) => {
        const nextQuest = cloneQuest(quest)
        set((state) => ({
          quests: [
            nextQuest,
            ...state.quests.filter((item) => item.id !== nextQuest.id),
          ],
          activeSession: createSessionFromQuest(nextQuest),
        }))
      },
      completeExercise: (exerciseId) =>
        set((state) => {
          const session = state.activeSession
          if (!session || !session.exercises.some((exercise) => exercise.id === exerciseId)) {
            return state
          }

          return {
            activeSession: {
              ...session,
              completedExerciseIds: Array.from(new Set([...session.completedExerciseIds, exerciseId])),
              skippedExerciseIds: session.skippedExerciseIds.filter((id) => id !== exerciseId),
            },
          }
        }),
      skipExercise: (exerciseId) =>
        set((state) => {
          const session = state.activeSession
          if (!session || !session.exercises.some((exercise) => exercise.id === exerciseId)) {
            return state
          }

          return {
            activeSession: {
              ...session,
              skippedExerciseIds: Array.from(new Set([...session.skippedExerciseIds, exerciseId])),
              completedExerciseIds: session.completedExerciseIds.filter((id) => id !== exerciseId),
            },
          }
        }),
      finishSession: (payload) => {
        const state = get()
        const session = state.activeSession
        if (!session) return

        const quest = session.questId
          ? state.quests.find((item) => item.id === session.questId)
          : undefined
        const finishedSession: HealthSession = {
          ...session,
          endedAt: new Date().toISOString(),
          xpEarned: calculateEarnedXp(session, quest),
          mood: payload?.mood,
          note: payload?.note?.trim() || undefined,
        }
        const sessions = [finishedSession, ...state.sessions]
        const next = deriveState({
          quests: state.quests,
          sessions,
          activeSession: null,
          achievements: state.achievements,
        })

        set(next)
      },
      cancelSession: () => set({ activeSession: null }),
      getTodaySession: () => {
        const today = getHealthDateKey()
        return get().sessions.find((session) => session.date === today && Boolean(session.endedAt))
      },
      getTodayCompleted: () => {
        const today = getHealthDateKey()
        return get().sessions.some(
          (session) => session.date === today && Boolean(session.endedAt) && session.xpEarned > 0
        )
      },
      recalculateStats: () => {
        const state = get()
        set(deriveState(state))
      },
      unlockAchievements: () => {
        const state = get()
        const achievements = mergeAchievementUnlocks(
          mergeDefaultAchievements(state.achievements),
          state.sessions,
          state.quests,
          state.streak
        )
        set({ achievements })
      },
    }),
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      migrate: (persistedState) => migrateHealthState(persistedState),
      partialize: (state) => ({
        quests: state.quests,
        sessions: state.sessions,
        activeSession: state.activeSession,
        xp: state.xp,
        streak: state.streak,
        achievements: state.achievements,
      }),
    }
  )
)
