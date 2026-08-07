'use client'

import { useEffect, useState } from 'react'
import { Brain, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ReadingBook, ReadingRecallCard } from '@/types/reading'

type RecallCardDraft = {
  bookId: string
  sessionId?: string
  prompt: string
  answer: string
  sourceText: string
  note: string
  tags: string
}

type RecallCardSeed = Partial<RecallCardDraft> & {
  bookId?: string
}

interface ReadingRecallCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  books: ReadingBook[]
  seed?: RecallCardSeed | null
  editingCard?: ReadingRecallCard | null
  onSubmit: (payload: {
    bookId: string
    sessionId?: string
    prompt: string
    answer: string
    sourceText?: string
    note?: string
    tags: string[]
  }) => void
}

function getDefaultDraft(bookId = ''): RecallCardDraft {
  return {
    bookId,
    sessionId: undefined,
    prompt: '',
    answer: '',
    sourceText: '',
    note: '',
    tags: '',
  }
}

function tagsFromText(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function ReadingRecallCardDialog({
  open,
  onOpenChange,
  books,
  seed,
  editingCard,
  onSubmit,
}: ReadingRecallCardDialogProps) {
  const [draft, setDraft] = useState<RecallCardDraft>(getDefaultDraft())

  useEffect(() => {
    if (!open) return

    if (editingCard) {
      setDraft({
        bookId: editingCard.bookId,
        sessionId: editingCard.sessionId,
        prompt: editingCard.prompt,
        answer: editingCard.answer,
        sourceText: editingCard.sourceText ?? '',
        note: editingCard.note ?? '',
        tags: editingCard.tags.join(', '),
      })
      return
    }

    const fallbackBookId = seed?.bookId ?? books[0]?.id ?? ''
    setDraft({
      ...getDefaultDraft(fallbackBookId),
      ...seed,
      bookId: fallbackBookId,
      sourceText: seed?.sourceText ?? '',
      note: seed?.note ?? '',
      tags: seed?.tags ?? '',
    })
  }, [books, editingCard, open, seed])

  function updateField<Key extends keyof RecallCardDraft>(
    key: Key,
    value: RecallCardDraft[Key]
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit() {
    const prompt = draft.prompt.trim()
    const answer = draft.answer.trim()

    if (!draft.bookId || !prompt || !answer) {
      toast.error('ใส่หนังสือ คำถาม และคำตอบก่อนสร้างการ์ด')
      return
    }

    onSubmit({
      bookId: draft.bookId,
      sessionId: draft.sessionId,
      prompt,
      answer,
      sourceText: draft.sourceText.trim() || undefined,
      note: draft.note.trim() || undefined,
      tags: tagsFromText(draft.tags),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-[1.75rem] border-2 border-emerald-700 bg-white p-0 text-slate-900 shadow-[0_6px_0_0_#166534] dark:border-emerald-900 dark:bg-slate-900 dark:text-white">
        <DialogHeader className="shrink-0 border-b-2 border-emerald-100 px-5 py-4 dark:border-emerald-950">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black">
            <Brain className="h-5 w-5 text-emerald-600" />
            {editingCard ? 'แก้ไข Recall Card' : 'สร้าง Recall Card'}
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-600 dark:text-slate-400">
            เปลี่ยนข้อคิดจากหนังสือให้เป็นคำถามที่ต้องนึกก่อนดูเฉลย
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI-ready
            </div>
            <p className="mt-1 text-xs leading-5">
              รอบนี้ยังไม่เรียก AI จริง แต่ช่องนี้เตรียมไว้ให้ต่อระบบช่วยแปลงโน้ตเป็นการ์ดภายหลัง
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>หนังสือ</Label>
              <Select
                value={draft.bookId}
                onValueChange={(value) => updateField('bookId', value ?? '')}
              >
                <SelectTrigger className="h-11 w-full rounded-2xl px-3">
                  <SelectValue placeholder="เลือกหนังสือ" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          className="mr-1.5 inline-block h-4 w-4 rounded object-cover align-middle"
                          alt=""
                        />
                      ) : (
                        <span className="mr-1.5">{book.coverEmoji}</span>
                      )}
                      <span>{book.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recall-source">ข้อคิด/ที่มา</Label>
              <textarea
                id="recall-source"
                value={draft.sourceText}
                onChange={(event) => updateField('sourceText', event.target.value)}
                rows={3}
                placeholder="วางข้อความจาก key takeaway หรือ note"
                className="w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recall-prompt">คำถาม</Label>
              <Input
                id="recall-prompt"
                value={draft.prompt}
                onChange={(event) => updateField('prompt', event.target.value)}
                placeholder="เช่น ข้อคิดหลักของบทนี้คืออะไร?"
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recall-answer">คำตอบ</Label>
              <textarea
                id="recall-answer"
                value={draft.answer}
                onChange={(event) => updateField('answer', event.target.value)}
                rows={4}
                placeholder="เขียนคำตอบที่อยากจำให้ได้"
                className="w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recall-tags">แท็ก</Label>
              <Input
                id="recall-tags"
                value={draft.tags}
                onChange={(event) => updateField('tags', event.target.value)}
                placeholder="money, mindset"
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recall-note">โน้ตส่วนตัว</Label>
              <Input
                id="recall-note"
                value={draft.note}
                onChange={(event) => updateField('note', event.target.value)}
                placeholder="บริบทหรือหน้าที่เกี่ยวข้อง"
                className="h-11 rounded-2xl"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="m-0 flex-row justify-end gap-2 rounded-none border-t-2 border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-950 dark:bg-slate-950/60 sm:px-5 sm:py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-2xl border-2 px-4 font-bold"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            className="h-11 rounded-2xl bg-[#58cc02] px-5 font-black text-white shadow-[0_3px_0_0_#2b6c00] hover:bg-[#46a302]"
          >
            {editingCard ? 'บันทึกการแก้ไข' : 'สร้างการ์ด'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
