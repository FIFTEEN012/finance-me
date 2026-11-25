'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { todayKey } from '@/lib/recurring'
import { FillGauge } from '@/components/shared/FillGauge'
import { daysBetween, formatDuration, guessShape, SUPPLY_SHAPES, supplyShape } from '@/lib/supplies'
import { cn } from '@/lib/utils'
import { SupplyInput } from '@/store/useSupplyStore'
import { SupplyItem, SupplyShape } from '@/types'

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
    shape: z.enum(SUPPLY_SHAPES.map((s) => s.value) as [SupplyShape, ...SupplyShape[]]),
    expectedDays: z.union([z.nan(), z.number().int('ใส่เป็นจำนวนวันเต็ม').positive('ต้องมากกว่า 0')]).optional(),
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
    shape: v.shape,
    expectedDays: clean(v.expectedDays),
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
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })
  // Until the user picks a shape, keep guessing it from the name.
  const [shapePicked, setShapePicked] = useState(false)

  useEffect(() => {
    if (!open) return
    setShapePicked(!!editing?.shape)
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
          shape: supplyShape(editing),
          expectedDays: editing.expectedDays ?? NaN,
        }
      : {
          name: '', startDate: todayKey(), finished: false, finishedDate: todayKey(), price: NaN, quantity: NaN,
          unit: '', note: '', shape: guessShape(''), expectedDays: NaN,
        })
  }, [open, editing, reset])

  const name = watch('name')
  const shape = watch('shape')
  const nameField = register('name', {
    onChange: (e) => { if (!shapePicked) setValue('shape', guessShape(e.target.value)) },
  })

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
            <Input id="supply-name" {...nameField} list="supply-names" placeholder="เช่น ครีมกันแดด ยาสีฟัน" autoComplete="off" />
            <datalist id="supply-names">
              {knownNames.map((name) => <option key={name} value={name} />)}
            </datalist>
            <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
              ใช้ชื่อเดิมทุกครั้งที่ซื้อซ้ำ ระบบจะคำนวณว่าปกติใช้ได้กี่วัน
            </p>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <p id="supply-shape-label" className="text-sm font-medium mb-1.5">รูปทรง</p>
            <div role="radiogroup" aria-labelledby="supply-shape-label" className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {SUPPLY_SHAPES.map((option) => {
                const selected = shape === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => { setShapePicked(true); setValue('shape', option.value) }}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border p-1.5 text-xs transition-colors',
                      selected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    <FillGauge shape={option.value} level={0.6} className="h-10 w-auto" label={option.label} />
                    {option.label}
                  </button>
                )
              })}
            </div>
            {!shapePicked && name?.trim() && (
              <p className="text-xs text-gray-500 dark:text-white/50 mt-1">เดาจากชื่อให้แล้ว กดเลือกเองได้</p>
            )}
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

          <div>
            <Label htmlFor="supply-expected" className="text-sm mb-1.5 block">คาดว่าใช้ได้ (วัน)</Label>
            <Input
              id="supply-expected"
              {...register('expectedDays', { valueAsNumber: true })}
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              placeholder="ไม่บังคับ เช่น 30"
            />
            <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
              ใช้แสดงว่าเหลือเท่าไรจนกว่าจะมีประวัติการใช้จริง
            </p>
            {errors.expectedDays && <p className="text-xs text-red-500 mt-1">{errors.expectedDays.message}</p>}
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
