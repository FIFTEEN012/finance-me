'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowDown, ArrowLeftRight, ArrowUp, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useCategoryStore } from '@/store/useCategoryStore'
import { Category } from '@/types'
import { cn } from '@/lib/utils'

const ICON_OPTIONS = [
  'Briefcase', 'Store', 'TrendingUp', 'PlusCircle', 'Utensils', 'Car', 'Home',
  'HeartPulse', 'ShoppingBag', 'Tv', 'BookOpen', 'Zap', 'MoreHorizontal',
  'Wallet', 'CreditCard', 'Gift', 'Coffee', 'Plane', 'Music', 'Gamepad2',
  'Dumbbell', 'Baby', 'PawPrint', 'Wrench', 'Scissors', 'Phone', 'ArrowLeftRight',
]

const COLOR_OPTIONS = [
  '#22c55e', '#16a34a', '#15803d', '#86efac',
  '#ef4444', '#f97316', '#eab308', '#ec4899',
  '#8b5cf6', '#06b6d4', '#3b82f6', '#f59e0b',
  '#94a3b8', '#64748b', '#84cc16', '#14b8a6',
]

const schema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อหมวดหมู่').max(20, 'ชื่อยาวเกินไป'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
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
  const namePreview = watch('name')

  useEffect(() => {
    if (editingCategory) {
      reset({
        name: editingCategory.name,
        type: editingCategory.type,
        icon: editingCategory.icon,
        color: editingCategory.color,
      })
      return
    }

    reset({ name: '', type: 'EXPENSE', icon: 'MoreHorizontal', color: '#94a3b8' })
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
      <DialogContent className="flex max-h-[calc(100dvh-2.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-[1.5rem] border-2 border-[#becbb1] bg-[var(--quest-background)] p-0 text-[var(--quest-foreground)] shadow-[0_5px_0_0_#becbb1] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-foreground)] dark:shadow-[0_5px_0_0_#0f130c]">
        <DialogHeader className="border-b-2 border-[#becbb1] px-6 py-4 dark:border-[#3b4630] shrink-0">
          <DialogTitle className="font-quest-heading text-2xl font-black text-[#2b6c00] dark:text-[#87fe45]">
            {editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
          </DialogTitle>
          <p className="font-quest-body text-sm font-bold text-[var(--quest-muted)]">
            ปรับประเภท ไอคอน และสีของคลังหมวดหมู่ให้ตรงกับภารกิจการเงินของคุณ
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 font-quest-body">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="quest-soft-card flex items-center gap-4 p-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${selectedColor}22`, color: selectedColor }}
            >
              <CategoryIcon name={selectedIcon} className="h-8 w-8" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-quest-heading text-xl font-black text-[var(--quest-foreground)]">
                {namePreview || 'ชื่อหมวดหมู่'}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--quest-surface-soft)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--quest-outline)]">
                <Sparkles className="h-3.5 w-3.5" />
                {selectedType === 'INCOME' ? 'รายรับ' : selectedType === 'EXPENSE' ? 'รายจ่าย' : 'โอนย้าย'}
              </div>
            </div>
          </div>

          <div>
            <Label className="quest-field-label">ชื่อหมวดหมู่</Label>
            <Input
              {...register('name')}
              placeholder="เช่น ค่าอาหาร, เงินเดือน"
              className="quest-input"
            />
            {errors.name && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">{errors.name.message}</p>}
          </div>

          <div>
            <Label className="quest-field-label">ประเภท</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { value: 'INCOME' as const, label: 'รายรับ', Icon: ArrowDown, accent: 'bg-[#dff7d0] text-[#2b6c00] border-[#2b6c00]' },
                { value: 'EXPENSE' as const, label: 'รายจ่าย', Icon: ArrowUp, accent: 'bg-[#ffe0de] text-[#ba1a1a] border-[#ba1a1a]' },
                { value: 'TRANSFER' as const, label: 'โอนย้าย', Icon: ArrowLeftRight, accent: 'bg-[#e0f2fe] text-[#0369a1] border-[#0369a1]' },
              ].map(({ value, label, Icon, accent }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('type', value)}
                  className={cn(
                    'rounded-[1.25rem] border-2 px-4 py-3 text-left transition-all',
                    selectedType === value
                      ? 'border-[#2b6c00] bg-[#58cc02] text-[#1e5000] shadow-[0_4px_0_0_#1e5000]'
                      : 'border-[#becbb1] bg-[var(--quest-surface)] text-[var(--quest-muted)] shadow-[0_4px_0_0_#becbb1] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:shadow-[0_4px_0_0_#0f130c]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl border-2',
                        selectedType === value
                          ? 'border-[#1e5000] bg-white/25 text-[#1e5000]'
                          : accent
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black">{label}</p>
                      <p className="text-xs font-medium text-current/80">
                        {value === 'INCOME'
                          ? 'หมวดรับเงินและรายได้'
                          : value === 'EXPENSE'
                            ? 'หมวดค่าใช้จ่ายและต้นทุน'
                            : 'หมวดเงินย้ายที่'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="quest-field-label">ไอคอน</Label>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
              {ICON_OPTIONS.map((icon) => {
                const active = selectedIcon === icon
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setValue('icon', icon)}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all',
                      active
                        ? 'border-[#2b6c00] bg-[#58cc02] text-[#1e5000] shadow-[0_4px_0_0_#1e5000]'
                        : 'border-[#becbb1] bg-[var(--quest-surface)] text-[var(--quest-muted)] shadow-[0_3px_0_0_#becbb1] hover:-translate-y-0.5 dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:shadow-[0_3px_0_0_#0f130c]'
                    )}
                    title={icon}
                  >
                    <CategoryIcon name={icon} className="h-5 w-5" style={{ color: active ? '#1e5000' : selectedColor }} />
                  </button>
                )
              })}
            </div>
            {errors.icon && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">{errors.icon.message}</p>}
          </div>

          <div>
            <Label className="quest-field-label">สี</Label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((color) => {
                const active = selectedColor === color
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('color', color)}
                    className={cn(
                      'h-9 w-9 rounded-full border-2 transition-transform hover:scale-110',
                      active ? 'border-[var(--quest-foreground)] scale-110 shadow-[0_3px_0_0_rgba(0,0,0,0.15)]' : 'border-white'
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                )
              })}
            </div>
            {errors.color && <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">{errors.color.message}</p>}
          </div>

          </div>

          <DialogFooter className="m-0 flex-row justify-end gap-2 rounded-none border-t-2 border-[#becbb1] bg-[var(--quest-surface-low)] px-4 py-3 dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)] sm:px-6 sm:py-4 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="quest-secondary-button min-w-[5.25rem] px-4"
            >
              ยกเลิก
            </Button>
            <Button type="submit" className="quest-action-button min-w-0 px-4 sm:px-5">
              <Plus className="h-4 w-4" />
              {editingCategory ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
