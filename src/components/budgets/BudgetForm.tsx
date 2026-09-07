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
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { Budget } from '@/types'
import { THAI_MONTHS } from '@/lib/utils'
import { CategoryIcon } from '@/components/shared/CategoryIcon'

const schema = z.object({
  categoryId: z.string().min(1, 'กรุณาเลือกหมวดหมู่'),
  amount: z.number().positive('จำนวนเงินต้องมากกว่า 0'),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  allowRollover: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface BudgetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingBudget?: Budget | null
  defaultMonth?: number
  defaultYear?: number
}

export function BudgetForm({ open, onOpenChange, editingBudget, defaultMonth, defaultYear }: BudgetFormProps) {
  const { addBudget, updateBudget, getBudget } = useBudgetStore()
  const { categories } = useCategoryStore()
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  const now = new Date()
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      month: defaultMonth ?? now.getMonth() + 1,
      year: defaultYear ?? now.getFullYear(),
      allowRollover: false,
    },
  })

  const selectedCategoryId = watch('categoryId')
  const selectedMonth = watch('month')
  const selectedYear = watch('year')
  const allowRollover = watch('allowRollover')

  useEffect(() => {
    if (editingBudget) {
      reset({
        categoryId: editingBudget.categoryId,
        amount: editingBudget.amount,
        month: editingBudget.month,
        year: editingBudget.year,
        allowRollover: editingBudget.allowRollover ?? false,
      })
    } else {
      const currentDate = new Date()
      reset({
        categoryId: '',
        amount: 0,
        month: defaultMonth ?? currentDate.getMonth() + 1,
        year: defaultYear ?? currentDate.getFullYear(),
        allowRollover: false,
      })
    }
  }, [editingBudget, open, reset, defaultMonth, defaultYear])

  const onSubmit = (data: FormValues) => {
    // Check duplicate
    const existing = getBudget(data.categoryId, data.month, data.year)
    if (existing && (!editingBudget || existing.id !== editingBudget.id)) {
      setError('categoryId', { message: 'มีงบประมาณสำหรับหมวดหมู่นี้ในเดือนนี้แล้ว' })
      return
    }

    if (editingBudget) {
      updateBudget(editingBudget.id, {
        categoryId: data.categoryId,
        amount: data.amount,
        month: data.month,
        year: data.year,
        allowRollover: data.allowRollover,
      })
      toast.success('แก้ไขงบประมาณสำเร็จ')
    } else {
      addBudget({
        categoryId: data.categoryId,
        amount: data.amount,
        month: data.month,
        year: data.year,
        allowRollover: data.allowRollover,
      })
      toast.success('เพิ่มงบประมาณสำเร็จ')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingBudget ? 'แก้ไขงบประมาณ' : 'ตั้งงบประมาณใหม่'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Month & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-2 block">เดือน</Label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setValue('month', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THAI_MONTHS.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2 block">ปี (พ.ศ.)</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setValue('year', Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y + 543}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm mb-2 block">หมวดหมู่รายจ่าย</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={(v) => setValue('categoryId', v ?? '')}
            >
              <SelectTrigger className={errors.categoryId ? 'border-red-400' : ''}>
                <SelectValue placeholder="เลือกหมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
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
            <Label className="text-sm mb-2 block">งบประมาณ (บาท)</Label>
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

          {/* Rollover toggle */}
          <div
            className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 cursor-pointer"
            onClick={() => setValue('allowRollover', !allowRollover)}
          >
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">ทบยอดงบเหลือ</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">งบที่ใช้ไม่หมดจากเดือนก่อนจะทบมาเดือนนี้</p>
            </div>
            <div className={`relative w-10 h-5 rounded-full transition-colors ${allowRollover ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allowRollover ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          <Separator />

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
              {editingBudget ? 'บันทึกการแก้ไข' : 'ตั้งงบประมาณ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
