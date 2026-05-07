'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebtStore } from '@/store/useDebtStore'
import { Debt, DebtType } from '@/types'
import { cn } from '@/lib/utils'

const DEBT_TYPES: { value: DebtType; label: string }[] = [
  { value: 'credit_card',    label: 'บัตรเครดิต'      },
  { value: 'personal_loan',  label: 'สินเชื่อส่วนบุคคล' },
  { value: 'mortgage',       label: 'สินเชื่อบ้าน'     },
  { value: 'car_loan',       label: 'สินเชื่อรถยนต์'   },
  { value: 'student_loan',   label: 'เงินกู้การศึกษา'  },
  { value: 'other',          label: 'อื่นๆ'             },
]

const COLORS = ['#7c3aed','#6366f1','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#ec4899']

const schema = z.object({
  name:           z.string().min(1, 'ระบุชื่อหนี้'),
  type:           z.enum(['credit_card','personal_loan','mortgage','car_loan','student_loan','other']),
  totalAmount:    z.number().positive('ระบุวงเงินต้น'),
  currentBalance: z.number().min(0, 'ระบุยอดคงค้าง'),
  interestRate:   z.number().min(0).max(100),
  minPayment:     z.number().min(0, 'ระบุขั้นต่ำ'),
  dueDay:         z.number().min(1).max(28).optional(),
  color:          z.string(),
  note:           z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingDebt?: Debt | null
}

export function DebtForm({ open, onOpenChange, editingDebt }: Props) {
  const { addDebt, updateDebt } = useDebtStore()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'credit_card', color: COLORS[0], interestRate: 18, minPayment: 0 },
  })

  const selectedColor = watch('color')
  const selectedType  = watch('type')

  useEffect(() => {
    if (open) {
      if (editingDebt) {
        reset({
          name:           editingDebt.name,
          type:           editingDebt.type,
          totalAmount:    editingDebt.totalAmount,
          currentBalance: editingDebt.currentBalance,
          interestRate:   editingDebt.interestRate,
          minPayment:     editingDebt.minPayment,
          dueDay:         editingDebt.dueDay,
          color:          editingDebt.color,
          note:           editingDebt.note ?? '',
        })
      } else {
        reset({ type: 'credit_card', color: COLORS[0], interestRate: 18, minPayment: 0 })
      }
    }
  }, [open, editingDebt, reset])

  function onSubmit(data: FormValues) {
    if (editingDebt) {
      updateDebt(editingDebt.id, data)
    } else {
      addDebt(data)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md dark:bg-[oklch(0.105_0.024_270)] dark:border-white/[0.08]">
        <DialogHeader>
          <DialogTitle>{editingDebt ? 'แก้ไขหนี้' : 'เพิ่มหนี้ใหม่'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">ชื่อหนี้ / เจ้าหนี้</Label>
            <Input {...register('name')} placeholder="เช่น บัตรเครดิต KBank" className={cn(errors.name && 'border-red-400')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">ประเภทหนี้</Label>
            <Select value={selectedType} onValueChange={(v) => setValue('type', (v ?? 'other') as DebtType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEBT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">วงเงิน / ต้นเงินกู้ (฿)</Label>
              <Input type="number" {...register('totalAmount', { valueAsNumber: true })} placeholder="0" className={cn(errors.totalAmount && 'border-red-400')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ยอดคงค้างปัจจุบัน (฿)</Label>
              <Input type="number" {...register('currentBalance', { valueAsNumber: true })} placeholder="0" className={cn(errors.currentBalance && 'border-red-400')} />
            </div>
          </div>

          {/* Rate & Min */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">อัตราดอกเบี้ยต่อปี (%)</Label>
              <Input type="number" step="0.1" {...register('interestRate', { valueAsNumber: true })} placeholder="18" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ชำระขั้นต่ำ/เดือน (฿)</Label>
              <Input type="number" {...register('minPayment', { valueAsNumber: true })} placeholder="0" className={cn(errors.minPayment && 'border-red-400')} />
            </div>
          </div>

          {/* Due day + note */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">วันครบกำหนด (วันที่)</Label>
              <Input type="number" min={1} max={28} {...register('dueDay', { valueAsNumber: true })} placeholder="เช่น 25" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">โน้ต (ไม่บังคับ)</Label>
              <Input {...register('note')} placeholder="หมายเหตุ" />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-xs">สีป้าย</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setValue('color', c)}
                  className={cn('w-7 h-7 rounded-full border-2 transition-transform',
                    selectedColor === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white">
              {editingDebt ? 'บันทึก' : 'เพิ่มหนี้'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
