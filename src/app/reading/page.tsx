'use client'

import { useMemo, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Library,
  Plus,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'

import { ReadingAchievementGrid } from '@/components/reading/ReadingAchievementGrid'
import { ReadingBookCard } from '@/components/reading/ReadingBookCard'
import { ReadingBookDialog } from '@/components/reading/ReadingBookDialog'
import { QuickReadingSessionForm } from '@/components/reading/QuickReadingSessionForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { useHydrated } from '@/hooks/useHydrated'
import { formatDateShort } from '@/lib/utils'
import { getReadingDateKey, useReadingStore } from '@/store/useReadingStore'
import type { ReadingBook, ReadingCategory } from '@/types/reading'

const CATEGORY_DEFAULTS: Record<ReadingCategory, { emoji: string; color: string }> = {
  finance: { emoji: '💸', color: '#58cc02' },
  investment: { emoji: '📈', color: '#7c3aed' },
  self_development: { emoji: '🧠', color: '#f59e0b' },
  technology: { emoji: '💻', color: '#0ea5e9' },
  education: { emoji: '🎓', color: '#14b8a6' },
  other: { emoji: '📚', color: '#64748b' },
}

function getSectionTitle(
  icon: React.ElementType,
  title: string,
  subtitle: string
) {
  const Icon = icon

  return (
    <div>
      <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
        <Icon className="h-5 w-5 text-[#58cc02]" />
        {title}
      </h2>
      <p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
        {subtitle}
      </p>
    </div>
  )
}

function EmptyReadingState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-700">
      <BookOpen className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
      <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export default function ReadingPage() {
  const hydrated = useHydrated()
  const books = useReadingStore((state) => state.books)
  const sessions = useReadingStore((state) => state.sessions)
  const xp = useReadingStore((state) => state.xp)
  const streak = useReadingStore((state) => state.streak)
  const achievements = useReadingStore((state) => state.achievements)
  const addBook = useReadingStore((state) => state.addBook)
  const updateBook = useReadingStore((state) => state.updateBook)
  const deleteBook = useReadingStore((state) => state.deleteBook)
  const addSession = useReadingStore((state) => state.addSession)
  const getBookProgress = useReadingStore((state) => state.getBookProgress)
  const getFinishedBooks = useReadingStore((state) => state.getFinishedBooks)
  const getMonthlyStats = useReadingStore((state) => state.getMonthlyStats)
  const getTodaySessions = useReadingStore((state) => state.getTodaySessions)

  const [bookDialogOpen, setBookDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<ReadingBook | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ReadingBook | null>(null)

  const monthlyStats = useMemo(() => getMonthlyStats(), [getMonthlyStats, sessions])
  const finishedBooks = useMemo(() => getFinishedBooks(), [books, getFinishedBooks])
  const todaySessions = useMemo(() => getTodaySessions(), [getTodaySessions, sessions])
  const latestSessions = useMemo(() => sessions.slice(0, 5), [sessions])
  const totalPagesRead = useMemo(
    () => sessions.reduce((sum, session) => sum + session.pagesRead, 0),
    [sessions]
  )

  function handleCreateBook(payload: {
    title: string
    author: string
    category: ReadingCategory
    totalPages: number
    currentPage: number
    status: ReadingBook['status']
    coverEmoji: string
    color: string
    note: string
  }) {
    const defaults = CATEGORY_DEFAULTS[payload.category]

    if (editingBook) {
      updateBook({
        id: editingBook.id,
        ...payload,
        coverEmoji: payload.coverEmoji || defaults.emoji,
        color: payload.color || defaults.color,
        note: payload.note || undefined,
      })
      toast.success('อัปเดตข้อมูลหนังสือแล้ว')
    } else {
      addBook({
        ...payload,
        coverEmoji: payload.coverEmoji || defaults.emoji,
        color: payload.color || defaults.color,
        note: payload.note || undefined,
      })
      toast.success('เพิ่มหนังสือใหม่แล้ว')
    }

    setBookDialogOpen(false)
    setEditingBook(null)
  }

  function handleDeleteBook() {
    if (!deleteTarget) return

    deleteBook(deleteTarget.id)
    toast.success(`ลบ "${deleteTarget.title}" แล้ว`)
    setDeleteTarget(null)
  }

  function openCreateDialog() {
    setEditingBook(null)
    setBookDialogOpen(true)
  }

  if (!hydrated) {
    return <div className="h-96 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800/50" />
  }

  return (
    <>
      <div className="space-y-6 pb-24">
        <PressCard
          shadow="0 10px 0 0 #2b6c00"
          shadowHover="0 7px 0 0 #2b6c00"
          className="overflow-hidden rounded-3xl border-[3px] border-[#2b6c00] bg-[#58cc02] p-5 text-white dark:border-emerald-950 dark:bg-emerald-500/90"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="border border-white/25 bg-white/20 text-white">
                <BookOpen className="h-3.5 w-3.5" />
                Reading Quest
              </Badge>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">ภารกิจอ่านหนังสือ</h1>
              <p className="mt-3 text-base font-bold leading-7 text-white/90">
                อ่านวันละนิด สะสมความรู้ เก็บ XP และสร้าง streak ให้ต่อเนื่อง
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/80">
                วันนี้อ่านกี่หน้า ก็ถือว่าเดินหน้าไปอีกขั้น
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[360px] lg:grid-cols-4">
              <HeroStat icon={CheckCircle2} label="XP รวม" value={`${xp}`} />
              <HeroStat icon={Flame} label="Streak" value={`${streak} วัน`} />
              <HeroStat icon={Library} label="อ่านจบ" value={`${finishedBooks.length} เล่ม`} />
              <HeroStat icon={Clock} label="เดือนนี้" value={`${monthlyStats.totalPages} หน้า`} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-white/25 bg-white/15 px-4 py-3 text-sm font-black">
            <span>
              วันนี้อ่านแล้ว {todaySessions.length} session • สะสมทั้งหมด {totalPagesRead} หน้า
            </span>
            <Button
              onClick={openCreateDialog}
              className="h-10 rounded-2xl bg-white px-4 font-black text-[#2b6c00] shadow-[0_3px_0_0_rgba(0,0,0,0.12)] hover:bg-white/90"
            >
              <Plus className="h-4 w-4" />
              เพิ่มหนังสือ
            </Button>
          </div>
        </PressCard>

        <QuickReadingSessionForm
          books={books}
          onSubmit={(payload) => {
            addSession(payload)
          }}
        />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {getSectionTitle(Library, 'My Books', 'ดูคลังหนังสือทั้งหมดและความคืบหน้าของแต่ละเล่ม')}
            <Button
              onClick={openCreateDialog}
              className="h-10 rounded-2xl bg-violet-600 px-4 font-black text-white shadow-[0_4px_0_0_#4c1d95] hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              เพิ่มหนังสือ
            </Button>
          </div>

          {books.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {books.map((book) => (
                <ReadingBookCard
                  key={book.id}
                  book={book}
                  progress={getBookProgress(book.id)}
                  onEdit={(nextBook) => {
                    setEditingBook(nextBook)
                    setBookDialogOpen(true)
                  }}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          ) : (
            <EmptyReadingState
              title="ยังไม่มีหนังสือในคลัง"
              description="เริ่มเพิ่มหนังสือเล่มแรกของคุณ แล้วค่อยบันทึกการอ่านในแต่ละวัน"
              action={
                <Button
                  onClick={openCreateDialog}
                  className="h-10 rounded-2xl bg-[#58cc02] px-4 font-black text-white shadow-[0_4px_0_0_#2b6c00] hover:bg-[#46a302]"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มหนังสือเล่มแรก
                </Button>
              }
            />
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <section className="space-y-3">
            {getSectionTitle(CheckCircle2, 'Today Progress', 'ดูรายการ session ของวันนี้แบบรวดเร็ว')}
            <PressCard
              shadow="0 5px 0 0 #cbd5e1"
              shadowHover="0 3px 0 0 #cbd5e1"
              className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              {todaySessions.length > 0 ? (
                <div className="space-y-3">
                  {todaySessions.map((session) => {
                    const book = books.find((item) => item.id === session.bookId)
                    return (
                      <div
                        key={session.id}
                        className="rounded-2xl border-2 border-slate-200 p-3 dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {book?.coverEmoji} {book?.title ?? 'หนังสือที่ถูกลบแล้ว'}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                              {session.durationMin} นาที • {session.pagesRead} หน้า
                            </p>
                            {session.keyTakeaway && (
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                “{session.keyTakeaway}”
                              </p>
                            )}
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                            +{session.xpEarned} XP
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyReadingState
                  title="วันนี้ยังไม่มี session"
                  description="เริ่มบันทึกการอ่านด้านบน แล้วความคืบหน้าวันนี้จะมาแสดงตรงนี้"
                />
              )}
            </PressCard>
          </section>

          <section className="space-y-3">
            {getSectionTitle(Clock, 'Reading History', 'ประวัติการอ่านล่าสุด 5 รายการ')}
            <PressCard
              shadow="0 5px 0 0 #cbd5e1"
              shadowHover="0 3px 0 0 #cbd5e1"
              className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              {latestSessions.length > 0 ? (
                <div className="space-y-3">
                  {latestSessions.map((session) => {
                    const book = books.find((item) => item.id === session.bookId)
                    return (
                      <div
                        key={session.id}
                        className="rounded-2xl border-2 border-slate-200 p-3 dark:border-slate-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-400">
                              {formatDateShort(session.date)}
                            </p>
                            <h3 className="mt-1 truncate font-black text-slate-900 dark:text-white">
                              {book?.coverEmoji} {book?.title ?? 'หนังสือที่ถูกลบแล้ว'}
                            </h3>
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                              {session.durationMin} นาที • {session.pagesRead} หน้า
                            </p>
                            {session.note && (
                              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                {session.note}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                            +{session.xpEarned}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyReadingState
                  title="ยังไม่มีประวัติการอ่าน"
                  description="เมื่อเริ่มบันทึก session แล้ว ระบบจะแสดงรายการล่าสุดตรงนี้"
                />
              )}
            </PressCard>
          </section>
        </div>

        <section className="space-y-3">
          {getSectionTitle(Trophy, 'Achievement Preview', 'ดู badge ที่ปลดล็อกแล้วและเป้าหมายถัดไป')}
          <ReadingAchievementGrid achievements={achievements} />
        </section>
      </div>

      <ReadingBookDialog
        open={bookDialogOpen}
        onOpenChange={(open) => {
          setBookDialogOpen(open)
          if (!open) setEditingBook(null)
        }}
        editingBook={editingBook}
        onSubmit={handleCreateBook}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="ลบหนังสือ"
        description={`ต้องการลบ "${deleteTarget?.title ?? ''}" ใช่หรือไม่? ระบบจะลบ reading sessions ของเล่มนี้ไปด้วย`}
        onConfirm={handleDeleteBook}
      />
    </>
  )
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border-2 border-white/25 bg-white/15 p-3 text-center">
      <Icon className="mx-auto h-5 w-5 text-white" />
      <p className="mt-1 text-[10px] font-black uppercase text-white/75">{label}</p>
      <p className="mt-1 text-sm font-black sm:text-base">{value}</p>
    </div>
  )
}
