'use client'

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ChevronDown, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useQuickAddStore } from '@/store/useQuickAddStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { cn } from '@/lib/utils'
import { TransactionType } from '@/types'

/* ─── Schema ─────────────────────────────────────────────── */

const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().min(1, 'เลือกหมวดหมู่'),
  amount: z.number().positive('ระบุจำนวนเงิน'),
  description: z.string().min(1, 'ระบุรายละเอียด'),
  date: z.date(),
})

type FormValues = z.infer<typeof schema>

/* ─── Category chips ─────────────────────────────────────── */

function CategoryChips({
  type,
  selected,
  onSelect,
}: {
  type: TransactionType
  selected: string
  onSelect: (id: string) => void
}) {
  const { categories } = useCategoryStore()
  const filtered = categories.filter((c) => c.type === type)

  return (
    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
      {filtered.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all',
            selected === cat.id
              ? 'text-white border-transparent scale-105'
              : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white/80 bg-white/50 dark:bg-white/[0.03]'
          )}
          style={selected === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
        >
          <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
          <span>{cat.name}</span>
        </button>
      ))}
    </div>
  )
}

/* ─── Main Component ───────────────────────────────────────── */

export function QuickAddTransaction() {
  const { open, setOpen } = useQuickAddStore()
  const { addTransaction } = useTransactionStore()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'EXPENSE', date: new Date(), description: '', categoryId: '' },
  })

  const type = watch('type')
  const date = watch('date')
  const categoryId = watch('categoryId')

  /* Keyboard shortcut: N to open */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (open) return
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  /* Reset on open */
  useEffect(() => {
    if (open) {
      reset({ type: 'EXPENSE', date: new Date(), description: '', categoryId: '' })
      setTimeout(() => setFocus('amount'), 80)
    }
  }, [open, reset, setFocus])

  /* Reset categoryId when type changes */
  useEffect(() => {
    setValue('categoryId', '')
  }, [type, setValue])

  function onSubmit(data: FormValues) {
    addTransaction({
      type: data.type as TransactionType,
      categoryId: data.categoryId,
      amount: data.amount,
      description: data.description,
      date: data.date.toISOString(),
    })
    toast.success(`${data.type === 'INCOME' ? '💰' : '💸'} บันทึกแล้ว — ${data.description}`)
    setOpen(false)
  }

  const isExpense = type === 'EXPENSE'

  return (
    <>
      {/* ── FAB (desktop only) ── */}
      <button
        onClick={() => setOpen(true)}
        title="เพิ่มรายการด่วน (N)"
        className={cn(
          'hidden lg:flex fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full items-center justify-center',
          'shadow-lg transition-all duration-200 group',
          'bg-[var(--quest-primary-container)] hover:opacity-90 border-2 border-[var(--quest-primary)] text-white',
          'dark:bg-[var(--quest-primary-container)] dark:hover:opacity-90',
          'dark:border-2 dark:border-[var(--quest-primary)]',
          'dark:shadow-[0_0_24px_rgba(236,72,153,0.25)]',
          'active:scale-95 hover:scale-105'
        )}
      >
        <Plus className="w-6 h-6 text-white transition-transform group-hover:rotate-90 duration-200" />
        <span className="absolute -top-8 right-0 hidden group-hover:flex items-center gap-1 text-[10px] font-medium bg-gray-900/80 dark:bg-black/60 text-white/80 px-2 py-1 rounded-md whitespace-nowrap backdrop-blur-sm">
          กด <kbd className="font-mono bg-white/20 px-1 rounded">N</kbd>
        </span>
      </button>

      {/* ── Dialog ── */}
      <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden dark:bg-[rgba(8,14,30,0.92)] dark:backdrop-blur-2xl dark:border-white/[0.08]">
          {/* ── Header gradient area ── */}
          <div
            className={cn(
              'px-5 pt-5 pb-4',
              isExpense
                ? 'bg-gradient-to-br from-red-50 to-orange-50/50 dark:from-red-500/10 dark:to-orange-500/5'
                : 'bg-gradient-to-br from-[var(--quest-primary-container)]/10 to-teal-50/50 dark:from-[var(--quest-primary-container)]/15 dark:to-teal-500/5'
            )}
          >
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold text-gray-700 dark:text-white/80">
                เพิ่มรายการด่วน
              </DialogTitle>
            </DialogHeader>

            {/* Income / Expense toggle */}
            <div className="mt-3 flex rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white/60 dark:bg-white/[0.03]">
              {(['EXPENSE', 'INCOME'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('type', t)}
                  className={cn(
                    'flex-1 py-2 text-sm font-semibold transition-all',
                    type === t
                      ? t === 'EXPENSE'
                        ? 'bg-red-500 text-white dark:bg-red-500/80'
                        : 'bg-violet-500 text-white dark:bg-violet-500/80'
                      : 'text-gray-500 dark:text-white/30 hover:text-gray-700 dark:hover:text-white/60'
                  )}
                >
                  {t === 'EXPENSE' ? '💸 รายจ่าย' : '💰 รายรับ'}
                </button>
              ))}
            </div>

            {/* Amount row */}
            <div className="mt-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">
                  ฿
                </span>
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={cn(
                    'w-full pl-9 pr-4 py-3 text-2xl font-bold rounded-xl',
                    'bg-white/70 dark:bg-white/[0.06]',
                    'border outline-none transition-all',
                    'placeholder-gray-300 dark:placeholder-white/20',
                    errors.amount
                      ? 'border-red-400 text-red-600 dark:text-red-400 focus:ring-2 focus:ring-red-300/50'
                      : isExpense
                        ? 'border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 focus:border-red-300 focus:ring-2 focus:ring-red-200/50'
                        : 'border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-300 focus:border-violet-300 focus:ring-2 focus:ring-violet-200/50'
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
              )}
            </div>
          </div>

          {/* ── Form body ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
            <div>
              <Input
                {...register('description')}
                placeholder="รายละเอียด เช่น ค่าข้าวกลางวัน"
                className={cn(
                  'dark:bg-white/[0.04] dark:border-white/10 dark:placeholder-white/25',
                  errors.description && 'border-red-400'
                )}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-white/40 mb-2">หมวดหมู่</p>
              <CategoryChips
                type={type}
                selected={categoryId}
                onSelect={(id) => setValue('categoryId', id)}
              />
              {errors.categoryId && (
                <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>
              )}
            </div>

            <div>
              <Popover>
                <PopoverTrigger
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'w-full justify-start text-left font-normal text-xs h-8',
                    'dark:bg-white/[0.04] dark:border-white/10 dark:text-white/50 dark:hover:bg-white/[0.07]'
                  )}
                >
                  <CalendarIcon className="w-3.5 h-3.5 mr-2 opacity-60" />
                  {format(date, 'dd MMM yyyy')}
                  <ChevronDown className="w-3 h-3 ml-auto opacity-40" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setValue('date', d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              type="submit"
              className={cn(
                'w-full font-semibold transition-all',
                isExpense
                  ? 'bg-red-500 hover:bg-red-600 text-white dark:bg-red-500/80 dark:hover:bg-red-500'
                  : 'bg-[var(--quest-primary-container)] hover:opacity-90 border-2 border-[var(--quest-primary)] text-white'
              )}
            >
              บันทึกรายการ
            </Button>

            <p className="text-center text-[10px] text-gray-400 dark:text-white/20">
              กด{' '}
              <kbd className="font-mono text-[10px] bg-gray-100 dark:bg-white/10 px-1 rounded">
                Esc
              </kbd>{' '}
              เพื่อปิด
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
