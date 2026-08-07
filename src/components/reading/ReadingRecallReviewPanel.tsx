'use client'

import { useState } from 'react'
import { Brain, CheckCircle2, Eye, RotateCcw, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import type { ReadingBook, ReadingRecallCard, ReadingRecallRating } from '@/types/reading'

interface ReadingRecallReviewPanelProps {
  cards: ReadingRecallCard[]
  books: ReadingBook[]
  onReview: (cardId: string, rating: ReadingRecallRating) => void
  onCreateCard: () => void
}

const RATING_BUTTONS: Array<{
  rating: ReadingRecallRating
  label: string
  className: string
}> = [
  {
    rating: 'forgot',
    label: 'ลืม',
    className: 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-500/10 dark:text-rose-200',
  },
  {
    rating: 'partial',
    label: 'พอจำได้',
    className: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200',
  },
  {
    rating: 'remembered',
    label: 'จำได้ดี',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200',
  },
]

export function ReadingRecallReviewPanel({
  cards,
  books,
  onReview,
  onCreateCard,
}: ReadingRecallReviewPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answerVisible, setAnswerVisible] = useState(false)
  const currentCard = cards[currentIndex]
  const currentBook = currentCard
    ? books.find((book) => book.id === currentCard.bookId)
    : undefined

  function handleReview(rating: ReadingRecallRating) {
    if (!currentCard) return
    onReview(currentCard.id, rating)
    setAnswerVisible(false)
    setCurrentIndex((index) => Math.min(index, Math.max(0, cards.length - 2)))
  }

  return (
    <PressCard
      shadow="0 7px 0 0 #166534"
      shadowHover="0 4px 0 0 #166534"
      className="rounded-3xl border-[3px] border-emerald-700 bg-white p-5 dark:border-emerald-900 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
            <Brain className="h-5 w-5 text-emerald-600" />
            Active Recall
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
            ทบทวนข้อคิดที่ถึงกำหนดวันนี้แบบนึกก่อนดูเฉลย
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
            {cards.length} due
          </Badge>
          <Button
            onClick={onCreateCard}
            variant="outline"
            className="h-9 rounded-2xl border-2 px-3 font-black"
          >
            <Sparkles className="h-4 w-4" />
            สร้างการ์ด
          </Button>
        </div>
      </div>

      {currentCard ? (
        <div className="mt-5 rounded-2xl border-2 border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
              {currentBook?.coverImage ? (
                <img
                  src={currentBook.coverImage}
                  className="h-6 w-6 shrink-0 rounded object-cover"
                  alt=""
                />
              ) : (
                <span>{currentBook?.coverEmoji}</span>
              )}
              <span className="truncate">{currentBook?.title ?? 'หนังสือที่ถูกลบแล้ว'}</span>
            </div>
            <span className="text-xs font-black text-slate-400">
              {currentIndex + 1}/{cards.length}
            </span>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-xs font-black uppercase text-slate-400">คำถาม</p>
            <h3 className="mt-2 text-lg font-black leading-7 text-slate-900 dark:text-white">
              {currentCard.prompt}
            </h3>
          </div>

          {answerVisible ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-500/10">
                <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-200">
                  เฉลย
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {currentCard.answer}
                </p>
              </div>
              {currentCard.sourceText && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-black uppercase text-slate-400">ที่มา</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {currentCard.sourceText}
                  </p>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-3">
                {RATING_BUTTONS.map((button) => (
                  <Button
                    key={button.rating}
                    variant="outline"
                    onClick={() => handleReview(button.rating)}
                    className={`h-11 rounded-2xl border-2 font-black ${button.className}`}
                  >
                    {button.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setAnswerVisible(true)}
                className="h-11 rounded-2xl bg-[#58cc02] px-5 font-black text-white shadow-[0_4px_0_0_#2b6c00] hover:bg-[#46a302]"
              >
                <Eye className="h-4 w-4" />
                ดูเฉลย
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAnswerVisible(false)
                  setCurrentIndex((index) => (index + 1) % cards.length)
                }}
                className="h-11 rounded-2xl border-2 px-4 font-black"
              >
                <RotateCcw className="h-4 w-4" />
                ข้ามก่อน
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 px-5 py-8 text-center dark:border-slate-700">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">
            วันนี้ไม่มีการ์ดค้างทบทวน
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            สร้างการ์ดจากข้อคิดที่อ่านไว้ แล้วระบบจะจัดคิวให้กลับมาทบทวนเอง
          </p>
          <Button
            onClick={onCreateCard}
            className="mt-4 h-10 rounded-2xl bg-emerald-600 px-4 font-black text-white shadow-[0_3px_0_0_#166534] hover:bg-emerald-500"
          >
            <Sparkles className="h-4 w-4" />
            สร้างการ์ดแรก
          </Button>
        </div>
      )}
    </PressCard>
  )
}
