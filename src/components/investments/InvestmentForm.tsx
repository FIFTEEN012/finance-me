'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { InvestmentHolding, AssetClass } from '@/types'
import { cn } from '@/lib/utils'
import { useExchangeRates } from '@/hooks/useExchangeRates'

export const CURRENCY_SYMBOLS: Record<string, string> = {
  THB: '฿',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  SGD: 'S$',
  GBP: '£',
}

export const ASSET_CLASS_META: Record<AssetClass, { label: string; color: string; emoji: string }> = {
  stock:       { label: 'หุ้น',        color: '#10b981', emoji: '📈' },
  mutual_fund: { label: 'กองทุนรวม',   color: '#6366f1', emoji: '🏦' },
  etf:         { label: 'ETF',         color: '#f59e0b', emoji: '📊' },
  crypto:      { label: 'คริปโต',      color: '#f97316', emoji: '₿'  },
  bond:        { label: 'ตราสารหนี้',  color: '#3b82f6', emoji: '📄' },
  other:       { label: 'อื่นๆ',       color: '#94a3b8', emoji: '💼' },
}

const SUPPORTED_CURRENCIES = ['THB', 'USD', 'SGD', 'EUR', 'JPY', 'GBP'] as const
const CURRENCY_FLAGS: Record<string, string> = {
  THB: '🇹🇭', USD: '🇺🇸', SGD: '🇸🇬', EUR: '🇪🇺', JPY: '🇯🇵', GBP: '🇬🇧',
}

const schema = z.object({
  name:                z.string().min(1, 'กรุณาระบุชื่อสินทรัพย์'),
  ticker:              z.string().optional(),
  assetClass:          z.enum(['stock', 'mutual_fund', 'etf', 'crypto', 'bond', 'other']),
  units:               z.number().positive('จำนวนหน่วยต้องมากกว่า 0'),
  avgCostPerUnit:      z.number().nonnegative('ต้นทุนต้องไม่ติดลบ'),
  currentPricePerUnit: z.number().nonnegative('ราคาปัจจุบันต้องไม่ติดลบ'),
  note:                z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingHolding?: InvestmentHolding | null
}

export function InvestmentForm({ open, onOpenChange, editingHolding }: Props) {
  const { addHolding, updateHolding } = useInvestmentStore()
  const { convertToThb, rates } = useExchangeRates()
  const [currency, setCurrency] = useState('THB')
  const [costInputMode, setCostInputMode] = useState<'unit' | 'total'>('unit')
  const [totalCostInput, setTotalCostInput] = useState<string>('')

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { assetClass: 'stock', units: NaN, avgCostPerUnit: NaN, currentPricePerUnit: NaN },
  })

  const assetClass   = watch('assetClass')
  const units        = watch('units') || 0
  const avgCost      = watch('avgCostPerUnit') || 0
  const currentPrice = watch('currentPricePerUnit') || 0
  const sym          = CURRENCY_SYMBOLS[currency] ?? currency

  const totalCost    = units * avgCost
  const currentValue = units * currentPrice
  const gainLoss     = currentValue - totalCost
  const returnPct    = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

  useEffect(() => {
    if (open) {
      if (editingHolding) {
        setCurrency(editingHolding.currency ?? 'THB')
        const calculatedTotal = editingHolding.units * editingHolding.avgCostPerUnit
        setTotalCostInput(calculatedTotal > 0 ? calculatedTotal.toFixed(2) : '')
        reset({
          name:                editingHolding.name,
          ticker:              editingHolding.ticker ?? '',
          assetClass:          editingHolding.assetClass,
          units:               editingHolding.units,
          avgCostPerUnit:      editingHolding.avgCostPerUnit,
          currentPricePerUnit: editingHolding.currentPricePerUnit,
          note:                editingHolding.note ?? '',
        })
      } else {
        setCurrency('THB')
        setTotalCostInput('')
        setCostInputMode('unit')
        reset({ name: '', ticker: '', assetClass: 'stock', units: NaN, avgCostPerUnit: NaN, currentPricePerUnit: NaN, note: '' })
      }
    }
  }, [open, editingHolding, reset])

  function onSubmit(data: FormValues) {
    const meta = ASSET_CLASS_META[data.assetClass]
    const payload = {
      name:                data.name,
      ticker:              data.ticker || undefined,
      assetClass:          data.assetClass,
      currency,
      units:               data.units,
      avgCostPerUnit:      data.avgCostPerUnit,
      currentPricePerUnit: data.currentPricePerUnit,
      color:               meta.color,
      note:                data.note || undefined,
    }
    if (editingHolding) {
      updateHolding(editingHolding.id, payload)
      toast.success(`แก้ไข "${data.name}" สำเร็จ`)
    } else {
      addHolding(payload)
      toast.success(`เพิ่ม "${data.name}" สำเร็จ`)
    }
    onOpenChange(false)
  }

  const fmt = (n: number, cur = currency) =>
    `${CURRENCY_SYMBOLS[cur] ?? cur}${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] flex flex-col rounded-[1.5rem] border-2 border-[#becbb1] bg-[var(--quest-background)] p-0 text-[var(--quest-foreground)] shadow-[0_8px_0_0_#becbb1] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-foreground)] dark:shadow-[0_8px_0_0_#0f130c] overflow-hidden">
        <DialogHeader className="border-b-2 border-[#becbb1] px-6 py-4 dark:border-[#3b4630] shrink-0">
          <DialogTitle className="font-quest-heading text-2xl font-black text-[#2b6c00] dark:text-[#87fe45]">
            {editingHolding ? 'แก้ไขหลักทรัพย์' : 'เพิ่มหลักทรัพย์'}
          </DialogTitle>
          <p className="font-quest-body text-sm font-bold text-[var(--quest-muted)]">
            ปรับรายละเอียดสินทรัพย์ให้ตรงกับ Mission Board และเก็บข้อมูลพอร์ตแบบเรียลไทม์
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 font-quest-body">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Asset class */}
          <div>
            <Label className="mb-2 block text-sm font-bold text-[var(--quest-muted)]">ประเภทสินทรัพย์</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(ASSET_CLASS_META) as [AssetClass, typeof ASSET_CLASS_META[AssetClass]][]).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValue('assetClass', key)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-xs font-bold transition-all',
                    assetClass === key
                      ? 'border-2 text-white shadow-[0_4px_0_0_rgba(0,0,0,0.15)]'
                      : 'border-[#becbb1] bg-[var(--quest-surface)] text-[var(--quest-muted)] hover:border-[#6f7b64] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-muted)]'
                  )}
                  style={assetClass === key ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
                >
                  <span className="text-base">{meta.emoji}</span>
                  <span>{meta.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Currency selector */}
          <div>
            <Label className="mb-2 block text-sm font-bold text-[var(--quest-muted)]">สกุลเงิน</Label>
            <div className="flex gap-1.5 flex-wrap">
              {SUPPORTED_CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setCurrency(cur)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all',
                    currency === cur
                      ? 'border-[var(--quest-primary)] bg-[var(--quest-primary-container)] text-[var(--quest-on-primary-container)] shadow-[0_3px_0_0_var(--quest-primary)]'
                      : 'border-[#becbb1] bg-[var(--quest-surface)] text-[var(--quest-muted)] hover:border-[#6f7b64] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-muted)]'
                  )}
                >
                  <span>{CURRENCY_FLAGS[cur]}</span>
                  <span>{cur}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name + Ticker */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="mb-1.5 block text-sm font-bold text-[var(--quest-muted)]">ชื่อหลักทรัพย์</Label>
              <Input
                {...register('name')}
                placeholder={currency === 'USD' ? 'เช่น Apple, Tesla' : 'เช่น ปตท., Bitcoin'}
                className={cn(
                  'rounded-xl border-[#becbb1] bg-[var(--quest-surface)] shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]',
                  errors.name && 'border-red-400'
                )}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-bold text-[var(--quest-muted)]">Ticker</Label>
              <Input
                {...register('ticker')}
                placeholder={currency === 'USD' ? 'AAPL' : 'PTT'}
                className="rounded-xl border-[#becbb1] bg-[var(--quest-surface)] shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
              />
            </div>
          </div>

          {/* Units */}
          <div>
            <Label className="mb-1.5 block text-sm font-bold text-[var(--quest-muted)]">จำนวนหน่วย / หุ้น</Label>
            <Input
              {...register('units', { valueAsNumber: true })}
              type="number" step="any" placeholder="0"
              className={cn(
                'rounded-xl border-[#becbb1] bg-[var(--quest-surface)] shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]',
                errors.units && 'border-red-400'
              )}
            />
            {errors.units && <p className="text-xs text-red-500 mt-1">{errors.units.message}</p>}
          </div>

          {/* Smart Cost Input & Current Price */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <Label className="block text-sm font-bold text-[var(--quest-muted)]">
                ข้อมูลต้นทุนและราคา ({sym})
              </Label>
              <div className="flex items-center self-start sm:self-auto p-0.5 rounded-lg bg-gray-200/70 dark:bg-white/[0.08] text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCostInputMode('unit')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                    costInputMode === 'unit'
                      ? 'bg-white dark:bg-white/15 text-[var(--quest-foreground)] shadow-xs font-black'
                      : 'text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  ราคาต่อหุ้น (Avg Price)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCostInputMode('total')
                    if (units > 0 && avgCost > 0) {
                      setTotalCostInput((units * avgCost).toFixed(2))
                    }
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                    costInputMode === 'total'
                      ? 'bg-white dark:bg-white/15 text-[var(--quest-foreground)] shadow-xs font-black'
                      : 'text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  เงินต้นทุนรวม (Total Cost)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                {costInputMode === 'unit' ? (
                  <div>
                    <Label className="mb-1 text-xs font-semibold text-gray-500 dark:text-white/50 block">
                      ราคาเฉลี่ยต่อ 1 หุ้น ({sym})
                    </Label>
                    <Input
                      {...register('avgCostPerUnit', {
                        valueAsNumber: true,
                        onChange: (e) => {
                          const val = parseFloat(e.target.value)
                          if (!isNaN(val) && units > 0) {
                            setTotalCostInput((val * units).toFixed(2))
                          }
                        },
                      })}
                      type="number"
                      step="any"
                      placeholder="เช่น 227.87"
                      className={cn(
                        'rounded-xl border-[#becbb1] bg-[var(--quest-surface)] shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]',
                        errors.avgCostPerUnit && 'border-red-400'
                      )}
                    />
                    {units > 0 && avgCost > 0 && (
                      <p className="text-[11px] text-gray-500 dark:text-white/50 mt-1">
                        💡 คิดเป็นต้นทุนรวม: {sym}{(units * avgCost).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label className="mb-1 text-xs font-semibold text-gray-500 dark:text-white/50 block">
                      เงินลงทุนรวมทั้งหมด ({sym})
                    </Label>
                    <Input
                      value={totalCostInput}
                      onChange={(e) => {
                        const str = e.target.value
                        setTotalCostInput(str)
                        const total = parseFloat(str)
                        if (!isNaN(total) && units > 0) {
                          setValue('avgCostPerUnit', Number((total / units).toFixed(4)), { shouldValidate: true })
                        }
                      }}
                      type="number"
                      step="any"
                      placeholder="เช่น 182.19"
                      className="rounded-xl border-[#becbb1] bg-[var(--quest-surface)] shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
                    />
                    {units > 0 && avgCost > 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                        💡 คำนวณเป็นราคาต่อหุ้น: {sym}{avgCost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </p>
                    )}
                  </div>
                )}
                {errors.avgCostPerUnit && <p className="text-xs text-red-500 mt-1">{errors.avgCostPerUnit.message}</p>}
              </div>

              <div>
                <Label className="mb-1 text-xs font-semibold text-gray-500 dark:text-white/50 block">
                  ราคาปัจจุบัน/หน่วย ({sym})
                </Label>
                <Input
                  {...register('currentPricePerUnit', { valueAsNumber: true })}
                  type="number"
                  step="any"
                  placeholder="เช่น 222.78"
                  className={cn(
                    'rounded-xl border-[#becbb1] bg-[var(--quest-surface)] shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]',
                    errors.currentPricePerUnit && 'border-red-400'
                  )}
                />
                {errors.currentPricePerUnit && <p className="text-xs text-red-500 mt-1">{errors.currentPricePerUnit.message}</p>}
              </div>
            </div>
          </div>

          {/* Live preview */}
          {units > 0 && (avgCost > 0 || currentPrice > 0) && (
            <div className={cn(
              'space-y-2 rounded-xl border p-3.5 text-sm',
              gainLoss >= 0
                ? 'border-emerald-500/40 bg-emerald-500/10 dark:border-emerald-800/60 dark:bg-emerald-950/20'
                : 'border-rose-500/40 bg-rose-500/10 dark:border-rose-900/60 dark:bg-rose-950/20'
            )}>
              <div className="flex justify-between items-baseline">
                <span className="text-gray-500 dark:text-white/50 text-xs">มูลค่าปัจจุบัน ({currency})</span>
                <div className="text-right">
                  <span className="font-bold text-gray-900 dark:text-white text-base">{fmt(currentValue)}</span>
                  {currency !== 'THB' && (
                    <span className="block text-[11px] font-medium text-gray-500 dark:text-white/40">
                      ≈ ฿{convertToThb(currentValue, currency).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-1 border-t border-gray-200/50 dark:border-white/[0.06]">
                <span className="text-gray-500 dark:text-white/50 text-xs">กำไร/ขาดทุน</span>
                <div className="text-right">
                  <span className={cn('font-bold text-sm', gainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {gainLoss >= 0 ? '+' : ''}{fmt(gainLoss)} ({gainLoss >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
                  </span>
                  {currency !== 'THB' && (
                    <span className={cn('block text-[11px] font-medium', gainLoss >= 0 ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-600/80 dark:text-rose-400/80')}>
                      ≈ {gainLoss >= 0 ? '+' : ''}฿{convertToThb(gainLoss, currency).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <Label className="mb-1.5 block text-sm font-bold text-[var(--quest-muted)]">หมายเหตุ (ไม่บังคับ)</Label>
            <Input
              {...register('note')}
              placeholder="เช่น ซื้อปีนี้"
              className="rounded-xl border-[#becbb1] bg-[var(--quest-surface)] shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
            />
          </div>

          </div>

          <DialogFooter className="gap-2 border-t-2 border-[#becbb1] bg-[var(--quest-surface-low)] px-6 py-4 dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)] shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-2xl border-2 border-[#6f7b64] bg-[var(--quest-surface)] font-bold text-[var(--quest-muted)] shadow-[0_4px_0_0_#6f7b64] hover:bg-[var(--quest-surface)] dark:border-[#5f6e52] dark:bg-[var(--quest-surface)]"
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-2xl border-2 border-[var(--quest-primary)] bg-[var(--quest-primary-container)] font-bold text-[var(--quest-on-primary-container)] shadow-[0_4px_0_0_var(--quest-primary)] hover:opacity-95"
            >
              {editingHolding ? 'บันทึกการแก้ไข' : 'เพิ่มหลักทรัพย์'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
