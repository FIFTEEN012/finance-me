'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type {
  HealthAchievement,
  HealthIntensity,
  HealthMood,
  HealthRunningLog,
  HealthRunningStats,
  HealthRunType,
  HealthSession,
  HealthWorkoutLog,
} from '@/types/health'

const STORE_NAME = 'finance-health-quest'
const STORE_VERSION = 4
const DEFAULT_WEEKLY_RUNNING_GOAL_KM = 20

const WORKOUT_ACHIEVEMENTS: HealthAchievement[] = [
  {
    id: 'first-quest',
    title: 'บันทึกแรก',
    description: 'บันทึกการออกกำลังกายครั้งแรก',
    emoji: '🌱',
    unlocked: false,
  },
  {
    id: 'three-sessions',
    title: 'ครบ 3 ครั้ง',
    description: 'สะสม workout logs ที่มี EXP ครบ 3 ครั้ง',
    emoji: '✨',
    unlocked: false,
  },
  {
    id: 'seven-sessions',
    title: 'ครบ 7 ครั้ง',
    description: 'สะสม workout logs ที่มี EXP ครบ 7 ครั้ง',
    emoji: '🏅',
    unlocked: false,
  },
  {
    id: 'three-day-streak',
    title: 'ต่อเนื่อง 3 วัน',
    description: 'บันทึกการออกกำลังกายต่อเนื่อง 3 วัน',
    emoji: '🔥',
    unlocked: false,
  },
  {
    id: 'try-recovery',
    title: 'วันเบาก็ยังมา',
    description: 'บันทึก workout ความหนักเบาอย่างน้อย 1 ครั้ง',
    emoji: '🌿',
    unlocked: false,
  },
  {
    id: 'comeback',
    title: 'กลับมาแล้ว',
    description: 'กลับมาบันทึกหลังเว้นไปอย่างน้อย 3 วัน',
    emoji: '💫',
    unlocked: false,
  },
]

type LogPayload = {
  exerciseId: string
  exerciseNameSnapshot: string
  date: string
  sets?: number
  reps?: number
  durationMin?: number
  intensity: HealthIntensity
  mood?: HealthMood
  note?: string
}

type RunLogPayload = {
  date: string
  distanceKm: number
  durationSec: number
  runType: HealthRunType
  intensity: HealthIntensity
  mood?: HealthMood
  note?: string
}

type HealthLogState = {
  logs: HealthWorkoutLog[]
  runningLogs: HealthRunningLog[]
  weeklyRunningGoalKm: number
  xp: number
  streak: number
  achievements: HealthAchievement[]
}

type CompletedHealthEntry = {
  date: string
  intensity: HealthIntensity
  xpEarned: number
}

export interface HealthQuestStore extends HealthLogState {
  addLog: (payload: LogPayload) => void
  updateLog: (id: string, payload: LogPayload) => void
  deleteLog: (id: string) => void
  addRunLog: (payload: RunLogPayload) => void
  updateRunLog: (id: string, payload: RunLogPayload) => void
  deleteRunLog: (id: string) => void
  getLogsByMonth: (month: number, year: number) => HealthWorkoutLog[]
  getRunLogsByWeek: (dateKey?: string) => HealthRunningLog[]
  getRunningStats: (dateKey?: string) => HealthRunningStats
  getTodayCompleted: () => boolean
  recalculateStats: () => void
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

function normalizePositiveNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

function getDefaultAchievements() {
  return WORKOUT_ACHIEVEMENTS.map((achievement) => ({ ...achievement }))
}

export function calculateWorkoutXp(
  payload: Pick<LogPayload, 'sets' | 'reps' | 'durationMin' | 'intensity'>,
  isFirstLogToday: boolean
) {
  const sets = normalizePositiveNumber(payload.sets) ?? 1
  const reps = normalizePositiveNumber(payload.reps)
  const durationMin = normalizePositiveNumber(payload.durationMin)
  const volume = reps ? Math.min(sets * reps, 120) / 10 : 0
  const duration = durationMin ? Math.min(durationMin, 60) * 2 : 0
  const multiplier = payload.intensity === 'hard' ? 1.5 : payload.intensity === 'normal' ? 1.2 : 1
  const firstLogTodayBonus = isFirstLogToday ? 10 : 0

  return Math.round((10 + volume + duration) * multiplier) + firstLogTodayBonus
}

function calculateTotalXp(logs: CompletedHealthEntry[]) {
  return logs.reduce((sum, log) => sum + Math.max(0, log.xpEarned), 0)
}

export function calculateRunningXp(
  payload: Pick<RunLogPayload, 'distanceKm' | 'durationSec' | 'intensity'>,
  isFirstLogToday: boolean
) {
  const distance = normalizePositiveNumber(payload.distanceKm) ?? 0
  const durationMin = (normalizePositiveNumber(payload.durationSec) ?? 0) / 60
  const distanceXp = Math.min(distance, 42) * 12
  const durationXp = Math.min(durationMin, 180) * 0.75
  const multiplier = payload.intensity === 'hard' ? 1.4 : payload.intensity === 'normal' ? 1.15 : 1
  const firstLogTodayBonus = isFirstLogToday ? 10 : 0

  return Math.max(5, Math.round((distanceXp + durationXp) * multiplier) + firstLogTodayBonus)
}

function calculateAveragePaceSecPerKm(runs: HealthRunningLog[]) {
  const totalDistance = runs.reduce((sum, run) => sum + run.distanceKm, 0)
  if (totalDistance <= 0) return undefined

  const totalDuration = runs.reduce((sum, run) => sum + run.durationSec, 0)
  return Math.round(totalDuration / totalDistance)
}

function deriveRunningStats(runningLogs: HealthRunningLog[], weeklyGoalKm = DEFAULT_WEEKLY_RUNNING_GOAL_KM): HealthRunningStats {
  const sortedRuns = [...runningLogs].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt.localeCompare(a.createdAt)
  })
  const nowKey = getHealthDateKey()
  const weekStart = shiftDateKey(nowKey, -6)
  const weeklyRuns = sortedRuns.filter((run) => run.date >= weekStart && run.date <= nowKey)
  const weeklyDistanceKm = weeklyRuns.reduce((sum, run) => sum + run.distanceKm, 0)
  const totalDistanceKm = sortedRuns.reduce((sum, run) => sum + run.distanceKm, 0)

  return {
    weeklyGoalKm,
    weeklyDistanceKm,
    weeklyProgressPercent: weeklyGoalKm > 0 ? Math.min(100, (weeklyDistanceKm / weeklyGoalKm) * 100) : 0,
    totalRuns: sortedRuns.length,
    totalDistanceKm,
    averagePaceSecPerKm: calculateAveragePaceSecPerKm(sortedRuns),
    longestRunKm: sortedRuns.reduce((max, run) => Math.max(max, run.distanceKm), 0) || undefined,
  }
}

function calculateStreak(logs: CompletedHealthEntry[], today = getHealthDateKey()) {
  const completedDays = new Set(logs.filter((log) => log.xpEarned > 0).map((log) => log.date))
  if (completedDays.size === 0) return 0

  let cursor = completedDays.has(today) ? today : shiftDateKey(today, -1)
  let streak = 0

  while (completedDays.has(cursor)) {
    streak += 1
    cursor = shiftDateKey(cursor, -1)
  }

  return streak
}

function hasComebackGap(logs: CompletedHealthEntry[]) {
  const completedDates = Array.from(new Set(logs.map((log) => log.date))).sort()

  return completedDates.some((dateKey, index) => {
    if (index === 0) return false
    return diffDays(completedDates[index - 1], dateKey) >= 3
  })
}

function mergeAchievementUnlocks(
  previousAchievements: HealthAchievement[],
  logs: CompletedHealthEntry[],
  streak: number,
  now = new Date().toISOString()
) {
  const previousById = new Map(previousAchievements.map((achievement) => [achievement.id, achievement]))
  const completedCount = logs.filter((log) => log.xpEarned > 0).length
  const comebackUnlocked = hasComebackGap(logs)

  return getDefaultAchievements().map((achievement) => {
    const previous = previousById.get(achievement.id)
    const shouldUnlock =
      (achievement.id === 'first-quest' && completedCount >= 1) ||
      (achievement.id === 'three-sessions' && completedCount >= 3) ||
      (achievement.id === 'seven-sessions' && completedCount >= 7) ||
      (achievement.id === 'three-day-streak' && streak >= 3) ||
      (achievement.id === 'try-recovery' && logs.some((log) => log.intensity === 'easy')) ||
      (achievement.id === 'comeback' && comebackUnlocked)

    if (!shouldUnlock) return achievement

    return {
      ...achievement,
      unlocked: true,
      unlockedAt: previous?.unlockedAt ?? now,
    }
  })
}

function deriveState(
  logs: HealthWorkoutLog[],
  achievements: HealthAchievement[],
  runningLogs: HealthRunningLog[] = [],
  weeklyRunningGoalKm = DEFAULT_WEEKLY_RUNNING_GOAL_KM
): HealthLogState {
  const sortedLogs = [...logs].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt.localeCompare(a.createdAt)
  })
  const sortedRuns = [...runningLogs].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.createdAt.localeCompare(a.createdAt)
  })
  const completedEntries: CompletedHealthEntry[] = [...sortedLogs, ...sortedRuns]
  const streak = calculateStreak(completedEntries)

  return {
    logs: sortedLogs,
    runningLogs: sortedRuns,
    weeklyRunningGoalKm,
    xp: calculateTotalXp(completedEntries),
    streak,
    achievements: mergeAchievementUnlocks(achievements, completedEntries, streak),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHealthIntensity(value: unknown): value is HealthIntensity {
  return value === 'easy' || value === 'normal' || value === 'hard'
}

function isHealthMood(value: unknown): value is HealthMood {
  return value === 'great' || value === 'ok' || value === 'tired'
}

function isHealthRunType(value: unknown): value is HealthRunType {
  return (
    value === 'easy' ||
    value === 'long' ||
    value === 'tempo' ||
    value === 'interval' ||
    value === 'treadmill' ||
    value === 'recovery'
  )
}

function isHealthWorkoutLog(value: unknown): value is HealthWorkoutLog {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    typeof value.exerciseId === 'string' &&
    typeof value.exerciseNameSnapshot === 'string' &&
    typeof value.date === 'string' &&
    isHealthIntensity(value.intensity) &&
    typeof value.xpEarned === 'number' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isHealthRunningLog(value: unknown): value is HealthRunningLog {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    typeof value.distanceKm === 'number' &&
    typeof value.durationSec === 'number' &&
    typeof value.paceSecPerKm === 'number' &&
    isHealthRunType(value.runType) &&
    isHealthIntensity(value.intensity) &&
    typeof value.xpEarned === 'number' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isHealthSession(value: unknown): value is HealthSession {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.date === 'string' &&
    typeof value.startedAt === 'string' &&
    Array.isArray(value.completedExerciseIds) &&
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

function isWorkoutLog(value: HealthWorkoutLog | undefined): value is HealthWorkoutLog {
  return Boolean(value)
}

function sanitizeLog(log: HealthWorkoutLog): HealthWorkoutLog {
  return {
    ...log,
    sets: normalizePositiveNumber(log.sets),
    reps: normalizePositiveNumber(log.reps),
    durationMin: normalizePositiveNumber(log.durationMin),
    mood: isHealthMood(log.mood) ? log.mood : undefined,
    note: log.note?.trim() || undefined,
  }
}

function sanitizeRunLog(log: HealthRunningLog): HealthRunningLog | undefined {
  const distanceKm = normalizePositiveNumber(log.distanceKm)
  const durationSec = normalizePositiveNumber(log.durationSec)
  if (!distanceKm || !durationSec) return undefined

  return {
    ...log,
    distanceKm,
    durationSec,
    paceSecPerKm: Math.round(durationSec / distanceKm),
    runType: isHealthRunType(log.runType) ? log.runType : 'easy',
    intensity: isHealthIntensity(log.intensity) ? log.intensity : 'normal',
    mood: isHealthMood(log.mood) ? log.mood : undefined,
    note: log.note?.trim() || undefined,
  }
}

function migrateSessionToLog(session: HealthSession): HealthWorkoutLog | undefined {
  if (!session.endedAt || session.xpEarned <= 0) return undefined

  const completedCount = session.completedExerciseIds.length
  return {
    id: session.id,
    exerciseId: session.questId ?? 'legacy-health-session',
    exerciseNameSnapshot: session.title,
    date: session.date,
    sets: completedCount > 0 ? 1 : undefined,
    reps: completedCount > 0 ? completedCount : undefined,
    durationMin: session.durationMin,
    intensity: 'normal',
    mood: session.mood,
    note: session.note,
    xpEarned: session.xpEarned,
    createdAt: session.startedAt,
    updatedAt: session.endedAt,
  }
}

function migrateHealthState(persistedState: unknown): HealthLogState {
  if (!isRecord(persistedState)) {
    return deriveState([], getDefaultAchievements())
  }

  const persistedAchievements = Array.isArray(persistedState.achievements)
    ? persistedState.achievements.filter(isHealthAchievement)
    : getDefaultAchievements()

  const logs = Array.isArray(persistedState.logs)
    ? persistedState.logs.filter(isHealthWorkoutLog).map(sanitizeLog)
    : Array.isArray(persistedState.sessions)
      ? persistedState.sessions.filter(isHealthSession).map(migrateSessionToLog).filter(isWorkoutLog)
      : []

  const runningLogs = Array.isArray(persistedState.runningLogs)
    ? persistedState.runningLogs.filter(isHealthRunningLog).map(sanitizeRunLog).filter((log): log is HealthRunningLog => Boolean(log))
    : []

  return deriveState(
    logs,
    persistedAchievements,
    runningLogs,
    normalizePositiveNumber(persistedState.weeklyRunningGoalKm) ?? DEFAULT_WEEKLY_RUNNING_GOAL_KM
  )
}

function buildLog(
  payload: LogPayload,
  existingLogs: HealthWorkoutLog[],
  existingRuns: HealthRunningLog[],
  existing?: HealthWorkoutLog
) {
  const now = new Date().toISOString()
  const isFirstLogToday =
    !existingLogs.some((log) => log.date === payload.date && log.xpEarned > 0 && log.id !== existing?.id) &&
    !existingRuns.some((log) => log.date === payload.date && log.xpEarned > 0)

  return {
    id: existing?.id ?? createId('health-log'),
    exerciseId: payload.exerciseId,
    exerciseNameSnapshot: payload.exerciseNameSnapshot,
    date: payload.date,
    sets: normalizePositiveNumber(payload.sets),
    reps: normalizePositiveNumber(payload.reps),
    durationMin: normalizePositiveNumber(payload.durationMin),
    intensity: payload.intensity,
    mood: payload.mood,
    note: payload.note?.trim() || undefined,
    xpEarned: calculateWorkoutXp(payload, isFirstLogToday),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

function buildRunLog(
  payload: RunLogPayload,
  existingLogs: HealthWorkoutLog[],
  existingRuns: HealthRunningLog[],
  existing?: HealthRunningLog
) {
  const now = new Date().toISOString()
  const distanceKm = normalizePositiveNumber(payload.distanceKm) ?? 0
  const durationSec = normalizePositiveNumber(payload.durationSec) ?? 0
  const isFirstLogToday =
    !existingLogs.some((log) => log.date === payload.date && log.xpEarned > 0) &&
    !existingRuns.some((log) => log.date === payload.date && log.xpEarned > 0 && log.id !== existing?.id)

  return {
    id: existing?.id ?? createId('health-run'),
    date: payload.date,
    distanceKm,
    durationSec,
    paceSecPerKm: Math.round(durationSec / Math.max(distanceKm, 0.01)),
    runType: payload.runType,
    intensity: payload.intensity,
    mood: payload.mood,
    note: payload.note?.trim() || undefined,
    xpEarned: calculateRunningXp(payload, isFirstLogToday),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export const useHealthQuestStore = create<HealthQuestStore>()(
  persist(
    (set, get) => ({
      ...deriveState([], getDefaultAchievements()),
      addLog: (payload) => {
        const state = get()
        const nextLogs = [buildLog(payload, state.logs, state.runningLogs), ...state.logs]
        set(deriveState(nextLogs, state.achievements, state.runningLogs, state.weeklyRunningGoalKm))
      },
      updateLog: (id, payload) => {
        const state = get()
        const existing = state.logs.find((log) => log.id === id)
        if (!existing) return

        const nextLogs = state.logs.map((log) =>
          log.id === id ? buildLog(payload, state.logs, state.runningLogs, existing) : log
        )
        set(deriveState(nextLogs, state.achievements, state.runningLogs, state.weeklyRunningGoalKm))
      },
      deleteLog: (id) => {
        const state = get()
        set(deriveState(
          state.logs.filter((log) => log.id !== id),
          state.achievements,
          state.runningLogs,
          state.weeklyRunningGoalKm
        ))
      },
      addRunLog: (payload) => {
        const state = get()
        const runningLogs = [buildRunLog(payload, state.logs, state.runningLogs), ...state.runningLogs]
        set(deriveState(state.logs, state.achievements, runningLogs, state.weeklyRunningGoalKm))
      },
      updateRunLog: (id, payload) => {
        const state = get()
        const existing = state.runningLogs.find((log) => log.id === id)
        if (!existing) return

        const updated = buildRunLog(payload, state.logs, state.runningLogs, existing)
        const runningLogs = state.runningLogs.map((log) => (log.id === id ? updated : log))
        set(deriveState(state.logs, state.achievements, runningLogs, state.weeklyRunningGoalKm))
      },
      deleteRunLog: (id) => {
        const state = get()
        set(deriveState(
          state.logs,
          state.achievements,
          state.runningLogs.filter((log) => log.id !== id),
          state.weeklyRunningGoalKm
        ))
      },
      getLogsByMonth: (month, year) =>
        get().logs.filter((log) => {
          const date = parseDateKey(log.date)
          return date.getMonth() + 1 === month && date.getFullYear() === year
        }),
      getRunLogsByWeek: (dateKey = getHealthDateKey()) =>
        get().runningLogs.filter((log) => log.date >= shiftDateKey(dateKey, -6) && log.date <= dateKey),
      getRunningStats: (dateKey = getHealthDateKey()) =>
        deriveRunningStats(get().runningLogs.filter((log) => log.date <= dateKey), get().weeklyRunningGoalKm),
      getTodayCompleted: () => {
        const today = getHealthDateKey()
        return (
          get().logs.some((log) => log.date === today && log.xpEarned > 0) ||
          get().runningLogs.some((log) => log.date === today && log.xpEarned > 0)
        )
      },
      recalculateStats: () => {
        const state = get()
        set(deriveState(state.logs, state.achievements, state.runningLogs, state.weeklyRunningGoalKm))
      },
    }),
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      migrate: (persistedState) => migrateHealthState(persistedState),
      partialize: (state) => ({
        logs: state.logs,
        runningLogs: state.runningLogs,
        weeklyRunningGoalKm: state.weeklyRunningGoalKm,
        xp: state.xp,
        streak: state.streak,
        achievements: state.achievements,
      }),
    }
  )
)
