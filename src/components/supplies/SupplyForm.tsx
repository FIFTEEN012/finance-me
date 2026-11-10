'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { todayKey } from '@/lib/recurring'
import { daysBetween, formatDuration } from '@/lib/supplies'
import { SupplyInput } from '@/store/useSupplyStore'
import { SupplyItem } from '@/types'

const DATE = /^\d{4}-\d{2}-\d{2}$/

// An empty number input arrives as NaN, which means "not given".
const optionalPositive = z.union([z.nan(), z.number().positive('ต้องมากกว่า 0')]).optional()

const schema = z
  .object({
    name: z.string().trim().min(1, 'กรุณาระบุชื่อสินค้า'),
    startDate: z.string().regex(DATE, 'กรุณาเลือกวันที่'),
    finished: z.boolean(),
    finishedDate: z.string().optional(),
    price: optionalPositive,
    quantity: optionalPositive,
    unit: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.startDate > todayKey()) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'วันที่เริ่มใช้ต้องไม่อยู่ในอนาคต' })
    }
    if (!v.finished) return
    if (!v.finishedDate || !DATE.test(v.finishedDate)) {
      ctx.addIssue({ code: 'custom', path: ['finishedDate'], message: 'กรุณาเลือกวันที่ใช้หมด' })
    } else if (v.finishedDate < v.startDate) {
      ctx.addIssue({ code: 'custom', path: ['finishedDate'], message: 'วันที่ใช้หมดต้องไม่ก่อนวันที่เริ่มใช้' })
    } else if (v.finishedDate > todayKey()) {
      ctx.addIssue({ code: 'custom', path: ['finishedDate'], message: 'วันที่ใช้หมดต้องไม่อยู่ในอนาคต' })
    }
  })

type FormValues = z.infer<typeof schema>

function clean(n: number | undefined): number | undefined {
  return n === undefined || Number.isNaN(n) ? undefined : n
}

export function toSupplyInput(v: FormValues): SupplyInput {
  return {
    name: v.name.trim().replace(/\s+/g, ' '),
    startDate: v.startDate,
    finishedDate: v.finished ? v.finishedDate : undefined,
    price: clean(v.price),
    quantity: clean(v.quantity),
    unit: v.unit?.trim() || undefined,
    note: v.note?.trim() || undefined,
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: SupplyItem | null
  knownNames: string[]
  onSubmit: (input: SupplyInput) => void
}

export function SupplyForm({ open, onOpenChange, editing, knownNames, onSubmit }: Props) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    reset(editing
      ? {
          name: editing.name,
          startDate: editing.startDate,
          finished: !!editing.finishedDate,
          finishedDate: editing.finishedDate ?? todayKey(),
          price: editing.price ?? NaN,
          quantity: editing.quantity ?? NaN,
          unit: editing.unit ?? '',
          note: editing.note ?? '',
        }
      : { name: '', startDate: todayKey(), finished: false, finishedDate: todayKey(), price: NaN, quantity: NaN, unit: '', note: '' })
  }, [open, editing, reset])

  const finished = watch('finished')
  const startDate = watch('startDate')
  const finishedDate = watch('finishedDate')
  const lasted = finished && startDate && finishedDate && finishedDate >= startDate
    ? daysBetween(startDate, finishedDate)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'แก้ไขของใช้' : 'เพิ่มของใช้'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => onSubmit(toSupplyInput(v)))} className="space-y-4">
          <div>
            <Label htmlFor="supply-name" className="text-sm mb-1.5 block">ชื่อสินค้า</Label>
            <Input id="supply-name" {...register('name')} list="supply-names" placeholder="เช่น ครีมกันแดด ยาสีฟัน" autoComplete="off" />
            <datalist id="supply-names">
              {knownNames.map((name) => <option key={name} value={name} />)}
            </datalist>
            <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
              ใช้ชื่อเดิมทุกครั้งที่ซื้อซ้ำ ระบบจะคำนวณว่าปกติใช้ได้กี่วัน
            </p>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="supply-start" className="text-sm mb-1.5 block">วันที่ซื้อหรือเริ่มใช้</Label>
            <Input id="supply-start" {...register('startDate')} type="date" max={todayKey()} />
            {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="supply-price" className="text-sm mb-1.5 block">ราคา (บาท)</Label>
              <Input
                id="supply-price"
                {...register('price', { valueAsNumber: true })}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="ไม่บังคับ"
              />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
            </div>
            <div>
              <Label htmlFor="supply-quantity" className="text-sm mb-1.5 block">ปริมาณ</Label>
              <div className="flex gap-2">
                <Input
                  id="supply-quantity"
                  {...register('quantity', { valueAsNumber: true })}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  placeholder="เช่น 200"
                  className="min-w-0"
                />
                <Input {...register('unit')} aria-label="หน่วย" placeholder="ml" className="w-16 shrink-0" />
              </div>
              {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity.message}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" {...register('finished')} className="w-4 h-4 accent-emerald-600" />
            ใช้หมดแล้ว
          </label>

          {finished && (
            <div>
              <Label htmlFor="supply-finished" className="text-sm mb-1.5 block">วันที่ใช้หมด</Label>
              <Input id="supply-finished" {...register('finishedDate')} type="date" min={startDate} max={todayKey()} />
              {errors.finishedDate && <p className="text-xs text-red-500 mt-1">{errors.finishedDate.message}</p>}
              {lasted !== null && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">ใช้ได้ {formatDuration(lasted)}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="supply-note" className="text-sm mb-1.5 block">หมายเหตุ (ไม่บังคับ)</Label>
            <Input id="supply-note" {...register('note')} placeholder="เช่น ยี่ห้อ ร้านที่ซื้อ" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit">{editing ? 'บันทึกการแก้ไข' : 'เพิ่มของใช้'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
