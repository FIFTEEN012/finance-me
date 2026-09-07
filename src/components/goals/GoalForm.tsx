'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { TrendingUp, Sparkles, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useGoalStore } from '@/store/useGoalStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { Goal } from '@/types'

const EMOJI_OPTIONS = ['✈️', '💻', '🏠', '🚗', '🎮', '🎁', '🎓', '🍔', '💰', '🛒', '🏥', '🎯']

const COLOR_OPTIONS = [
  '#22c55e', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ef4444', // Rose
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
  const holdings = useInvestmentStore((s) => s.holdings)

  const portfolioValueTHB = holdings.reduce(
    (s, h) => s + h.units * h.currentPricePerUnit,
    0
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { icon: '✈️', color: '#22c55e', savedAmount: 0, linkedPortfolio: false },
  })

  const selectedIcon = watch('icon')
  const selectedColor = watch('color')
  const linkedPortfolio = watch('linkedPortfolio')

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
      reset({
        name: '',
        targetAmount: 0,
        savedAmount: 0,
        targetDate: '',
        description: '',
        icon: '✈️',
        color: '#22c55e',
        linkedPortfolio: false,
      })
    }
  }, [editingGoal, open, reset])

  const onSubmit = (data: FormValues) => {
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

  // Check if active icon is a Lucide icon (not in our emoji list)
  const isCustomLucideIcon = selectedIcon && !EMOJI_OPTIONS.includes(selectedIcon)

  // Check if active color is custom (not in COLOR_OPTIONS)
  const isCustomColor = selectedColor && !COLOR_OPTIONS.includes(selectedColor)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 shadow-[0_12px_0_0_rgba(0,0,0,0.1)] rounded-[32px] p-0 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors cursor-pointer z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="text-center space-y-2 px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-950/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-450 mb-1 shadow-[0_4px_0_0_#a7f3d0] dark:shadow-none">
              <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-slate-100 leading-tight">
              {editingGoal ? 'แก้ไขภารกิจการออม' : 'สร้างภารกิจการออมใหม่'}
            </h2>
            <p className="text-sm text-slate-505 dark:text-slate-450 font-medium">
              ตั้งเป้าหมายของคุณ แล้วมาพิชิตมันไปด้วยกัน!
            </p>
          </div>

          {/* Form Fields */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
            {/* Preview Banner */}
            <div
              className="flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all"
              style={{
                backgroundColor: selectedColor + '12',
                borderColor: selectedColor + '30',
              }}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl border-2 text-xl shrink-0"
                style={{
                  backgroundColor: selectedColor + '20',
                  borderColor: selectedColor + '40',
                }}
              >
                {!isCustomLucideIcon ? (
                  <span className="select-none">{selectedIcon}</span>
                ) : (
                  <CategoryIcon name={selectedIcon} className="w-6 h-6" style={{ color: selectedColor }} />
                )}
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: selectedColor }}>
                  {watch('name') || 'ชื่อเป้าหมายของฉัน'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-bold">
                  {watch('targetAmount') > 0
                    ? `เป้าหมาย: ฿${Number(watch('targetAmount')).toLocaleString('th-TH')}`
                    : 'ระบุยอดเป้าหมายออมเงินด้านล่าง'}
                </p>
              </div>
            </div>

            {/* Portfolio Link Option */}
            <button
              type="button"
              onClick={() => {
                const next = !linkedPortfolio
                setValue('linkedPortfolio', next)
                if (next) {
                  setValue('icon', '📈')
                  setValue('color', '#22c55e')
                }
              }}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all text-sm font-bold ${
                linkedPortfolio
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5" />
                เชื่อมต่อพอร์ตลงทุน
              </span>
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  linkedPortfolio
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-300 dark:border-slate-650'
                }`}
              >
                {linkedPortfolio && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
              </span>
            </button>

            {linkedPortfolio && (
              <div className="px-5 py-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                <p className="font-bold">📊 ซิงค์ข้อมูลพอร์ตอัตโนมัติ</p>
                <p className="font-medium mt-0.5">
                  มูลค่าพอร์ตปัจจุบัน:{' '}
                  <span className="font-black">
                    ฿{portfolioValueTHB.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </p>
                <p className="opacity-75">ความคืบหน้าจะอัปเดตอัตโนมัติทุกครั้งที่เข้าหน้านี้</p>
              </div>
            )}

            {/* Name */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                ชื่อเป้าหมาย
              </Label>
              <Input
                {...register('name')}
                placeholder={linkedPortfolio ? 'เช่น พอร์ตล้านแรก' : 'เช่น เที่ยวญี่ปุ่น, ซื้อ MacBook'}
                className={`w-full px-4 py-3 rounded-2xl border-2 focus:border-[var(--quest-primary-container)] focus:ring-0 font-bold text-slate-800 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 placeholder:text-slate-350 transition-all ${
                  errors.name ? 'border-red-400' : 'border-slate-200'
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 font-bold">{errors.name.message}</p>}
            </div>

            {/* Target Amount */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {linkedPortfolio ? 'มูลค่าพอร์ตเป้าหมาย (฿)' : 'จำนวนเงินที่ต้องการ (฿)'}
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">฿</span>
                <Input
                  {...register('targetAmount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className={`w-full pl-8 pr-4 py-3 rounded-2xl border-2 focus:border-[var(--quest-primary-container)] focus:ring-0 font-bold text-slate-800 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 placeholder:text-slate-350 transition-all ${
                    errors.targetAmount ? 'border-red-400' : 'border-slate-200'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.targetAmount && <p className="text-xs text-red-500 font-bold">{errors.targetAmount.message}</p>}
            </div>

            {/* Saved Amount (Hidden for linked portfolios) */}
            {!linkedPortfolio && (
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  ยอดเงินสะสมเริ่มต้น (฿)
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">฿</span>
                  <Input
                    {...register('savedAmount', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 rounded-2xl border-2 focus:border-[var(--quest-primary-container)] focus:ring-0 font-bold text-slate-800 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 placeholder:text-slate-350 transition-all border-slate-200"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Target Date */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                วันที่เป้าหมาย
              </Label>
              <Input
                {...register('targetDate')}
                type="date"
                className={`w-full px-4 py-3 rounded-2xl border-2 focus:border-[var(--quest-primary-container)] focus:ring-0 font-bold text-slate-850 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 transition-all ${
                  errors.targetDate ? 'border-red-400' : 'border-slate-200'
                }`}
              />
              {errors.targetDate && <p className="text-xs text-red-500 font-bold">{errors.targetDate.message}</p>}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                หมายเหตุเพิ่มเติม (ไม่บังคับ)
              </Label>
              <Input
                {...register('description')}
                placeholder="รายละเอียดหรือความประทับใจสำหรับเป้าหมายนี้"
                className="w-full px-4 py-3 rounded-2xl border-2 focus:border-[var(--quest-primary-container)] focus:ring-0 font-bold text-slate-850 dark:text-slate-100 dark:bg-slate-950 dark:border-slate-800 placeholder:text-slate-350 transition-all border-slate-200"
              />
            </div>

            {/* Emojis Icon Grid */}
            <div className="flex flex-col gap-2.5">
              <Label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                ไอคอนภารกิจ
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setValue('icon', emoji)}
                    className={`aspect-square flex items-center justify-center text-2xl bg-slate-50 dark:bg-slate-850 border-2 rounded-2xl hover:border-[var(--quest-primary-container)] dark:hover:border-[var(--quest-primary-container)] transition-all cursor-pointer select-none ${
                      selectedIcon === emoji
                        ? 'border-[var(--quest-primary-container)] bg-[var(--quest-primary-container)]/10 ring-2 ring-[var(--quest-primary-container)]'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
                {/* Fallback display for custom Lucide icons selected previously */}
                {isCustomLucideIcon && (
                  <button
                    type="button"
                    className="aspect-square flex items-center justify-center bg-slate-50 dark:bg-slate-850 border-2 rounded-2xl border-[var(--quest-primary-container)] bg-[var(--quest-primary-container)]/10 ring-2 ring-[var(--quest-primary-container)] cursor-default select-none"
                  >
                    <CategoryIcon name={selectedIcon} className="w-6 h-6" style={{ color: selectedColor }} />
                  </button>
                )}
              </div>
            </div>

            {/* Colors picker */}
            <div className="flex flex-col gap-2.5">
              <Label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                สีประจำภารกิจ
              </Label>
              <div className="flex flex-wrap gap-3 py-1">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('color', color)}
                    className={`w-9 h-9 rounded-full transition-all border-2 cursor-pointer shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:scale-105 ${
                      selectedColor === color
                        ? 'ring-2 ring-offset-2 ring-slate-400 scale-105'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                {/* Show custom color indicator if previously selected */}
                {isCustomColor && (
                  <button
                    type="button"
                    className="w-9 h-9 rounded-full border-2 ring-2 ring-offset-2 ring-slate-400 scale-105 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                    style={{ backgroundColor: selectedColor }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 px-8 pb-8 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 shrink-0">
            <button
              type="submit"
              className="tactile-button w-full bg-[var(--quest-primary-container)] text-white border-2 border-[var(--quest-primary)] py-4 rounded-2xl font-black text-xl shadow-[0_6px_0_0_var(--quest-primary)] active:translate-y-[2px] hover:opacity-95 transition-transform select-none cursor-pointer flex items-center justify-center gap-2"
            >
              {editingGoal ? 'บันทึกความเปลี่ยนแปลง' : 'เริ่มภารกิจเลย!'}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full py-2 text-slate-400 font-bold hover:text-slate-650 dark:hover:text-slate-200 transition-colors cursor-pointer text-center bg-transparent border-0 outline-none select-none text-sm"
            >
              ไว้ทีหลัง
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
