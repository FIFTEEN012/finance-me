export type ReadingCategory =
  | 'finance'
  | 'investment'
  | 'self_development'
  | 'technology'
  | 'education'
  | 'other'

export type ReadingStatus = 'wishlist' | 'reading' | 'finished'

export type ReadingGoalType = 'daily_minutes' | 'daily_pages' | 'monthly_books'

export type ReadingRecallCardStatus = 'active' | 'archived'

export type ReadingRecallRating = 'forgot' | 'partial' | 'remembered'

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

export type ReadingRecallCard = {
  id: string
  bookId: string
  sessionId?: string
  prompt: string
  answer: string
  sourceText?: string
  note?: string
  tags: string[]
  status: ReadingRecallCardStatus
  dueDate: string
  lastReviewedAt?: string
  reviewCount: number
  ease: number
  intervalDays: number
  lapses: number
  createdAt: string
  updatedAt: string
}

export type ReadingRecallReview = {
  id: string
  cardId: string
  bookId: string
  rating: ReadingRecallRating
  reviewedAt: string
  previousDueDate: string
  nextDueDate: string
  previousIntervalDays: number
  nextIntervalDays: number
}
