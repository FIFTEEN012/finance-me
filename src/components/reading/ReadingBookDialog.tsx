'use client'

import { useEffect, useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
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
import type { ReadingBook, ReadingCategory, ReadingStatus } from '@/types/reading'

type ReadingBookDraft = {
  title: string
  author: string
  category: ReadingCategory
  totalPages: number
  currentPage: number
  status: ReadingStatus
  coverEmoji: string
  coverImage?: string
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
    coverImage: '',
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
        coverImage: editingBook.coverImage ?? '',
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
      coverImage: draft.coverImage ? draft.coverImage.trim() : undefined,
      color: draft.color.trim(),
    })
  }

  const isInvalid = draft.title.trim().length === 0 || draft.author.trim().length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-[1.75rem] border-2 border-[#6d28d9] bg-white p-0 text-slate-900 shadow-[0_6px_0_0_#4c1d95] dark:border-violet-900 dark:bg-slate-900 dark:text-white dark:shadow-[0_6px_0_0_#1e1b4b]">
        <DialogHeader className="border-b-2 border-violet-100 px-5 py-4 dark:border-violet-950 shrink-0">
          <DialogTitle className="text-2xl font-black">
            {editingBook ? 'แก้ไขหนังสือ' : 'เพิ่มหนังสือใหม่'}
          </DialogTitle>
          <DialogDescription className="font-medium text-slate-600 dark:text-slate-400">
            เพิ่มภารกิจการอ่านเล่มใหม่ให้กระดาน Reading Quest ของคุณ
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Label>รูปภาพปกหนังสือ (จะใช้แสดงแทนอีโมจิหากอัปโหลด)</Label>
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl">
              {draft.coverImage ? (
                <div className="relative w-14 h-20 rounded-xl overflow-hidden border-2 border-slate-250 dark:border-slate-700 shrink-0">
                  <img src={draft.coverImage} className="w-full h-full object-cover" alt="Cover Preview" />
                  <button
                    type="button"
                    onClick={() => updateField('coverImage', '')}
                    className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 cursor-pointer shadow-md transition-colors"
                    title="ลบรูปภาพ"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-14 h-20 rounded-xl border-2 border-dashed border-slate-350 dark:border-slate-800 flex items-center justify-center text-slate-400 shrink-0 bg-white dark:bg-slate-900/50">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}

              <div className="flex-1">
                <input
                  type="file"
                  id="book-cover-upload"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (!file.type.startsWith('image/')) {
                      toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
                      return
                    }
                    if (file.size > 1.5 * 1024 * 1024) {
                      toast.error('รูปภาพมีขนาดใหญ่เกินไป (ไม่ควรเกิน 1.5MB)')
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const base64 = event.target?.result as string
                      updateField('coverImage', base64)
                      toast.success('เลือกรูปปกหนังสือเรียบร้อย')
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('book-cover-upload')?.click()}
                    className="rounded-xl border-2 font-bold h-9 px-3 text-xs bg-white dark:bg-slate-850"
                  >
                    อัปโหลดไฟล์รูปภาพปก
                  </Button>
                </div>
                <div className="mt-3 space-y-1.5 border-t border-slate-200/60 dark:border-slate-800 pt-2.5">
                  <Label htmlFor="book-cover-url" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    หรือใส่ลิงก์รูปภาพ (Image Address / URL)
                  </Label>
                  <Input
                    id="book-cover-url"
                    value={draft.coverImage?.startsWith('data:') ? '' : draft.coverImage}
                    onChange={(event) => updateField('coverImage', event.target.value)}
                    placeholder="เช่น https://example.com/cover.jpg"
                    className="h-9 text-xs rounded-xl bg-white dark:bg-slate-950"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-normal">
                  แนะนำสัดส่วนรูปภาพ 2:3 หรือแนวตั้ง หากต้องการเคลียร์รูปภาพ ให้กดลบ (X) ที่รูปพรีวิว
                </p>
              </div>
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
        </div>

        <DialogFooter className="m-0 flex-row justify-end gap-2 rounded-none border-t-2 border-violet-100 bg-violet-50 px-4 py-3 dark:border-violet-950 dark:bg-slate-950/60 sm:px-5 sm:py-4 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 min-w-[5.25rem] rounded-2xl border-2 px-4 font-bold"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isInvalid}
            className="h-11 min-w-0 rounded-2xl bg-[#58cc02] px-4 font-black text-white shadow-[0_3px_0_0_#2b6c00] hover:bg-[#46a302] sm:px-5"
          >
            {editingBook ? 'บันทึกการแก้ไข' : 'เพิ่มหนังสือ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
