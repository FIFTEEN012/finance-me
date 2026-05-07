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
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingHolding ? 'แก้ไขหลักทรัพย์' : 'เพิ่มหลักทรัพย์'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Asset class */}
          <div>
            <Label className="text-sm mb-2 block">ประเภทสินทรัพย์</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(ASSET_CLASS_META) as [AssetClass, typeof ASSET_CLASS_META[AssetClass]][]).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValue('assetClass', key)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-medium transition-all',
                    assetClass === key
                      ? 'border-2 text-white'
                      : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:border-gray-300 bg-white dark:bg-white/[0.02]'
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
            <Label className="text-sm mb-2 block">สกุลเงิน</Label>
            <div className="flex gap-1.5 flex-wrap">
              {SUPPORTED_CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setCurrency(cur)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    currency === cur
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:border-gray-300 bg-white dark:bg-white/[0.02]'
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
              <Label className="text-sm mb-1.5 block">ชื่อหลักทรัพย์</Label>
              <Input
                {...register('name')}
                placeholder={currency === 'USD' ? 'เช่น Apple, Tesla' : 'เช่น ปตท., Bitcoin'}
                className={errors.name ? 'border-red-400' : ''}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Ticker</Label>
              <Input {...register('ticker')} placeholder={currency === 'USD' ? 'AAPL' : 'PTT'} />
            </div>
          </div>

          {/* Units */}
          <div>
            <Label className="text-sm mb-1.5 block">จำนวนหน่วย / หุ้น</Label>
            <Input
              {...register('units', { valueAsNumber: true })}
              type="number" step="any" placeholder="0"
              className={errors.units ? 'border-red-400' : ''}
            />
            {errors.units && <p className="text-xs text-red-500 mt-1">{errors.units.message}</p>}
          </div>

          {/* Avg cost + Current price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm mb-1.5 block">ต้นทุนเฉลี่ย/หน่วย ({sym})</Label>
              <Input
                {...register('avgCostPerUnit', { valueAsNumber: true })}
                type="number" step="any" placeholder="0.00"
                className={errors.avgCostPerUnit ? 'border-red-400' : ''}
              />
              {errors.avgCostPerUnit && <p className="text-xs text-red-500 mt-1">{errors.avgCostPerUnit.message}</p>}
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">ราคาปัจจุบัน/หน่วย ({sym})</Label>
              <Input
                {...register('currentPricePerUnit', { valueAsNumber: true })}
                type="number" step="any" placeholder="0.00"
                className={errors.currentPricePerUnit ? 'border-red-400' : ''}
              />
              {errors.currentPricePerUnit && <p className="text-xs text-red-500 mt-1">{errors.currentPricePerUnit.message}</p>}
            </div>
          </div>

          {/* Live preview */}
          {units > 0 && (avgCost > 0 || currentPrice > 0) && (
            <div className={cn(
              'p-3 rounded-xl border text-sm space-y-1.5',
              gainLossNative >= 0
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'
                : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20'
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
            <Label className="text-sm mb-1.5 block">หมายเหตุ (ไม่บังคับ)</Label>
            <Input {...register('note')} placeholder="เช่น ซื้อปีนี้" />
          </div>

          <Separator />

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {editingHolding ? 'บันทึกการแก้ไข' : 'เพิ่มหลักทรัพย์'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
