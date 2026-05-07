'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { RecurringTransaction, TransactionType } from '@/types'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { THAI_MONTHS } from '@/lib/utils'

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().min(1, 'กรุณาเลือกหมวดหมู่'),
  amount: z.number().positive('จำนวนเงินต้องมากกว่า 0'),
  description: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  note: z.string().optional(),
  frequency: z.enum(['monthly', 'yearly']),
  dayOfMonth: z.number().int().min(1).max(28),
  startMonth: z.number().int().min(1).max(12),
  startYear: z.number().int(),
})

type FormValues = z.infer<typeof schema>

interface RecurringFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingRecurring?: RecurringTransaction | null
}

export function RecurringForm({ open, onOpenChange, editingRecurring }: RecurringFormProps) {
  const { addRecurring, updateRecurring } = useRecurringStore()
  const { categories } = useCategoryStore()

  const now = new Date()
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'EXPENSE',
      frequency: 'monthly',
      dayOfMonth: 1,
      startMonth: now.getMonth() + 1,
      startYear: now.getFullYear(),
    },
  })

  const selectedType = watch('type')
  const selectedCategoryId = watch('categoryId')
  const selectedFrequency = watch('frequency')
  const selectedMonth = watch('startMonth')
  const selectedYear = watch('startYear')

  const filteredCategories = categories.filter((c) => c.type === selectedType)

  useEffect(() => {
    if (editingRecurring) {
      const start = new Date(editingRecurring.startDate)
      reset({
        type: editingRecurring.type,
        categoryId: editingRecurring.categoryId,
        amount: editingRecurring.amount,
        description: editingRecurring.description,
        note: editingRecurring.note ?? '',
        frequency: editingRecurring.frequency,
        dayOfMonth: editingRecurring.dayOfMonth,
        startMonth: start.getMonth() + 1,
        startYear: start.getFullYear(),
      })
    } else {
      reset({
        type: 'EXPENSE',
        categoryId: '',
        amount: 0,
        description: '',
        note: '',
        frequency: 'monthly',
        dayOfMonth: 1,
        startMonth: now.getMonth() + 1,
        startYear: now.getFullYear(),
      })
    }
  }, [editingRecurring, open, reset])

  const onSubmit = (data: FormValues) => {
    const startDate = new Date(data.startYear, data.startMonth - 1, 1)
      .toISOString()
      .slice(0, 10)

    if (editingRecurring) {
      updateRecurring(editingRecurring.id, {
        type: data.type as TransactionType,
        categoryId: data.categoryId,
        amount: data.amount,
        description: data.description,
        note: data.note,
        frequency: data.frequency,
        dayOfMonth: data.dayOfMonth,
        startDate,
      })
      toast.success('แก้ไขรายการประจำสำเร็จ')
    } else {
      addRecurring({
        type: data.type as TransactionType,
        categoryId: data.categoryId,
        amount: data.amount,
        description: data.description,
        note: data.note,
        frequency: data.frequency,
        dayOfMonth: data.dayOfMonth,
        startDate,
        isActive: true,
      })
      toast.success('เพิ่มรายการประจำสำเร็จ')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRecurring ? 'แก้ไขรายการประจำ' : 'เพิ่มรายการประจำ'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('type', t); setValue('categoryId', '') }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  selectedType === t
                    ? t === 'INCOME'
                      ? 'bg-violet-600 text-white'
                      : 'bg-red-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {t === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}
              </button>
            ))}
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm mb-2 block">หมวดหมู่</Label>
            <Select value={selectedCategoryId} onValueChange={(v) => setValue('categoryId', v ?? '')}>
              <SelectTrigger className={errors.categoryId ? 'border-red-400' : ''}>
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat) => (
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

          {/* Amount */}
          <div>
            <Label className="text-sm mb-2 block">จำนวนเงิน (บาท)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">฿</span>
              <Input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className={`pl-7 ${errors.amount ? 'border-red-400' : ''}`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm mb-2 block">รายละเอียด</Label>
            <Input {...register('description')} placeholder="เช่น เงินเดือน, ค่าเช่าบ้าน" className={errors.description ? 'border-red-400' : ''} />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          {/* Frequency */}
          <div>
            <Label className="text-sm mb-2 block">ความถี่</Label>
            <Select value={selectedFrequency} onValueChange={(v) => setValue('frequency', (v ?? 'monthly') as 'monthly' | 'yearly')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">ทุกเดือน</SelectItem>
                <SelectItem value="yearly">ทุกปี</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day of month */}
          <div>
            <Label className="text-sm mb-2 block">วันที่ของเดือน (1-28)</Label>
            <Input
              {...register('dayOfMonth', { valueAsNumber: true })}
              type="number"
              min={1}
              max={28}
              className={errors.dayOfMonth ? 'border-red-400' : ''}
              placeholder="1"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">จำกัดที่ 28 เพื่อรองรับทุกเดือน</p>
            {errors.dayOfMonth && <p className="text-xs text-red-500 mt-1">{errors.dayOfMonth.message}</p>}
          </div>

          {/* Start month/year */}
          <div>
            <Label className="text-sm mb-2 block">เริ่มตั้งแต่</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={String(selectedMonth)} onValueChange={(v) => setValue('startMonth', Number(v ?? selectedMonth))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {THAI_MONTHS.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(v) => setValue('startYear', Number(v ?? selectedYear))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="text-sm mb-2 block">หมายเหตุ (ไม่บังคับ)</Label>
            <Input {...register('note')} placeholder="หมายเหตุเพิ่มเติม" />
          </div>

          <Separator />

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
              {editingRecurring ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
