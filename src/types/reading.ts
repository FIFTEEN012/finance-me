export type ReadingCategory =
  | 'finance'
  | 'investment'
  | 'self_development'
  | 'technology'
  | 'education'
  | 'other'

export type ReadingStatus = 'wishlist' | 'reading' | 'finished'

export type ReadingGoalType = 'daily_minutes' | 'daily_pages' | 'monthly_books'

export type ReadingBook = {
  id: string
  title: string
  author: string
  category: ReadingCategory
  totalPages: number
  currentPage: number
  status: ReadingStatus
  coverEmoji: string
  coverImage?: string
  color: string
  note?: string
  startedAt?: string
  finishedAt?: string
  createdAt: string
  updatedAt: string
}

export type ReadingSession = {
  id: string
  bookId: string
  date: string
  startedAt: string
  durationMin: number
  pagesRead: number
  fromPage?: number
  toPage?: number
  note?: string
  keyTakeaway?: string
  xpEarned: number
  createdAt: string
}

export type ReadingGoal = {
  id: string
  type: ReadingGoalType
  target: number
  active: boolean
  createdAt: string
}

export type ReadingAchievement = {
  id: string
  title: string
  description: string
  emoji: string
  unlocked: boolean
  unlockedAt?: string
}
