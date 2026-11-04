'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useCategoryStore } from '@/store/useCategoryStore'
import { RecurringFrequency, RecurringTransaction } from '@/types'
import { todayKey } from '@/lib/recurring'
import { cn } from '@/lib/utils'

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'ทุกสัปดาห์',
  monthly: 'ทุกเดือน',
  yearly: 'ทุกปี',
}

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().trim().min(1, 'กรุณาระบุชื่อรายการ'),
  amount: z.number({ message: 'กรุณาระบุจำนวนเงิน' }).positive('จำนวนเงินต้องมากกว่า 0'),
  categoryId: z.string().min(1, 'กรุณาเลือกหมวดหมู่'),
  frequency: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'กรุณาเลือกวันที่'),
  note: z.string().optional(),
})

export type RecurringFormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: RecurringTransaction | null
  onSubmit: (values: RecurringFormValues) => void
}

export function RecurringForm({ open, onOpenChange, editing, onSubmit }: Props) {
  const categories = useCategoryStore((s) => s.categories)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RecurringFormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    reset(editing
      ? {
          type: editing.type,
          description: editing.description,
          amount: editing.amount,
          categoryId: editing.categoryId,
          frequency: editing.frequency,
          startDate: editing.startDate,
          note: editing.note ?? '',
        }
      : { type: 'EXPENSE', description: '', categoryId: '', frequency: 'monthly', startDate: todayKey(), note: '' })
  }, [open, editing, reset])

  const type = watch('type')
  const categoryId = watch('categoryId')
  const frequency = watch('frequency')
  const startDate = watch('startDate')

  const options = categories.filter((c) => c.type === type)
  const selectedCategory = categories.find((c) => c.id === categoryId)
  const backfills = !editing && !!startDate && startDate < todayKey()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'แก้ไขรายการประจำ' : 'เพิ่มรายการประจำ'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-2">
            {(['EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('type', t); setValue('categoryId', '') }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                  type === t
                    ? t === 'EXPENSE'
                      ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                      : 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'border-gray-200 text-gray-500 dark:border-white/10 dark:text-white/50'
                )}
              >
                {t === 'EXPENSE' ? 'รายจ่าย' : 'รายรับ'}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="recurring-description" className="text-sm mb-1.5 block">ชื่อรายการ</Label>
            <Input id="recurring-description" {...register('description')} placeholder="เช่น ค่าเช่าบ้าน ค่าอินเทอร์เน็ต" />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="recurring-amount" className="text-sm mb-1.5 block">จำนวนเงิน (บาท)</Label>
            <Input
              id="recurring-amount"
              {...register('amount', { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">หมวดหมู่</Label>
            <Select value={categoryId ?? ''} onValueChange={(v) => setValue('categoryId', v ?? '', { shouldValidate: true })}>
              <SelectTrigger className="w-full" aria-label="หมวดหมู่">
                <SelectValue placeholder="เลือกหมวดหมู่">
                  {() => selectedCategory?.name ?? 'เลือกหมวดหมู่'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-1.5 block">ความถี่</Label>
              <Select
                value={frequency ?? 'monthly'}
                onValueChange={(v) => v && setValue('frequency', v as RecurringFrequency)}
              >
                <SelectTrigger className="w-full" aria-label="ความถี่">
                  <SelectValue>{() => FREQUENCY_LABELS[frequency ?? 'monthly']}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABELS) as RecurringFrequency[]).map((f) => (
                    <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recurring-start" className="text-sm mb-1.5 block">
                {editing ? 'วันเริ่มรอบ' : 'เริ่มบันทึกวันที่'}
              </Label>
              <Input id="recurring-start" {...register('startDate')} type="date" />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="recurring-note" className="text-sm mb-1.5 block">หมายเหตุ (ไม่บังคับ)</Label>
            <Input id="recurring-note" {...register('note')} />
          </div>

          {backfills && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-200 dark:border-amber-500/20">
              วันเริ่มอยู่ในอดีต ระบบจะบันทึกย้อนหลังทุกรอบตั้งแต่วันนั้นจนถึงวันนี้
            </p>
          )}
          {editing && (
            <p className="text-xs text-gray-500 dark:text-white/50">
              การแก้ไขมีผลกับรอบถัดไปเท่านั้น รายการที่บันทึกไปแล้วจะไม่เปลี่ยน
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit">{editing ? 'บันทึกการแก้ไข' : 'เพิ่มรายการประจำ'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
