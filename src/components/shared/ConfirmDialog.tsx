'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  confirmLabel?: string
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = 'ลบ',
  loading,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[1.5rem] border-2 border-[#becbb1] bg-[var(--quest-background)] p-0 text-[var(--quest-foreground)] shadow-[0_8px_0_0_#becbb1] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-foreground)] dark:shadow-[0_8px_0_0_#0f130c]">
        <DialogHeader className="border-b-2 border-[#becbb1] px-5 py-4 dark:border-[#3b4630]">
          <DialogTitle className="font-quest-heading text-xl font-black text-[var(--quest-foreground)]">
            {title}
          </DialogTitle>
          <DialogDescription className="font-quest-body text-sm font-bold text-[var(--quest-muted)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="-mx-0 -mb-0 gap-2 border-[#becbb1] bg-[var(--quest-surface-low)] px-5 py-4 dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-11 rounded-2xl border-2 border-[#6f7b64] bg-[var(--quest-surface)] font-bold text-[var(--quest-muted)] shadow-[0_4px_0_0_#6f7b64] hover:bg-[var(--quest-surface)] dark:border-[#5f6e52] dark:bg-[var(--quest-surface)]"
          >
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="h-11 rounded-2xl border-2 border-rose-700 bg-rose-100 font-bold text-rose-700 shadow-[0_4px_0_0_#7f1d1d] hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-200"
          >
            {loading ? 'กำลังลบ...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
