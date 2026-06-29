'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { Transaction, TransactionType } from '@/types'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { TagInput } from '@/components/shared/TagInput'

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().min(1, 'กรุณาเลือกหมวดหมู่'),
  amount: z.number().positive('จำนวนเงินต้องมากกว่า 0'),
  description: z.string().min(1, 'กรุณาระบุรายละเอียด'),
  note: z.string().optional(),
  date: z.date(),
})

type FormValues = z.infer<typeof schema>

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTransaction?: Transaction | null
}

export function TransactionForm({ open, onOpenChange, editingTransaction }: TransactionFormProps) {
  const { addTransaction, updateTransaction, getAllTags } = useTransactionStore()
  const { categories } = useCategoryStore()
  const [tags, setTags] = useState<string[]>([])
  const allTags = getAllTags()

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
      date: new Date(),
      description: '',
      note: '',
    },
  })

  const selectedType = watch('type')
  const selectedDate = watch('date')
  const selectedCategoryId = watch('categoryId')

  const filteredCategories = categories.filter((c) => c.type === selectedType)

  useEffect(() => {
    if (editingTransaction) {
      reset({
        type: editingTransaction.type,
        categoryId: editingTransaction.categoryId,
        amount: editingTransaction.amount,
        description: editingTransaction.description,
        note: editingTransaction.note ?? '',
        date: new Date(editingTransaction.date),
      })
      setTags(editingTransaction.tags ?? [])
    } else {
      reset({ type: 'EXPENSE', date: new Date(), description: '', note: '', categoryId: '', amount: 0 })
      setTags([])
    }
  }, [editingTransaction, reset, open])

  // Reset categoryId when type changes
  useEffect(() => {
    if (!editingTransaction) {
      setValue('categoryId', '')
    }
  }, [selectedType, editingTransaction, setValue])

  const onSubmit = (data: FormValues) => {
    const payload = {
      type: data.type as TransactionType,
      categoryId: data.categoryId,
      amount: data.amount,
      description: data.description,
      note: data.note,
      tags: tags.length > 0 ? tags : undefined,
      date: `${data.date.getFullYear()}-${String(data.date.getMonth() + 1).padStart(2, '0')}-${String(data.date.getDate()).padStart(2, '0')}`,
    }
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, payload)
      toast.success('แก้ไขรายการสำเร็จ')
    } else {
      addTransaction(payload)
      toast.success('เพิ่มรายการสำเร็จ')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingTransaction ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div>
            <Label className="text-sm mb-2 block">ประเภท</Label>
            <div className="flex gap-2">
              {(['INCOME', 'EXPENSE'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('type', t)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    selectedType === t
                      ? t === 'INCOME'
                        ? 'bg-violet-50 border-violet-500 text-violet-700'
                        : 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}
                >
                  {t === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm mb-2 block">หมวดหมู่</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={(v) => setValue('categoryId', v ?? '')}
            >
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
                className={cn('pl-7', errors.amount ? 'border-red-400' : '')}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm mb-2 block">รายละเอียด</Label>
            <Input
              {...register('description')}
              className={errors.description ? 'border-red-400' : ''}
              placeholder="เช่น ค่าข้าวกลางวัน"
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          {/* Date */}
          <div>
            <Label className="text-sm mb-2 block">วันที่</Label>
            <Popover>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'w-full justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'เลือกวันที่'}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setValue('date', d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Note */}
          <div>
            <Label className="text-sm mb-2 block">หมายเหตุ (ไม่บังคับ)</Label>
            <Input {...register('note')} placeholder="หมายเหตุเพิ่มเติม" />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-sm mb-2 block">แท็ก (ไม่บังคับ)</Label>
            <TagInput value={tags} onChange={setTags} suggestions={allTags} />
          </div>

          <Separator />

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className={cn(
                selectedType === 'INCOME'
                  ? 'bg-violet-600 hover:bg-violet-700'
                  : 'bg-red-500 hover:bg-red-600'
              )}
            >
              {editingTransaction ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
