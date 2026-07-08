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
import { EXCHANGE_RATES, CURRENCY_SYMBOLS } from '@/lib/exchangeRates'
import { cn } from '@/lib/utils'

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
  name:                z.string().min(1, 'ระบุชื่อ'),
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
  const [currency, setCurrency] = useState('THB')

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { assetClass: 'stock', units: NaN, avgCostPerUnit: NaN, currentPricePerUnit: NaN },
  })

  const assetClass   = watch('assetClass')
  const units        = watch('units') || 0
  const avgCost      = watch('avgCostPerUnit') || 0
  const currentPrice = watch('currentPricePerUnit') || 0
  const sym          = CURRENCY_SYMBOLS[currency] ?? currency
  const rate         = EXCHANGE_RATES[currency] ?? 1
  const isForeign    = currency !== 'THB'

  const totalCostNative    = units * avgCost
  const currentValueNative = units * currentPrice
  const gainLossNative     = currentValueNative - totalCostNative
  const returnPct          = totalCostNative > 0 ? (gainLossNative / totalCostNative) * 100 : 0
  const currentValueTHB    = currentValueNative * rate
  const gainLossTHB        = gainLossNative * rate

  useEffect(() => {
    if (open) {
      if (editingHolding) {
        setCurrency(editingHolding.currency ?? 'THB')
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
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-[1.5rem] border-2 border-[#becbb1] bg-[var(--quest-background)] p-0 text-[var(--quest-foreground)] shadow-[0_8px_0_0_#becbb1] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-foreground)] dark:shadow-[0_8px_0_0_#0f130c]">
        <DialogHeader className="border-b-2 border-[#becbb1] px-6 py-5 dark:border-[#3b4630]">
          <DialogTitle className="font-quest-heading text-2xl font-black text-[#2b6c00] dark:text-[#87fe45]">
            {editingHolding ? 'แก้ไขหลักทรัพย์' : 'เพิ่มหลักทรัพย์'}
          </DialogTitle>
          <p className="font-quest-body text-sm font-bold text-[var(--quest-muted)]">
            ปรับรายละเอียดสินทรัพย์ให้ตรงกับ Mission Board และเก็บข้อมูลพอร์ตแบบเรียลไทม์
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6 font-quest-body">
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
                      ? 'border-[#2b6c00] bg-[#58cc02] text-[#1e5000] shadow-[0_3px_0_0_#1e5000]'
                      : 'border-[#becbb1] bg-[var(--quest-surface)] text-[var(--quest-muted)] hover:border-[#6f7b64] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-muted)]'
                  )}
                >
                  <span>{CURRENCY_FLAGS[cur]}</span>
                  <span>{cur}</span>
                </button>
              ))}
            </div>
            {isForeign && (
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1.5">
                อัตราแลกเปลี่ยน: 1 {currency} ≈ ฿{rate.toLocaleString('th-TH')}
              </p>
            )}
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

          {/* Avg cost + Current price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1.5 block text-sm font-bold text-[var(--quest-muted)]">ต้นทุนเฉลี่ย/หน่วย ({sym})</Label>
              <Input
                {...register('avgCostPerUnit', { valueAsNumber: true })}
                type="number" step="any" placeholder="0.00"
                className={cn(
                  'rounded-xl border-[#becbb1] bg-[var(--quest-surface)] shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]',
                  errors.avgCostPerUnit && 'border-red-400'
                )}
              />
              {errors.avgCostPerUnit && <p className="text-xs text-red-500 mt-1">{errors.avgCostPerUnit.message}</p>}
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-bold text-[var(--quest-muted)]">ราคาปัจจุบัน/หน่วย ({sym})</Label>
              <Input
                {...register('currentPricePerUnit', { valueAsNumber: true })}
                type="number" step="any" placeholder="0.00"
                className={cn(
                  'rounded-xl border-[#becbb1] bg-[var(--quest-surface)] shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]',
                  errors.currentPricePerUnit && 'border-red-400'
                )}
              />
              {errors.currentPricePerUnit && <p className="text-xs text-red-500 mt-1">{errors.currentPricePerUnit.message}</p>}
            </div>
          </div>

          {/* Live preview */}
          {units > 0 && (avgCost > 0 || currentPrice > 0) && (
            <div className={cn(
              'space-y-1.5 rounded-xl border p-3 text-sm',
              gainLossNative >= 0
                ? 'border-[#58cc02] bg-[#efffe4] dark:border-[#2b6c00] dark:bg-[#1b2614]'
                : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20'
            )}>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-white/40 text-xs">มูลค่าปัจจุบัน</span>
                <div className="text-right">
                  <span className="font-bold text-gray-800 dark:text-white/80">{fmt(currentValueNative)}</span>
                  {isForeign && (
                    <span className="text-xs text-gray-400 dark:text-white/30 ml-1.5">≈ ฿{(currentValueTHB).toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-white/40 text-xs">กำไร/ขาดทุน</span>
                <div className="text-right">
                  <span className={cn('font-bold text-sm', gainLossNative >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                    {gainLossNative >= 0 ? '+' : ''}{fmt(gainLossNative)} ({gainLossNative >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
                  </span>
                  {isForeign && (
                    <p className={cn('text-[11px]', gainLossTHB >= 0 ? 'text-emerald-500 dark:text-emerald-500/70' : 'text-red-400')}>
                      ≈ {gainLossTHB >= 0 ? '+' : ''}฿{Math.abs(gainLossTHB).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                    </p>
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

          <Separator className="bg-[#becbb1] dark:bg-[#3b4630]" />

          <DialogFooter className="-mx-6 -mb-6 gap-2 border-[#becbb1] bg-[var(--quest-surface-low)] px-6 py-4 dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
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
              className="h-11 rounded-2xl border-2 border-[#2b6c00] bg-[#58cc02] font-bold text-[#1e5000] shadow-[0_4px_0_0_#1e5000] hover:bg-[#58cc02]/95"
            >
              {editingHolding ? 'บันทึกการแก้ไข' : 'เพิ่มหลักทรัพย์'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
