'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Clock3, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PressCard } from '@/components/ui/PressCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ReadingBook } from '@/types/reading'

interface QuickReadingSessionFormProps {
  books: ReadingBook[]
  onSubmit: (payload: {
    bookId: string
    durationMin: number
    pagesRead: number
    keyTakeaway?: string
    note?: string
  }) => void
}

export function QuickReadingSessionForm({
  books,
  onSubmit,
}: QuickReadingSessionFormProps) {
  const readingBooks = useMemo(
    () => books.filter((book) => book.status !== 'finished'),
    [books]
  )
  const [bookId, setBookId] = useState('')
  const [durationMin, setDurationMin] = useState(15)
  const [pagesRead, setPagesRead] = useState(5)
  const [keyTakeaway, setKeyTakeaway] = useState('')
  const [note, setNote] = useState('')

  function resetForm() {
    setBookId('')
    setDurationMin(15)
    setPagesRead(5)
    setKeyTakeaway('')
    setNote('')
  }

  function handleSubmit() {
    if (!bookId) {
      toast.error('เลือกหนังสือก่อนบันทึก session')
      return
    }

    if (durationMin <= 0 && pagesRead <= 0) {
      toast.error('ใส่เวลาอ่านหรือจำนวนหน้าอย่างน้อย 1 อย่าง')
      return
    }

    onSubmit({
      bookId,
      durationMin: Math.max(0, Math.round(durationMin)),
      pagesRead: Math.max(0, Math.round(pagesRead)),
      keyTakeaway: keyTakeaway.trim() || undefined,
      note: note.trim() || undefined,
    })
    resetForm()
    toast.success('บันทึกการอ่านเรียบร้อย')
  }

  return (
    <PressCard
      shadow="0 7px 0 0 #6d28d9"
      shadowHover="0 4px 0 0 #6d28d9"
      className="rounded-3xl border-[3px] border-violet-700 bg-white p-5 dark:border-violet-900 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
            <BookOpen className="h-5 w-5 text-violet-600" />
            Quick Add Reading Session
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            บันทึกการอ่านวันนี้แล้วเก็บ XP ทันที
          </p>
        </div>
        <div className="rounded-2xl bg-violet-100 px-3 py-2 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          อ่าน 1 นาที = 2 XP
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>เลือกหนังสือ</Label>
          <Select
            value={bookId}
            onValueChange={(value) => {
              setBookId(value ?? '')
            }}
          >
            <SelectTrigger className="h-11 w-full rounded-2xl px-3">
              <SelectValue>
                {bookId
                  ? readingBooks.find((book) => book.id === bookId)?.title
                  : 'เลือกหนังสือที่กำลังอ่าน'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {readingBooks.length > 0 ? (
                readingBooks.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.coverImage ? (
                      <img src={book.coverImage} className="w-4 h-4 rounded object-cover inline-block mr-1.5 align-middle" alt="" />
                    ) : (
                      <span className="mr-1.5">{book.coverEmoji}</span>
                    )}
                    <span>{book.title}</span>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__empty" disabled>
                  ยังไม่มีหนังสือที่กำลังอ่าน
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reading-duration">เวลาอ่าน (นาที)</Label>
          <div className="relative">
            <Clock3 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              id="reading-duration"
              type="number"
              min={0}
              value={durationMin}
              onChange={(event) => setDurationMin(Number(event.target.value))}
              className="h-11 rounded-2xl pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reading-pages">จำนวนหน้าที่อ่าน</Label>
          <Input
            id="reading-pages"
            type="number"
            min={0}
            value={pagesRead}
            onChange={(event) => setPagesRead(Number(event.target.value))}
            className="h-11 rounded-2xl"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="reading-takeaway">วันนี้ได้เรียนรู้อะไร</Label>
          <div className="relative">
            <Sparkles className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              id="reading-takeaway"
              value={keyTakeaway}
              onChange={(event) => setKeyTakeaway(event.target.value)}
              placeholder="เช่น ต้องคิดระยะยาวมากขึ้น"
              className="h-11 rounded-2xl pl-9"
            />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="reading-note">โน้ตเพิ่มเติม</Label>
          <textarea
            id="reading-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="จดประเด็นที่อยากกลับมาอ่านซ้ำ"
            className="w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          XP ที่คาดว่าจะได้: <span className="text-violet-700 dark:text-violet-300">{durationMin * 2 + pagesRead} XP</span>
        </p>
        <Button
          onClick={handleSubmit}
          disabled={readingBooks.length === 0}
          className="h-11 rounded-2xl bg-[#58cc02] px-5 font-black text-white shadow-[0_4px_0_0_#2b6c00] hover:bg-[#46a302]"
        >
          <Plus className="h-4 w-4" />
          บันทึกการอ่าน
        </Button>
      </div>
    </PressCard>
  )
}
