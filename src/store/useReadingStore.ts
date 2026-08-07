'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type {
  ReadingAchievement,
  ReadingBook,
  ReadingCategory,
  ReadingGoal,
  ReadingGoalType,
  ReadingRecallCard,
  ReadingRecallCardStatus,
  ReadingRecallRating,
  ReadingRecallReview,
  ReadingSession,
  ReadingStatus,
} from '@/types/reading'

const STORE_NAME = 'finance-reading'
const STORE_VERSION = 2
const BOOK_FINISH_BONUS_XP = 100

type StoredReadingBook = ReadingBook & {
  baselinePage?: number
}

type ReadingState = {
  books: StoredReadingBook[]
  sessions: ReadingSession[]
  goals: ReadingGoal[]
  xp: number
  streak: number
  achievements: ReadingAchievement[]
  recallCards: ReadingRecallCard[]
  recallReviews: ReadingRecallReview[]
}

type AddBookInput = Omit<ReadingBook, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
  createdAt?: string
  updatedAt?: string
}

type UpdateBookInput = Partial<Omit<ReadingBook, 'id' | 'createdAt'>> & {
  id: string
}

type AddSessionInput = Omit<ReadingSession, 'id' | 'date' | 'startedAt' | 'createdAt' | 'xpEarned'> & {
  id?: string
  date?: string
  startedAt?: string
  createdAt?: string
}

type UpdateSessionInput = Partial<Omit<ReadingSession, 'id' | 'createdAt'>> & {
  id: string
}

type SetGoalInput = Omit<ReadingGoal, 'createdAt'> & {
  createdAt?: string
}

type AddRecallCardInput = Omit<
  ReadingRecallCard,
  | 'id'
  | 'status'
  | 'dueDate'
  | 'lastReviewedAt'
  | 'reviewCount'
  | 'ease'
  | 'intervalDays'
  | 'lapses'
  | 'createdAt'
  | 'updatedAt'
> & {
  id?: string
  status?: ReadingRecallCardStatus
  dueDate?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

type UpdateRecallCardInput = Partial<Omit<ReadingRecallCard, 'id' | 'createdAt'>> & {
  id: string
}

type MonthlyReadingStats = {
  totalMinutes: number
  totalPages: number
  totalXp: number
  finishedBooks: number
  sessionCount: number
}

type RecallStats = {
  totalCards: number
  activeCards: number
  dueToday: number
  reviewedToday: number
  rememberedRate: number
}

export interface ReadingStore extends ReadingState {
  addBook: (book: AddBookInput) => void
  updateBook: (book: UpdateBookInput) => void
  deleteBook: (bookId: string) => void
  addSession: (session: AddSessionInput) => void
  updateSession: (session: UpdateSessionInput) => void
  deleteSession: (sessionId: string) => void
  setGoal: (goal: SetGoalInput) => void
  addRecallCard: (card: AddRecallCardInput) => void
  updateRecallCard: (card: UpdateRecallCardInput) => void
  deleteRecallCard: (cardId: string) => void
  reviewRecallCard: (cardId: string, rating: ReadingRecallRating) => void
  getTodaySessions: () => ReadingSession[]
  getBookProgress: (bookId: string) => number
  getFinishedBooks: () => ReadingBook[]
  getMonthlyStats: (date?: Date) => MonthlyReadingStats
  getDueRecallCards: (date?: Date) => ReadingRecallCard[]
  getRecallStats: (date?: Date) => RecallStats
  recalculateStats: () => void
  unlockAchievements: () => void
}

const DEFAULT_ACHIEVEMENTS: ReadingAchievement[] = [
  {
    id: 'first-page',
    title: 'First Page',
    description: 'บันทึกการอ่านครั้งแรก',
    emoji: '📖',
    unlocked: false,
  },
  {
    id: 'three-day-streak',
    title: '3 Day Streak',
    description: 'อ่านต่อเนื่อง 3 วัน',
    emoji: '🔥',
    unlocked: false,
  },
  {
    id: 'book-finisher',
    title: 'Book Finisher',
    description: 'อ่านจบ 1 เล่ม',
    emoji: '🏁',
    unlocked: false,
  },
  {
    id: 'investor-reader',
    title: 'Investor Reader',
    description: 'อ่านหมวดการเงินหรือการลงทุนอย่างน้อย 3 sessions',
    emoji: '📈',
    unlocked: false,
  },
  {
    id: 'deep-reader',
    title: 'Deep Reader',
    description: 'อ่านสะสมครบ 300 นาที',
    emoji: '🧠',
    unlocked: false,
  },
]

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getReadingDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function shiftDateKey(dateKey: string, days: number) {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return getReadingDateKey(date)
}

function getDateKeyFromIso(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return getReadingDateKey()
  return getReadingDateKey(date)
}

function getNextRecallInterval(card: ReadingRecallCard, rating: ReadingRecallRating) {
  if (rating === 'forgot') return 1
  if (rating === 'partial') return card.intervalDays <= 1 ? 2 : 3

  const rememberedSteps = [1, 3, 7, 14, 30]
  const nextStep = rememberedSteps.find((days) => days > card.intervalDays)
  return nextStep ?? rememberedSteps[rememberedSteps.length - 1]
}

function getNextEase(card: ReadingRecallCard, rating: ReadingRecallRating) {
  if (rating === 'forgot') return Math.max(1.3, card.ease - 0.2)
  if (rating === 'partial') return Math.max(1.3, card.ease - 0.05)
  return Math.min(2.8, card.ease + 0.05)
}

function calculateSessionXp(durationMin: number, pagesRead: number) {
  return Math.max(0, durationMin) * 2 + Math.max(0, pagesRead)
}

function getDefaultAchievements() {
  return DEFAULT_ACHIEVEMENTS.map((achievement) => ({ ...achievement }))
}

function getDefaultState(): ReadingState {
  return {
    books: [],
    sessions: [],
    goals: [],
    xp: 0,
    streak: 0,
    achievements: getDefaultAchievements(),
    recallCards: [],
    recallReviews: [],
  }
}

function mergeAchievements(achievements: unknown) {
  const previous = Array.isArray(achievements)
    ? achievements.filter(isReadingAchievement)
    : []
  const byId = new Map(previous.map((achievement) => [achievement.id, achievement]))

  return getDefaultAchievements().map((achievement) => {
    const match = byId.get(achievement.id)
    return match?.unlocked
      ? { ...achievement, unlocked: true, unlockedAt: match.unlockedAt }
      : achievement
  })
}

function cloneBook(book: StoredReadingBook): StoredReadingBook {
  return { ...book }
}

function cloneSession(session: ReadingSession): ReadingSession {
  return { ...session }
}

function cloneGoal(goal: ReadingGoal): ReadingGoal {
  return { ...goal }
}

function cloneRecallCard(card: ReadingRecallCard): ReadingRecallCard {
  return { ...card, tags: [...card.tags] }
}

function cloneRecallReview(review: ReadingRecallReview): ReadingRecallReview {
  return { ...review }
}

function normalizeTags(tags: unknown) {
  return Array.isArray(tags)
    ? tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : []
}

function sortSessionsAscending(sessions: ReadingSession[]) {
  return [...sessions].sort((left, right) => {
    const leftTs = new Date(left.startedAt || left.createdAt).getTime()
    const rightTs = new Date(right.startedAt || right.createdAt).getTime()
    return leftTs - rightTs
  })
}

function normalizeStoredBook(book: StoredReadingBook): StoredReadingBook {
  const totalPages = Math.max(1, Math.round(book.totalPages))
  const currentPage = clampNumber(Math.round(book.currentPage), 0, totalPages)
  const baselinePage =
    typeof book.baselinePage === 'number'
      ? clampNumber(Math.round(book.baselinePage), 0, totalPages)
      : currentPage

  return {
    ...book,
    totalPages,
    currentPage,
    baselinePage,
    status:
      currentPage >= totalPages
        ? 'finished'
        : currentPage > 0 || book.status === 'reading'
          ? 'reading'
          : 'wishlist',
  }
}

function getBookSessionCountByCategories(
  sessions: ReadingSession[],
  books: StoredReadingBook[],
  categories: ReadingCategory[]
) {
  const bookCategoryMap = new Map(books.map((book) => [book.id, book.category]))
  return sessions.filter((session) => {
    const category = bookCategoryMap.get(session.bookId)
    return Boolean(category && categories.includes(category))
  }).length
}

function calculateStreak(sessions: ReadingSession[], today = getReadingDateKey()) {
  const uniqueDays = new Set(sessions.map((session) => session.date))
  if (uniqueDays.size === 0) return 0

  let cursor = uniqueDays.has(today) ? today : shiftDateKey(today, -1)
  let streak = 0

  while (uniqueDays.has(cursor)) {
    streak += 1
    cursor = shiftDateKey(cursor, -1)
  }

  return streak
}

function unlockReadingAchievements(
  achievements: ReadingAchievement[],
  books: StoredReadingBook[],
  sessions: ReadingSession[],
  streak: number,
  now = new Date().toISOString()
) {
  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMin, 0)
  const finishedBooks = books.filter((book) => book.status === 'finished').length
  const investorSessions = getBookSessionCountByCategories(sessions, books, ['finance', 'investment'])

  return achievements.map((achievement) => {
    if (achievement.unlocked) return achievement

    const shouldUnlock =
      (achievement.id === 'first-page' && sessions.length >= 1) ||
      (achievement.id === 'three-day-streak' && streak >= 3) ||
      (achievement.id === 'book-finisher' && finishedBooks >= 1) ||
      (achievement.id === 'investor-reader' && investorSessions >= 3) ||
      (achievement.id === 'deep-reader' && totalMinutes >= 300)

    return shouldUnlock ? { ...achievement, unlocked: true, unlockedAt: now } : achievement
  })
}

function deriveBooksAndSessions(
  sourceBooks: StoredReadingBook[],
  sourceSessions: ReadingSession[]
) {
  const books = sourceBooks.map(normalizeStoredBook)
  const bookMap = new Map(books.map((book) => [book.id, book]))
  const normalizedSessions: ReadingSession[] = []

  for (const sourceSession of sortSessionsAscending(sourceSessions)) {
    const session = cloneSession(sourceSession)
    const normalizedPagesRead = Math.max(0, Math.round(session.pagesRead))
    const normalizedDuration = Math.max(0, Math.round(session.durationMin))
    const book = bookMap.get(session.bookId)

    if (!book) {
      normalizedSessions.push({
        ...session,
        durationMin: normalizedDuration,
        pagesRead: normalizedPagesRead,
        xpEarned: calculateSessionXp(normalizedDuration, normalizedPagesRead),
      })
      continue
    }

    const fromPage = clampNumber(
      Math.round(session.fromPage ?? book.currentPage),
      0,
      book.totalPages
    )
    const toPage = clampNumber(fromPage + normalizedPagesRead, fromPage, book.totalPages)
    const actualPagesRead = toPage - fromPage
    const xpEarned = calculateSessionXp(normalizedDuration, actualPagesRead)

    if (book.startedAt == null && (actualPagesRead > 0 || normalizedDuration > 0)) {
      book.startedAt = session.startedAt
    }

    book.currentPage = clampNumber(toPage, 0, book.totalPages)
    book.status = book.currentPage >= book.totalPages ? 'finished' : 'reading'
    book.updatedAt = session.createdAt
    if (book.status === 'finished' && !book.finishedAt) {
      book.finishedAt = session.createdAt
    }

    normalizedSessions.push({
      ...session,
      durationMin: normalizedDuration,
      pagesRead: actualPagesRead,
      fromPage,
      toPage,
      xpEarned,
    })
  }

  const finalizedBooks = books.map((book) => {
    const hasSessions = normalizedSessions.some((session) => session.bookId === book.id)
    const currentPage = clampNumber(book.currentPage, 0, book.totalPages)
    const status: ReadingStatus =
      currentPage >= book.totalPages
        ? 'finished'
        : currentPage > 0 || hasSessions || book.status === 'reading'
          ? 'reading'
          : 'wishlist'

    return {
      ...book,
      currentPage,
      status,
      finishedAt: status === 'finished' ? book.finishedAt ?? book.updatedAt : undefined,
      startedAt:
        status === 'wishlist' && !hasSessions && currentPage === 0 ? undefined : book.startedAt,
      baselinePage: clampNumber(book.baselinePage ?? 0, 0, book.totalPages),
    }
  })

  return {
    books: finalizedBooks,
    sessions: normalizedSessions.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ),
  }
}

function deriveState(
  state: Pick<
    ReadingState,
    'books' | 'sessions' | 'goals' | 'achievements' | 'recallCards' | 'recallReviews'
  >
): ReadingState {
  const { books, sessions } = deriveBooksAndSessions(state.books, state.sessions)
  const streak = calculateStreak(sessions)
  const sessionXp = sessions.reduce((sum, session) => sum + session.xpEarned, 0)
  const finishedBooks = books.filter((book) => book.status === 'finished').length
  const xp = sessionXp + finishedBooks * BOOK_FINISH_BONUS_XP
  const achievements = unlockReadingAchievements(
    mergeAchievements(state.achievements),
    books,
    sessions,
    streak
  )

  return {
    books,
    sessions,
    goals: state.goals.map(cloneGoal),
    xp,
    streak,
    achievements,
    recallCards: state.recallCards.map(cloneRecallCard),
    recallReviews: state.recallReviews.map(cloneRecallReview),
  }
}

function getMonthlyStatsFromState(
  sessions: ReadingSession[],
  books: StoredReadingBook[],
  date = new Date()
): MonthlyReadingStats {
  const month = date.getMonth()
  const year = date.getFullYear()
  const monthlySessions = sessions.filter((session) => {
    const sessionDate = parseDateKey(session.date)
    return sessionDate.getMonth() === month && sessionDate.getFullYear() === year
  })

  const totalMinutes = monthlySessions.reduce((sum, session) => sum + session.durationMin, 0)
  const totalPages = monthlySessions.reduce((sum, session) => sum + session.pagesRead, 0)
  const totalXp = monthlySessions.reduce((sum, session) => sum + session.xpEarned, 0)
  const finishedBooks = books.filter((book) => {
    if (!book.finishedAt) return false
    const finishedDate = new Date(book.finishedAt)
    return finishedDate.getMonth() === month && finishedDate.getFullYear() === year
  }).length

  return {
    totalMinutes,
    totalPages,
    totalXp,
    finishedBooks,
    sessionCount: monthlySessions.length,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isReadingCategory(value: unknown): value is ReadingCategory {
  return (
    value === 'finance' ||
    value === 'investment' ||
    value === 'self_development' ||
    value === 'technology' ||
    value === 'education' ||
    value === 'other'
  )
}

function isReadingStatus(value: unknown): value is ReadingStatus {
  return value === 'wishlist' || value === 'reading' || value === 'finished'
}

function isReadingGoalType(value: unknown): value is ReadingGoalType {
  return value === 'daily_minutes' || value === 'daily_pages' || value === 'monthly_books'
}

function isReadingRecallCardStatus(value: unknown): value is ReadingRecallCardStatus {
  return value === 'active' || value === 'archived'
}

function isReadingRecallRating(value: unknown): value is ReadingRecallRating {
  return value === 'forgot' || value === 'partial' || value === 'remembered'
}

function isReadingBook(value: unknown): value is StoredReadingBook {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.author === 'string' &&
    isReadingCategory(value.category) &&
    typeof value.totalPages === 'number' &&
    typeof value.currentPage === 'number' &&
    isReadingStatus(value.status) &&
    typeof value.coverEmoji === 'string' &&
    (value.coverImage === undefined || typeof value.coverImage === 'string') &&
    typeof value.color === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isReadingSession(value: unknown): value is ReadingSession {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.bookId === 'string' &&
    typeof value.date === 'string' &&
    typeof value.startedAt === 'string' &&
    typeof value.durationMin === 'number' &&
    typeof value.pagesRead === 'number' &&
    typeof value.xpEarned === 'number' &&
    typeof value.createdAt === 'string'
  )
}

function isReadingGoal(value: unknown): value is ReadingGoal {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    isReadingGoalType(value.type) &&
    typeof value.target === 'number' &&
    typeof value.active === 'boolean' &&
    typeof value.createdAt === 'string'
  )
}

function isReadingAchievement(value: unknown): value is ReadingAchievement {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.emoji === 'string' &&
    typeof value.unlocked === 'boolean'
  )
}

function isReadingRecallCard(value: unknown): value is ReadingRecallCard {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.bookId === 'string' &&
    (value.sessionId === undefined || typeof value.sessionId === 'string') &&
    typeof value.prompt === 'string' &&
    typeof value.answer === 'string' &&
    (value.sourceText === undefined || typeof value.sourceText === 'string') &&
    (value.note === undefined || typeof value.note === 'string') &&
    Array.isArray(value.tags) &&
    isReadingRecallCardStatus(value.status) &&
    typeof value.dueDate === 'string' &&
    (value.lastReviewedAt === undefined || typeof value.lastReviewedAt === 'string') &&
    typeof value.reviewCount === 'number' &&
    typeof value.ease === 'number' &&
    typeof value.intervalDays === 'number' &&
    typeof value.lapses === 'number' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isReadingRecallReview(value: unknown): value is ReadingRecallReview {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.cardId === 'string' &&
    typeof value.bookId === 'string' &&
    isReadingRecallRating(value.rating) &&
    typeof value.reviewedAt === 'string' &&
    typeof value.previousDueDate === 'string' &&
    typeof value.nextDueDate === 'string' &&
    typeof value.previousIntervalDays === 'number' &&
    typeof value.nextIntervalDays === 'number'
  )
}

function migrateReadingState(persistedState: unknown): ReadingState {
  const defaults = getDefaultState()
  if (!isRecord(persistedState)) return defaults

  const books = Array.isArray(persistedState.books)
    ? persistedState.books.filter(isReadingBook).map(cloneBook)
    : []
  const sessions = Array.isArray(persistedState.sessions)
    ? persistedState.sessions.filter(isReadingSession).map(cloneSession)
    : []
  const goals = Array.isArray(persistedState.goals)
    ? persistedState.goals.filter(isReadingGoal).map(cloneGoal)
    : []
  const recallCards = Array.isArray(persistedState.recallCards)
    ? persistedState.recallCards.filter(isReadingRecallCard).map(cloneRecallCard)
    : []
  const recallReviews = Array.isArray(persistedState.recallReviews)
    ? persistedState.recallReviews.filter(isReadingRecallReview).map(cloneRecallReview)
    : []

  return deriveState({
    books,
    sessions,
    goals,
    achievements: mergeAchievements(persistedState.achievements),
    recallCards,
    recallReviews,
  })
}

export const useReadingStore = create<ReadingStore>()(
  persist(
    (set, get) => ({
      ...getDefaultState(),
      addBook: (input) => {
        const now = new Date().toISOString()
        const totalPages = Math.max(1, Math.round(input.totalPages))
        const currentPage = clampNumber(Math.round(input.currentPage), 0, totalPages)
        const book: StoredReadingBook = {
          ...input,
          id: input.id ?? createId('reading-book'),
          totalPages,
          currentPage,
          status:
            currentPage >= totalPages
              ? 'finished'
              : currentPage > 0 || input.status === 'reading'
                ? 'reading'
                : input.status,
          createdAt: input.createdAt ?? now,
          updatedAt: input.updatedAt ?? now,
          startedAt:
            input.startedAt ??
            (currentPage > 0 || input.status === 'reading' ? now : undefined),
          finishedAt:
            input.finishedAt ??
            (currentPage >= totalPages || input.status === 'finished' ? now : undefined),
          baselinePage: currentPage,
        }

        const state = get()
        set(
          deriveState({
            books: [book, ...state.books],
            sessions: state.sessions,
            goals: state.goals,
            achievements: state.achievements,
            recallCards: state.recallCards,
            recallReviews: state.recallReviews,
          })
        )
      },
      updateBook: (input) => {
        const state = get()
        const current = state.books.find((book) => book.id === input.id)
        if (!current) return

        const nextTotalPages = Math.max(1, Math.round(input.totalPages ?? current.totalPages))
        const sessionPages = state.sessions
          .filter((session) => session.bookId === input.id)
          .reduce((sum, session) => sum + Math.max(0, session.pagesRead), 0)
        const requestedCurrentPage = clampNumber(
          Math.round(input.currentPage ?? current.currentPage),
          0,
          nextTotalPages
        )
        const baselinePage = clampNumber(requestedCurrentPage - sessionPages, 0, nextTotalPages)
        const nextBook: StoredReadingBook = {
          ...current,
          ...input,
          totalPages: nextTotalPages,
          currentPage: requestedCurrentPage,
          baselinePage,
          status:
            requestedCurrentPage >= nextTotalPages
              ? 'finished'
              : requestedCurrentPage > 0 || input.status === 'reading' || current.status === 'reading'
                ? 'reading'
                : input.status ?? current.status,
          startedAt:
            requestedCurrentPage > 0 || input.status === 'reading'
              ? input.startedAt ?? current.startedAt ?? new Date().toISOString()
              : input.startedAt ?? current.startedAt,
          finishedAt:
            requestedCurrentPage >= nextTotalPages
              ? input.finishedAt ?? current.finishedAt ?? new Date().toISOString()
              : input.finishedAt,
          updatedAt: new Date().toISOString(),
        }

        set(
          deriveState({
            books: state.books.map((book) => (book.id === input.id ? nextBook : book)),
            sessions: state.sessions,
            goals: state.goals,
            achievements: state.achievements,
            recallCards: state.recallCards,
            recallReviews: state.recallReviews,
          })
        )
      },
      deleteBook: (bookId) => {
        const state = get()
        set(
          deriveState({
            books: state.books.filter((book) => book.id !== bookId),
            sessions: state.sessions.filter((session) => session.bookId !== bookId),
            goals: state.goals,
            achievements: state.achievements,
            recallCards: state.recallCards.filter((card) => card.bookId !== bookId),
            recallReviews: state.recallReviews.filter((review) => review.bookId !== bookId),
          })
        )
      },
      addSession: (input) => {
        const now = new Date()
        const startedAt = input.startedAt ?? now.toISOString()
        const session: ReadingSession = {
          ...input,
          id: input.id ?? createId('reading-session'),
          date: input.date ?? getReadingDateKey(now),
          startedAt,
          durationMin: Math.max(0, Math.round(input.durationMin)),
          pagesRead: Math.max(0, Math.round(input.pagesRead)),
          xpEarned: 0,
          createdAt: input.createdAt ?? startedAt,
          note: input.note?.trim() || undefined,
          keyTakeaway: input.keyTakeaway?.trim() || undefined,
        }
        const state = get()

        set(
          deriveState({
            books: state.books,
            sessions: [session, ...state.sessions],
            goals: state.goals,
            achievements: state.achievements,
            recallCards: state.recallCards,
            recallReviews: state.recallReviews,
          })
        )
      },
      updateSession: (input) => {
        const state = get()
        const current = state.sessions.find((session) => session.id === input.id)
        if (!current) return

        const nextSession: ReadingSession = {
          ...current,
          ...input,
          durationMin: Math.max(0, Math.round(input.durationMin ?? current.durationMin)),
          pagesRead: Math.max(0, Math.round(input.pagesRead ?? current.pagesRead)),
          note:
            input.note === undefined
              ? current.note
              : input.note.trim() || undefined,
          keyTakeaway:
            input.keyTakeaway === undefined
              ? current.keyTakeaway
              : input.keyTakeaway.trim() || undefined,
          xpEarned: current.xpEarned,
        }

        set(
          deriveState({
            books: state.books,
            sessions: state.sessions.map((session) =>
              session.id === input.id ? nextSession : session
            ),
            goals: state.goals,
            achievements: state.achievements,
            recallCards: state.recallCards,
            recallReviews: state.recallReviews,
          })
        )
      },
      deleteSession: (sessionId) => {
        const state = get()
        set(
          deriveState({
            books: state.books,
            sessions: state.sessions.filter((session) => session.id !== sessionId),
            goals: state.goals,
            achievements: state.achievements,
            recallCards: state.recallCards.map((card) =>
              card.sessionId === sessionId ? { ...card, sessionId: undefined } : card
            ),
            recallReviews: state.recallReviews,
          })
        )
      },
      setGoal: (input) => {
        const state = get()
        const createdAt = input.createdAt ?? new Date().toISOString()
        const nextGoal: ReadingGoal = {
          ...input,
          target: Math.max(1, Math.round(input.target)),
          createdAt,
        }
        const byId = state.goals.find((goal) => goal.id === nextGoal.id)
        const byType = state.goals.find((goal) => goal.type === nextGoal.type)

        const goals = byId
          ? state.goals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal))
          : byType
            ? state.goals.map((goal) => (goal.type === nextGoal.type ? nextGoal : goal))
            : [nextGoal, ...state.goals]

        set({ goals })
      },
      addRecallCard: (input) => {
        const state = get()
        if (!state.books.some((book) => book.id === input.bookId)) return

        const now = new Date().toISOString()
        const card: ReadingRecallCard = {
          ...input,
          id: input.id ?? createId('reading-recall-card'),
          prompt: input.prompt.trim(),
          answer: input.answer.trim(),
          sourceText: input.sourceText?.trim() || undefined,
          note: input.note?.trim() || undefined,
          tags: normalizeTags(input.tags),
          status: input.status ?? 'active',
          dueDate: input.dueDate ?? getReadingDateKey(new Date(now)),
          reviewCount: 0,
          ease: 2.3,
          intervalDays: 0,
          lapses: 0,
          createdAt: input.createdAt ?? now,
          updatedAt: input.updatedAt ?? now,
        }

        if (!card.prompt || !card.answer) return
        set({ recallCards: [card, ...state.recallCards] })
      },
      updateRecallCard: (input) => {
        const state = get()
        const current = state.recallCards.find((card) => card.id === input.id)
        if (!current) return
        if (input.bookId && !state.books.some((book) => book.id === input.bookId)) return

        const nextCard: ReadingRecallCard = {
          ...current,
          ...input,
          prompt: input.prompt === undefined ? current.prompt : input.prompt.trim(),
          answer: input.answer === undefined ? current.answer : input.answer.trim(),
          sourceText:
            input.sourceText === undefined
              ? current.sourceText
              : input.sourceText.trim() || undefined,
          note: input.note === undefined ? current.note : input.note.trim() || undefined,
          tags: input.tags === undefined ? current.tags : normalizeTags(input.tags),
          updatedAt: new Date().toISOString(),
        }

        if (!nextCard.prompt || !nextCard.answer) return
        set({
          recallCards: state.recallCards.map((card) =>
            card.id === input.id ? nextCard : card
          ),
        })
      },
      deleteRecallCard: (cardId) => {
        const state = get()
        set({
          recallCards: state.recallCards.filter((card) => card.id !== cardId),
          recallReviews: state.recallReviews.filter((review) => review.cardId !== cardId),
        })
      },
      reviewRecallCard: (cardId, rating) => {
        const state = get()
        const current = state.recallCards.find((card) => card.id === cardId)
        if (!current || current.status !== 'active') return

        const reviewedAt = new Date().toISOString()
        const previousDueDate = current.dueDate
        const previousIntervalDays = current.intervalDays
        const nextIntervalDays = getNextRecallInterval(current, rating)
        const nextDueDate = shiftDateKey(getDateKeyFromIso(reviewedAt), nextIntervalDays)
        const nextCard: ReadingRecallCard = {
          ...current,
          dueDate: nextDueDate,
          lastReviewedAt: reviewedAt,
          reviewCount: current.reviewCount + 1,
          ease: getNextEase(current, rating),
          intervalDays: nextIntervalDays,
          lapses: rating === 'forgot' ? current.lapses + 1 : current.lapses,
          updatedAt: reviewedAt,
        }
        const review: ReadingRecallReview = {
          id: createId('reading-recall-review'),
          cardId,
          bookId: current.bookId,
          rating,
          reviewedAt,
          previousDueDate,
          nextDueDate,
          previousIntervalDays,
          nextIntervalDays,
        }

        set({
          recallCards: state.recallCards.map((card) =>
            card.id === cardId ? nextCard : card
          ),
          recallReviews: [review, ...state.recallReviews],
        })
      },
      getTodaySessions: () => {
        const today = getReadingDateKey()
        return get().sessions.filter((session) => session.date === today)
      },
      getBookProgress: (bookId) => {
        const book = get().books.find((item) => item.id === bookId)
        if (!book || book.totalPages <= 0) return 0
        return Math.round((book.currentPage / book.totalPages) * 100)
      },
      getFinishedBooks: () => {
        return get().books.filter((book) => book.status === 'finished')
      },
      getMonthlyStats: (date = new Date()) => {
        const state = get()
        return getMonthlyStatsFromState(state.sessions, state.books, date)
      },
      getDueRecallCards: (date = new Date()) => {
        const today = getReadingDateKey(date)
        return get()
          .recallCards.filter((card) => card.status === 'active' && card.dueDate <= today)
          .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      },
      getRecallStats: (date = new Date()) => {
        const state = get()
        const today = getReadingDateKey(date)
        const todayReviews = state.recallReviews.filter(
          (review) => getDateKeyFromIso(review.reviewedAt) === today
        )
        const rememberedToday = todayReviews.filter(
          (review) => review.rating === 'remembered'
        ).length
        const activeCards = state.recallCards.filter((card) => card.status === 'active')

        return {
          totalCards: state.recallCards.length,
          activeCards: activeCards.length,
          dueToday: activeCards.filter((card) => card.dueDate <= today).length,
          reviewedToday: todayReviews.length,
          rememberedRate:
            todayReviews.length === 0
              ? 0
              : Math.round((rememberedToday / todayReviews.length) * 100),
        }
      },
      recalculateStats: () => {
        const state = get()
        set(
          deriveState({
            books: state.books,
            sessions: state.sessions,
            goals: state.goals,
            achievements: state.achievements,
            recallCards: state.recallCards,
            recallReviews: state.recallReviews,
          })
        )
      },
      unlockAchievements: () => {
        const state = get()
        const achievements = unlockReadingAchievements(
          mergeAchievements(state.achievements),
          state.books,
          state.sessions,
          state.streak
        )
        set({ achievements })
      },
    }),
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      migrate: (persistedState) => migrateReadingState(persistedState),
      partialize: (state) => ({
        books: state.books,
        sessions: state.sessions,
        goals: state.goals,
        xp: state.xp,
        streak: state.streak,
        achievements: state.achievements,
        recallCards: state.recallCards,
        recallReviews: state.recallReviews,
      }),
    }
  )
)
