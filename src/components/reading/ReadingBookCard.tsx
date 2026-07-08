'use client'

import { Edit3, Library, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { Progress, ProgressLabel } from '@/components/ui/progress'
import type { ReadingBook } from '@/types/reading'

interface ReadingBookCardProps {
  book: ReadingBook
  progress: number
  onEdit: (book: ReadingBook) => void
  onDelete: (book: ReadingBook) => void
}

const STATUS_LABELS = {
  wishlist: 'อยากอ่าน',
  reading: 'กำลังอ่าน',
  finished: 'อ่านจบแล้ว',
} as const

const STATUS_CLASSNAMES = {
  wishlist: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  reading: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
  finished: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
} as const

export function ReadingBookCard({
  book,
  progress,
  onEdit,
  onDelete,
}: ReadingBookCardProps) {
  return (
    <PressCard
      shadow="0 6px 0 0 #cbd5e1"
      shadowHover="0 3px 0 0 #cbd5e1"
      className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-2xl"
            style={{
              backgroundColor: `${book.color}20`,
              borderColor: `${book.color}55`,
            }}
          >
            {book.coverEmoji}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black text-slate-900 dark:text-white">
                {book.title}
              </h3>
              <Badge className={STATUS_CLASSNAMES[book.status]}>
                {STATUS_LABELS[book.status]}
              </Badge>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              {book.author}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => onEdit(book)} className="rounded-xl border-2">
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onDelete(book)}
            className="rounded-xl border-2 text-rose-600 hover:text-rose-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Progress value={progress} className="gap-2">
          <div className="flex w-full items-center gap-2">
            <ProgressLabel className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              ความคืบหน้า
            </ProgressLabel>
            <span className="ml-auto text-xs font-black text-slate-700 dark:text-slate-200">
              {book.currentPage}/{book.totalPages} หน้า
            </span>
          </div>
        </Progress>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
          {progress}% complete
        </span>
        {book.startedAt && (
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            เริ่มแล้ว
          </span>
        )}
        {book.finishedAt && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
            +100 XP
          </span>
        )}
      </div>

      {book.note && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 px-3 py-3 dark:border-slate-700">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
            <Library className="h-3.5 w-3.5" />
            โน้ตประจำเล่ม
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{book.note}</p>
        </div>
      )}
    </PressCard>
  )
}
