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
import { useCategoryStore } from '@/store/useCategoryStore'
import { Category } from '@/types'

const ICON_OPTIONS = [
  'Briefcase', 'Store', 'TrendingUp', 'PlusCircle', 'Utensils', 'Car', 'Home',
  'HeartPulse', 'ShoppingBag', 'Tv', 'BookOpen', 'Zap', 'MoreHorizontal',
  'Wallet', 'CreditCard', 'Gift', 'Coffee', 'Plane', 'Music', 'Gamepad2',
  'Dumbbell', 'Baby', 'PawPrint', 'Wrench', 'Scissors', 'Phone',
]

const COLOR_OPTIONS = [
  '#22c55e', '#16a34a', '#15803d', '#86efac',
  '#ef4444', '#f97316', '#eab308', '#ec4899',
  '#8b5cf6', '#06b6d4', '#3b82f6', '#f59e0b',
  '#94a3b8', '#64748b', '#84cc16', '#14b8a6',
]

const schema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อหมวดหมู่').max(20, 'ชื่อยาวเกินไป'),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().min(1, 'กรุณาเลือกไอคอน'),
  color: z.string().min(1, 'กรุณาเลือกสี'),
})

type FormValues = z.infer<typeof schema>

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCategory?: Category | null
}

export function CategoryForm({ open, onOpenChange, editingCategory }: CategoryFormProps) {
  const { addCategory, updateCategory } = useCategoryStore()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'EXPENSE', icon: 'MoreHorizontal', color: '#94a3b8' },
  })

  const selectedIcon = watch('icon')
  const selectedColor = watch('color')
  const selectedType = watch('type')

  useEffect(() => {
    if (editingCategory) {
      reset({
        name: editingCategory.name,
        type: editingCategory.type,
        icon: editingCategory.icon,
        color: editingCategory.color,
      })
    } else {
      reset({ name: '', type: 'EXPENSE', icon: 'MoreHorizontal', color: '#94a3b8' })
    }
  }, [editingCategory, open, reset])

  const onSubmit = (data: FormValues) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, data)
      toast.success('แก้ไขหมวดหมู่สำเร็จ')
    } else {
      addCategory(data)
      toast.success('เพิ่มหมวดหมู่สำเร็จ')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{ backgroundColor: selectedColor + '25' }}
            >
              <CategoryIcon name={selectedIcon} className="w-5 h-5" style={{ color: selectedColor }} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{watch('name') || 'ชื่อหมวดหมู่'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{selectedType === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <Label className="text-sm mb-2 block">ชื่อหมวดหมู่</Label>
            <Input {...register('name')} placeholder="เช่น ค่าอาหาร, เงินเดือน" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Type */}
          <div>
            <Label className="text-sm mb-2 block">ประเภท</Label>
            <Select value={selectedType} onValueChange={(v) => setValue('type', (v ?? 'EXPENSE') as 'INCOME' | 'EXPENSE')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">รายรับ</SelectItem>
                <SelectItem value="EXPENSE">รายจ่าย</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Icon */}
          <div>
            <Label className="text-sm mb-2 block">ไอคอน</Label>
            <div className="grid grid-cols-9 gap-1.5">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setValue('icon', icon)}
                  className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                    selectedIcon === icon
                      ? 'ring-2 ring-offset-1'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  style={selectedIcon === icon ? { outlineColor: selectedColor, backgroundColor: selectedColor + '20' } : {}}
                  title={icon}
                >
                  <CategoryIcon name={icon} className="w-4 h-4" style={{ color: selectedIcon === icon ? selectedColor : '#6b7280' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <Label className="text-sm mb-2 block">สี</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <Separator />

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
              {editingCategory ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
