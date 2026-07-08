'use client'

import { useEffect, useState } from 'react'

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
import type { ReadingBook, ReadingCategory, ReadingStatus } from '@/types/reading'

type ReadingBookDraft = {
  title: string
  author: string
  category: ReadingCategory
  totalPages: number
  currentPage: number
  status: ReadingStatus
  coverEmoji: string
  color: string
  note: string
}

interface ReadingBookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: ReadingBookDraft) => void
  editingBook?: ReadingBook | null
}

const CATEGORY_OPTIONS: Array<{ value: ReadingCategory; label: string }> = [
  { value: 'finance', label: 'การเงิน' },
  { value: 'investment', label: 'การลงทุน' },
  { value: 'self_development', label: 'พัฒนาตัวเอง' },
  { value: 'technology', label: 'เทคโนโลยี' },
  { value: 'education', label: 'การศึกษา' },
  { value: 'other', label: 'อื่น ๆ' },
]

const STATUS_OPTIONS: Array<{ value: ReadingStatus; label: string }> = [
  { value: 'wishlist', label: 'อยากอ่าน' },
  { value: 'reading', label: 'กำลังอ่าน' },
  { value: 'finished', label: 'อ่านจบแล้ว' },
]

function getDefaultDraft(): ReadingBookDraft {
  return {
    title: '',
    author: '',
    category: 'finance',
    totalPages: 200,
    currentPage: 0,
    status: 'wishlist',
    coverEmoji: '',
    color: '',
    note: '',
  }
}

export function ReadingBookDialog({
  open,
  onOpenChange,
  onSubmit,
  editingBook,
}: ReadingBookDialogProps) {
  const [draft, setDraft] = useState<ReadingBookDraft>(getDefaultDraft())

  useEffect(() => {
    if (!open) return

    if (editingBook) {
      setDraft({
        title: editingBook.title,
        author: editingBook.author,
        category: editingBook.category,
        totalPages: editingBook.totalPages,
        currentPage: editingBook.currentPage,
        status: editingBook.status,
        coverEmoji: editingBook.coverEmoji,
        color: editingBook.color,
        note: editingBook.note ?? '',
      })
      return
    }

    setDraft(getDefaultDraft())
  }, [editingBook, open])

  function updateField<Key extends keyof ReadingBookDraft>(key: Key, value: ReadingBookDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit() {
    onSubmit({
      ...draft,
      title: draft.title.trim(),
      author: draft.author.trim(),
      note: draft.note.trim(),
      totalPages: Math.max(1, Math.round(draft.totalPages)),
      currentPage: Math.max(0, Math.round(draft.currentPage)),
      coverEmoji: draft.coverEmoji.trim(),
      color: draft.color.trim(),
    })
  }

  const isInvalid = draft.title.trim().length === 0 || draft.author.trim().length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[1.75rem] border-2 border-[#6d28d9] bg-white p-0 text-slate-900 shadow-[0_10px_0_0_#4c1d95] dark:border-violet-900 dark:bg-slate-900 dark:text-white dark:shadow-[0_10px_0_0_#1e1b4b]">
        <DialogHeader className="border-b-2 border-violet-100 px-5 py-5 dark:border-violet-950">
          <DialogTitle className="text-2xl font-black">
            {editingBook ? 'แก้ไขหนังสือ' : 'เพิ่มหนังสือใหม่'}
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-600 dark:text-slate-400">
            เพิ่มภารกิจการอ่านเล่มใหม่ให้กระดาน Reading Quest ของคุณ
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reading-title">ชื่อหนังสือ</Label>
            <Input
              id="reading-title"
              value={draft.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="เช่น The Psychology of Money"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading-author">ผู้เขียน</Label>
            <Input
              id="reading-author"
              value={draft.author}
              onChange={(event) => updateField('author', event.target.value)}
              placeholder="เช่น Morgan Housel"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label>หมวดหมู่</Label>
            <Select
              value={draft.category}
              onValueChange={(value) => {
                if (!value) return
                updateField('category', value as ReadingCategory)
              }}
            >
              <SelectTrigger className="h-11 w-full rounded-2xl px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading-total-pages">จำนวนหน้าทั้งหมด</Label>
            <Input
              id="reading-total-pages"
              type="number"
              min={1}
              value={draft.totalPages}
              onChange={(event) => updateField('totalPages', Number(event.target.value))}
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading-current-page">หน้าปัจจุบัน</Label>
            <Input
              id="reading-current-page"
              type="number"
              min={0}
              value={draft.currentPage}
              onChange={(event) => updateField('currentPage', Number(event.target.value))}
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label>สถานะ</Label>
            <Select
              value={draft.status}
              onValueChange={(value) => {
                if (!value) return
                updateField('status', value as ReadingStatus)
              }}
            >
              <SelectTrigger className="h-11 w-full rounded-2xl px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading-emoji">อีโมจิปกหนังสือ</Label>
            <Input
              id="reading-emoji"
              value={draft.coverEmoji}
              onChange={(event) => updateField('coverEmoji', event.target.value)}
              placeholder="เช่น 📘"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reading-color">สีประจำเล่ม</Label>
            <div className="flex items-center gap-3 rounded-2xl border border-input px-3 py-2 dark:bg-input/30">
              <input
                id="reading-color"
                type="color"
                value={draft.color || '#58cc02'}
                onChange={(event) => updateField('color', event.target.value)}
                className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              />
              <Input
                value={draft.color}
                onChange={(event) => updateField('color', event.target.value)}
                placeholder="#58cc02"
                className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reading-note">โน้ต</Label>
            <textarea
              id="reading-note"
              value={draft.note}
              onChange={(event) => updateField('note', event.target.value)}
              placeholder="อยากจำอะไรเกี่ยวกับหนังสือเล่มนี้"
              rows={4}
              className="w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
        </div>

        <DialogFooter className="-mx-0 -mb-0 gap-2 border-violet-100 bg-violet-50 px-5 py-4 dark:border-violet-950 dark:bg-slate-950/60">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-2xl border-2 font-bold"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isInvalid}
            className="h-11 rounded-2xl bg-[#58cc02] font-black text-white shadow-[0_4px_0_0_#2b6c00] hover:bg-[#46a302]"
          >
            {editingBook ? 'บันทึกการแก้ไข' : 'เพิ่มหนังสือ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
