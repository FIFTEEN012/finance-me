'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useGoalStore } from '@/store/useGoalStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { useExchangeRateStore } from '@/store/useExchangeRateStore'
import { Goal } from '@/types'

const ICON_OPTIONS = [
  'Target', 'Home', 'Car', 'Plane', 'GraduationCap', 'Heart',
  'Smartphone', 'Laptop', 'Baby', 'Ring', 'Umbrella', 'PiggyBank',
  'Wallet', 'TrendingUp', 'Star', 'Gift',
]

const COLOR_OPTIONS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ec4899', '#06b6d4', '#ef4444', '#f97316',
  '#14b8a6', '#84cc16', '#6366f1', '#64748b',
]

const schema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อเป้าหมาย').max(40),
  targetAmount: z.number().positive('จำนวนเงินต้องมากกว่า 0'),
  savedAmount: z.number().min(0),
  targetDate: z.string().min(1, 'กรุณาเลือกวันที่เป้าหมาย'),
  description: z.string().optional(),
  icon: z.string().min(1),
  color: z.string().min(1),
  linkedPortfolio: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

interface GoalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingGoal?: Goal | null
}

export function GoalForm({ open, onOpenChange, editingGoal }: GoalFormProps) {
  const { addGoal, updateGoal } = useGoalStore()
  const holdings  = useInvestmentStore((s) => s.holdings)
  const getRate   = useExchangeRateStore((s) => s.getRate)

  const portfolioValueTHB = holdings.reduce(
    (s, h) => s + h.units * h.currentPricePerUnit * getRate(h.currency ?? 'THB'), 0
  )

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { icon: 'Target', color: '#3b82f6', savedAmount: 0, linkedPortfolio: false },
  })

  const selectedIcon       = watch('icon')
  const selectedColor      = watch('color')
  const linkedPortfolio    = watch('linkedPortfolio')

  useEffect(() => {
    if (editingGoal) {
      reset({
        name: editingGoal.name,
        targetAmount: editingGoal.targetAmount,
        savedAmount: editingGoal.savedAmount,
        targetDate: editingGoal.targetDate,
        description: editingGoal.description ?? '',
        icon: editingGoal.icon,
        color: editingGoal.color,
        linkedPortfolio: editingGoal.linkedPortfolio ?? false,
      })
    } else {
      reset({ name: '', targetAmount: 0, savedAmount: 0, targetDate: '', description: '', icon: 'Target', color: '#3b82f6', linkedPortfolio: false })
    }
  }, [editingGoal, open, reset])

  const onSubmit = (data: FormValues) => {
    // For portfolio-linked goals, override savedAmount with current portfolio value
    const payload = data.linkedPortfolio
      ? { ...data, savedAmount: Math.round(portfolioValueTHB) }
      : data

    if (editingGoal) {
      updateGoal(editingGoal.id, payload)
      toast.success('แก้ไขเป้าหมายสำเร็จ')
    } else {
      addGoal(payload)
      toast.success('เพิ่มเป้าหมายสำเร็จ')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingGoal ? 'แก้ไขเป้าหมาย' : 'ตั้งเป้าหมายใหม่'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: selectedColor + '18' }}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: selectedColor + '30' }}>
              <CategoryIcon name={selectedIcon} className="w-5 h-5" style={{ color: selectedColor }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: selectedColor }}>
              {watch('name') || 'ชื่อเป้าหมาย'}
            </p>
          </div>

          {/* Portfolio link toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !linkedPortfolio
              setValue('linkedPortfolio', next)
              if (next) {
                setValue('icon', 'TrendingUp')
                setValue('color', '#10b981')
              }
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
              linkedPortfolio
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              เชื่อมต่อพอร์ตลงทุน
            </span>
            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              linkedPortfolio ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 dark:border-gray-600'
            }`}>
              {linkedPortfolio && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
          </button>

          {linkedPortfolio && (
            <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
              <p className="font-medium">📊 ซิงค์จากพอร์ตลงทุนอัตโนมัติ</p>
              <p className="text-emerald-600 dark:text-emerald-500">
                มูลค่าพอร์ตปัจจุบัน:{' '}
                <span className="font-bold">
                  ฿{portfolioValueTHB.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </p>
              <p className="text-emerald-600/70 dark:text-emerald-500/70">
                ความคืบหน้าจะอัปเดตอัตโนมัติทุกครั้งที่เปิดหน้าเป้าหมาย
              </p>
            </div>
          )}

          {/* Name */}
          <div>
            <Label className="text-sm mb-2 block">ชื่อเป้าหมาย</Label>
            <Input {...register('name')} placeholder={linkedPortfolio ? 'เช่น พอร์ตถึง 1 ล้าน' : 'เช่น ออมซื้อบ้าน, กองทุนฉุกเฉิน'} className={errors.name ? 'border-red-400' : ''} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Target amount */}
          <div>
            <Label className="text-sm mb-2 block">{linkedPortfolio ? 'มูลค่าพอร์ตที่ตั้งเป้า (บาท)' : 'เป้าหมาย (บาท)'}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">฿</span>
              <Input {...register('targetAmount', { valueAsNumber: true })} type="number" step="0.01" className={`pl-7 ${errors.targetAmount ? 'border-red-400' : ''}`} placeholder="0.00" />
            </div>
            {errors.targetAmount && <p className="text-xs text-red-500 mt-1">{errors.targetAmount.message}</p>}
          </div>

          {/* Saved so far — hidden for portfolio goals */}
          {!linkedPortfolio && (
            <div>
              <Label className="text-sm mb-2 block">ออมไปแล้ว (บาท)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">฿</span>
                <Input {...register('savedAmount', { valueAsNumber: true })} type="number" step="0.01" className="pl-7" placeholder="0.00" />
              </div>
            </div>
          )}

          {/* Target date */}
          <div>
            <Label className="text-sm mb-2 block">วันที่เป้าหมาย</Label>
            <Input {...register('targetDate')} type="date" className={errors.targetDate ? 'border-red-400' : ''} />
            {errors.targetDate && <p className="text-xs text-red-500 mt-1">{errors.targetDate.message}</p>}
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm mb-2 block">หมายเหตุ (ไม่บังคับ)</Label>
            <Input {...register('description')} placeholder="รายละเอียดเพิ่มเติม" />
          </div>

          {/* Icon */}
          <div>
            <Label className="text-sm mb-2 block">ไอคอน</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setValue('icon', icon)}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${selectedIcon === icon ? 'ring-2 ring-offset-1' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  style={selectedIcon === icon ? { backgroundColor: selectedColor + '25' } : {}}
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
                <button key={color} type="button" onClick={() => setValue('color', color)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Separator />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
              {editingGoal ? 'บันทึกการแก้ไข' : 'เพิ่มเป้าหมาย'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
