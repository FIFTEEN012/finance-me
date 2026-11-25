'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhotoDraft } from '@/components/nutrition/PhotoDraft'
import { authClient } from '@/lib/auth-client'
import { FOOD_PHOTO_TYPES, readFoodPhoto } from '@/lib/foodPhotoClient'
import type { FoodPhotoItem } from '@/lib/foodPhoto'
import type { FoodInput } from '@/store/useNutritionStore'

interface Props {
  date: string
  /** Receives the Food Entries the user ticked in the Photo Draft. */
  onSave: (entries: FoodInput[]) => void
}

/** Take or pick a food photo, let Gemini suggest items, then review them in a Photo Draft. */
export function FoodPhotoButton({ date, onSave }: Props) {
  const { data: session, isPending } = authClient.useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [open, setOpen] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<FoodPhotoItem[] | null>(null)
  const [draftKey, setDraftKey] = useState(0)

  const close = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setOpen(false)
    setReading(false)
    setError('')
    setItems(null)
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setOpen(true)
    setItems(null)
    setError('')
    setReading(true)
    try {
      const found = await readFoodPhoto(file, controller.signal)
      if (controller.signal.aborted) return
      setItems(found)
      setDraftKey((k) => k + 1)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'วิเคราะห์รูปไม่สำเร็จ')
    } finally {
      if (!controller.signal.aborted) setReading(false)
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  const signedIn = !!session?.user

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={FOOD_PHOTO_TYPES.join(',')}
        onChange={handleFile}
        className="sr-only"
        aria-label="เลือกหรือถ่ายรูปอาหาร"
        tabIndex={-1}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full gap-1.5"
        disabled={isPending || !signedIn || reading}
        onClick={() => inputRef.current?.click()}
      >
        <Camera className="w-4 h-4" /> ถ่ายรูปอาหาร
      </Button>
      {!isPending && !signedIn && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          เข้าสู่ระบบเพื่อวิเคราะห์รูปอาหาร หรือกด &quot;บันทึกอาหาร&quot; เพื่อพิมพ์เอง
        </p>
      )}

      <Dialog open={open} onOpenChange={(next) => { if (!next) close() }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ร่างจากรูป</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">รูปจะถูกส่งไปยัง Google Gemini เพื่อวิเคราะห์เท่านั้น และไม่ถูกเก็บไว้</p>
          {reading && (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin" /> Gemini กำลังดูรูปอาหาร...
            </p>
          )}
          {error && (
            <div className="space-y-2">
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>
              <Button type="button" variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>เลือกรูปใหม่</Button>
            </div>
          )}
          {items && (
            <PhotoDraft
              key={draftKey}
              items={items}
              date={date}
              onCancel={close}
              onSave={(entries) => { onSave(entries); close() }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
