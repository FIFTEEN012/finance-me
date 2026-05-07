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
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useNetWorthStore } from '@/store/useNetWorthStore'
import { NetWorthItem, NetWorthItemType } from '@/types'

export const ASSET_CATEGORIES = [
  { value: 'savings',    label: 'เงินฝาก',          icon: 'Landmark',     color: '#22c55e' },
  { value: 'investment', label: 'การลงทุน',           icon: 'TrendingUp',   color: '#3b82f6' },
  { value: 'property',   label: 'อสังหาริมทรัพย์',    icon: 'Home',         color: '#f59e0b' },
  { value: 'vehicle',    label: 'ยานพาหนะ',           icon: 'Car',          color: '#8b5cf6' },
  { value: 'crypto',     label: 'คริปโต',             icon: 'Bitcoin',      color: '#f97316' },
  { value: 'other_asset',label: 'สินทรัพย์อื่นๆ',    icon: 'Package',      color: '#64748b' },
]

export const LIABILITY_CATEGORIES = [
  { value: 'home_loan',  label: 'สินเชื่อบ้าน',       icon: 'Building2',    color: '#ef4444' },
  { value: 'car_loan',   label: 'สินเชื่อรถ',          icon: 'Car',          color: '#f97316' },
  { value: 'personal',   label: 'สินเชื่อส่วนบุคคล',  icon: 'User',         color: '#ec4899' },
  { value: 'credit',     label: 'บัตรเครดิต',          icon: 'CreditCard',   color: '#f43f5e' },
  { value: 'other_liab', label: 'หนี้อื่นๆ',           icon: 'AlertCircle',  color: '#94a3b8' },
]

const schema = z.object({
  type: z.enum(['ASSET', 'LIABILITY']),
  category: z.string().min(1, 'กรุณาเลือกประเภท'),
  name: z.string().min(1, 'กรุณาระบุชื่อ').max(40),
  amount: z.number().positive('จำนวนเงินต้องมากกว่า 0'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface NetWorthFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItem?: NetWorthItem | null
  defaultType?: NetWorthItemType
}

export function NetWorthForm({ open, onOpenChange, editingItem, defaultType = 'ASSET' }: NetWorthFormProps) {
  const { addItem, updateItem } = useNetWorthStore()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, category: '' },
  })

  const selectedType = watch('type')
  const selectedCategory = watch('category')
  const categoryList = selectedType === 'ASSET' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
  const catMeta = categoryList.find((c) => c.value === selectedCategory)

  useEffect(() => {
    if (editingItem) {
      reset({
        type: editingItem.type,
        category: editingItem.category,
        name: editingItem.name,
        amount: editingItem.amount,
        note: editingItem.note ?? '',
      })
    } else {
      reset({ type: defaultType, category: '', name: '', amount: 0, note: '' })
    }
  }, [editingItem, open, reset, defaultType])

  const onSubmit = (data: FormValues) => {
    const catMeta = (data.type === 'ASSET' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES)
      .find((c) => c.value === data.category)

    const payload = {
      type: data.type,
      category: data.category,
      name: data.name,
      amount: data.amount,
      note: data.note,
      icon: catMeta?.icon ?? 'Circle',
      color: catMeta?.color ?? '#94a3b8',
    }

    if (editingItem) {
      updateItem(editingItem.id, payload)
      toast.success('แก้ไขรายการสำเร็จ')
    } else {
      addItem(payload)
      toast.success('เพิ่มรายการสำเร็จ')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['ASSET', 'LIABILITY'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('type', t); setValue('category', '') }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  selectedType === t
                    ? t === 'ASSET' ? 'bg-violet-600 text-white' : 'bg-red-500 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {t === 'ASSET' ? 'สินทรัพย์' : 'หนี้สิน'}
              </button>
            ))}
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm mb-2 block">ประเภท</Label>
            <Select value={selectedCategory ?? ''} onValueChange={(v) => setValue('category', v ?? '')}>
              <SelectTrigger className={errors.category ? 'border-red-400' : ''}>
                <SelectValue placeholder="เลือกประเภท">
                  {catMeta && (
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={catMeta.icon} className="w-4 h-4" style={{ color: catMeta.color }} />
                      {catMeta.label}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categoryList.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={c.icon} className="w-4 h-4" style={{ color: c.color }} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
          </div>

          {/* Name */}
          <div>
            <Label className="text-sm mb-2 block">ชื่อ</Label>
            <Input
              {...register('name')}
              placeholder={selectedType === 'ASSET' ? 'เช่น บัญชีออมทรัพย์ SCB, หุ้น NVDA' : 'เช่น สินเชื่อบ้านธนาคาร, Visa Platinum'}
              className={errors.name ? 'border-red-400' : ''}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Amount */}
          <div>
            <Label className="text-sm mb-2 block">
              {selectedType === 'ASSET' ? 'มูลค่าปัจจุบัน (บาท)' : 'ยอดค้างชำระ (บาท)'}
            </Label>
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

          {/* Note */}
          <div>
            <Label className="text-sm mb-2 block">หมายเหตุ (ไม่บังคับ)</Label>
            <Input {...register('note')} placeholder="รายละเอียดเพิ่มเติม" />
          </div>

          <Separator />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
              {editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
