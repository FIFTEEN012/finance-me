'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { CURRENCY_SYMBOLS } from '@/lib/exchangeRates'

const schema = z.object({
  holdingId:     z.string().min(1, 'เลือกหลักทรัพย์'),
  amountPerUnit: z.number().nonnegative('ต้องไม่ติดลบ'),
  date:          z.string().min(1),
  note:          z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DividendForm({ open, onOpenChange }: Props) {
  const { holdings, addDividend } = useInvestmentStore()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { holdingId: '', amountPerUnit: NaN, date: new Date().toISOString().slice(0, 10), note: '' },
  })

  useEffect(() => {
    if (open) reset({ holdingId: '', amountPerUnit: NaN, date: new Date().toISOString().slice(0, 10), note: '' })
  }, [open, reset])

  const holdingId = watch('holdingId')
  const amountPerUnit = watch('amountPerUnit') || 0
  const holding = holdings.find((h) => h.id === holdingId)
  const totalAmount = holding ? holding.units * amountPerUnit : 0
  const sym = holding ? (CURRENCY_SYMBOLS[holding.currency ?? 'THB'] ?? holding.currency) : '฿'

  function onSubmit(data: FormValues) {
    if (!holding) return
    addDividend({
      holdingId: data.holdingId,
      amountPerUnit: data.amountPerUnit,
      totalAmount,
      date: data.date,
      note: data.note || undefined,
    })
    toast.success(`บันทึกเงินปันผล "${holding.name}" ${sym}${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>บันทึกเงินปันผล</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Holding selector */}
          <div>
            <Label className="text-sm mb-1.5 block">หลักทรัพย์</Label>
            <Select value={holdingId} onValueChange={(v) => setValue('holdingId', v ?? '')}>
              <SelectTrigger className={errors.holdingId ? 'border-red-400' : ''}>
                <SelectValue placeholder="เลือกหลักทรัพย์" />
              </SelectTrigger>
              <SelectContent>
                {holdings.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}{h.ticker ? ` (${h.ticker})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.holdingId && <p className="text-xs text-red-500 mt-1">{errors.holdingId.message}</p>}
          </div>

          {holding && (
            <p className="text-xs text-gray-400 dark:text-white/30 -mt-2">
              {holding.units.toLocaleString('th-TH')} หน่วย · สกุลเงิน {holding.currency ?? 'THB'}
            </p>
          )}

          {/* Amount per unit */}
          <div>
            <Label className="text-sm mb-1.5 block">เงินปันผล/หน่วย ({sym})</Label>
            <Input
              {...register('amountPerUnit', { valueAsNumber: true })}
              type="number" step="any" placeholder="0.00"
              className={errors.amountPerUnit ? 'border-red-400' : ''}
            />
            {errors.amountPerUnit && <p className="text-xs text-red-500 mt-1">{errors.amountPerUnit.message}</p>}
          </div>

          {/* Total preview */}
          {holding && amountPerUnit > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl px-4 py-2.5 flex justify-between text-sm">
              <span className="text-gray-500 dark:text-white/40">รวมที่ได้รับ</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {sym}{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Date */}
          <div>
            <Label className="text-sm mb-1.5 block">วันที่รับ</Label>
            <Input {...register('date')} type="date" />
          </div>

          {/* Note */}
          <div>
            <Label className="text-sm mb-1.5 block">หมายเหตุ (ไม่บังคับ)</Label>
            <Input {...register('note')} placeholder="เช่น ปันผลครึ่งปี Q2" />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
