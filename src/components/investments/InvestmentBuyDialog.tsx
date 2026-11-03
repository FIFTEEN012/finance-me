'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Plus, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ASSET_CLASS_META, CURRENCY_SYMBOLS } from '@/components/investments/InvestmentForm'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { cn } from '@/lib/utils'
import type { AssetClass, InvestmentHolding } from '@/types'

const SUPPORTED_CURRENCIES = ['THB', 'USD', 'SGD', 'EUR', 'JPY', 'GBP'] as const

interface InvestmentBuyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  holdings: InvestmentHolding[]
}

function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function InvestmentBuyDialog({
  open,
  onOpenChange,
  holdings,
}: InvestmentBuyDialogProps) {
  const { addTransaction, updateTransaction } = useTransactionStore()
  const { categories } = useCategoryStore()
  const { recordBuyOrder } = useInvestmentStore()
  const { convertToThb, rates } = useExchangeRates()
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [holdingId, setHoldingId] = useState('')
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [assetClass, setAssetClass] = useState<AssetClass>('mutual_fund')
  const [currency, setCurrency] = useState('THB')
  const [units, setUnits] = useState(0)
  const [pricePerUnit, setPricePerUnit] = useState(0)
  const [fee, setFee] = useState(0)
  const [date, setDate] = useState(getDateKey())
  const [note, setNote] = useState('')
  const [customThbAmount, setCustomThbAmount] = useState('')
  const [isThbOverridden, setIsThbOverridden] = useState(false)

  const transferCategory = useMemo(
    () =>
      categories.find((category) => category.id === 'cat-transfer-1') ??
      categories.find((category) => category.type === 'TRANSFER'),
    [categories]
  )
  const feeCategory = useMemo(
    () => categories.find((category) => category.type === 'EXPENSE'),
    [categories]
  )
  const selectedHolding = holdings.find((holding) => holding.id === holdingId)
  const totalInvestment = Math.max(0, units) * Math.max(0, pricePerUnit)
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency

  const autoThbAmount = useMemo(() => {
    if (currency === 'THB') return totalInvestment
    return convertToThb(totalInvestment, currency)
  }, [currency, totalInvestment, convertToThb])

  useEffect(() => {
    if (!open) return

    const firstHolding = holdings[0]
    setMode(firstHolding ? 'existing' : 'new')
    setHoldingId(firstHolding?.id ?? '')
    setName('')
    setTicker('')
    setAssetClass('mutual_fund')
    setCurrency(firstHolding?.currency ?? 'THB')
    setUnits(0)
    setPricePerUnit(firstHolding?.currentPricePerUnit ?? 0)
    setFee(0)
    setDate(getDateKey())
    setNote('')
    setCustomThbAmount('')
    setIsThbOverridden(false)
  }, [holdings, open])

  useEffect(() => {
    if (!selectedHolding || mode !== 'existing') return
    setCurrency(selectedHolding.currency ?? 'THB')
    setPricePerUnit(selectedHolding.currentPricePerUnit)
    setIsThbOverridden(false)
  }, [mode, selectedHolding])

  useEffect(() => {
    if (!isThbOverridden) {
      setCustomThbAmount(autoThbAmount > 0 ? autoThbAmount.toFixed(2) : '')
    }
  }, [autoThbAmount, isThbOverridden])

  function handleSubmit() {
    const trimmedName = name.trim()
    const isExisting = mode === 'existing'
    const targetName = isExisting ? selectedHolding?.name : trimmedName

    if (!transferCategory) {
      toast.error('ยังไม่มีหมวดโอนย้ายเงิน กรุณาเปิดหน้าใหม่หรือตรวจหมวดหมู่')
      return
    }
    if (!targetName || (isExisting && !selectedHolding)) {
      toast.error('เลือกหรือระบุหลักทรัพย์ก่อนบันทึก')
      return
    }
    if (units <= 0 || pricePerUnit <= 0) {
      toast.error('จำนวนหน่วยและราคาซื้อต้องมากกว่า 0')
      return
    }
    if (fee > 0 && !feeCategory) {
      toast.error('ยังไม่มีหมวดรายจ่ายสำหรับค่าธรรมเนียม')
      return
    }

    const isForeign = currency !== 'THB'
    const parsedCustom = parseFloat(customThbAmount)
    const finalThbAmount =
      isForeign && isThbOverridden && !isNaN(parsedCustom) && parsedCustom > 0
        ? parsedCustom
        : autoThbAmount

    const orderId = crypto.randomUUID()
    const formattedForeign = `${symbol}${totalInvestment.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const description = isForeign
      ? `ซื้อ ${targetName} (${units} หน่วย @ ${symbol}${pricePerUnit} = ${formattedForeign})`
      : `ซื้อ ${targetName}`

    const noteDetails = isForeign
      ? [
          note.trim(),
          `[ชำระ ${formattedForeign} · อัตราแลกเปลี่ยน ~${(rates[currency] ?? 1).toFixed(2)} THB/${currency} · ยอดตัดบัญชี ฿${finalThbAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}]`,
        ]
          .filter(Boolean)
          .join('\n')
      : note.trim() || undefined

    const transferTransactionId = addTransaction({
      type: 'TRANSFER',
      categoryId: transferCategory.id,
      amount: finalThbAmount,
      description,
      note: noteDetails,
      tags: ['investment'],
      linkedInvestmentOrderId: orderId,
      transferKind: 'investment_buy',
      date,
    })
    const feeTransactionId =
      fee > 0 && feeCategory
        ? addTransaction({
            type: 'EXPENSE',
            categoryId: feeCategory.id,
            amount: fee,
            description: `ค่าธรรมเนียม ${description}`,
            note: note.trim() || undefined,
            tags: ['investment-fee'],
            linkedInvestmentOrderId: orderId,
            date,
          })
        : undefined

    const holdingIdResult = recordBuyOrder({
      id: orderId,
      holdingId: isExisting ? selectedHolding?.id : undefined,
      holding: isExisting
        ? undefined
        : {
            name: trimmedName,
            ticker: ticker.trim() || undefined,
            assetClass,
            color: ASSET_CLASS_META[assetClass].color,
            note: note.trim() || undefined,
          },
      transactionId: transferTransactionId,
      feeTransactionId,
      units,
      pricePerUnit,
      fee,
      currency,
      date,
      note: note.trim() || undefined,
    })

    if (!holdingIdResult) {
      toast.error('บันทึกคำสั่งซื้อไม่สำเร็จ')
      return
    }

    updateTransaction(transferTransactionId, { linkedInvestmentOrderId: orderId })
    if (feeTransactionId) updateTransaction(feeTransactionId, { linkedInvestmentOrderId: orderId })

    toast.success('บันทึกซื้อการลงทุนเป็นรายการโอนย้ายแล้ว')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full sm:max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border-2 border-[#0ea5e9] bg-[var(--quest-background)] p-0 shadow-[0_8px_0_0_#0369a1]">
        <DialogHeader className="shrink-0 border-b-2 border-[#bae6fd] px-6 py-4 dark:border-[#164e63]">
          <DialogTitle className="flex items-center gap-2 font-quest-heading text-2xl font-black text-[#0369a1] dark:text-[#7dd3fc]">
            <ArrowLeftRight className="h-5 w-5" />
            ซื้อการลงทุน
          </DialogTitle>
          <p className="text-sm font-bold text-[var(--quest-muted)]">
            เงินส่วนนี้จะถูกบันทึกเป็น Transfer ไม่ใช่รายจ่ายเต็มจำนวน
          </p>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-2">
            {(['existing', 'new'] as const).map((nextMode) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => setMode(nextMode)}
                className={cn(
                  'rounded-2xl border-2 px-4 py-3 text-sm font-black transition-all',
                  mode === nextMode
                    ? 'border-[#0369a1] bg-sky-100 text-[#075985] shadow-[0_3px_0_0_#0369a1]'
                    : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900'
                )}
              >
                {nextMode === 'existing' ? 'ซื้อเพิ่มตัวเดิม' : 'ซื้อหลักทรัพย์ใหม่'}
              </button>
            ))}
          </div>

          {mode === 'existing' ? (
            <div className="space-y-2">
              <Label>หลักทรัพย์</Label>
              <Select value={holdingId} onValueChange={(value) => setHoldingId(value ?? '')}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="เลือกหลักทรัพย์" />
                </SelectTrigger>
                <SelectContent>
                  {holdings.map((holding) => (
                    <SelectItem key={holding.id} value={holding.id}>
                      {holding.ticker ? `${holding.ticker} · ${holding.name}` : holding.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ชื่อหลักทรัพย์</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Ticker</Label>
                <Input value={ticker} onChange={(event) => setTicker(event.target.value)} className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>ประเภทสินทรัพย์</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(ASSET_CLASS_META) as [AssetClass, typeof ASSET_CLASS_META[AssetClass]][]).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAssetClass(key)}
                      className={cn(
                        'rounded-xl border px-2 py-2 text-xs font-bold',
                        assetClass === key
                          ? 'border-[#0369a1] bg-sky-100 text-[#075985]'
                          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900'
                      )}
                    >
                      {meta.emoji} {meta.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>สกุลเงิน</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value ?? 'THB')}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>วันที่ซื้อ</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>จำนวนหน่วย</Label>
              <Input type="number" step="any" value={units} onChange={(event) => setUnits(Number(event.target.value))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>ราคาซื้อต่อหน่วย ({symbol})</Label>
              <Input type="number" step="any" value={pricePerUnit} onChange={(event) => setPricePerUnit(Number(event.target.value))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>ค่าธรรมเนียม (บาท)</Label>
              <Input type="number" step="0.01" value={fee} onChange={(event) => setFee(Number(event.target.value))} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>โน้ต</Label>
              <Input value={note} onChange={(event) => setNote(event.target.value)} className="h-11 rounded-2xl" />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-900 dark:border-sky-900 dark:bg-sky-500/10 dark:text-sky-100 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                มูลค่าสินทรัพย์ที่ซื้อ ({currency})
              </span>
              <span className="text-base font-black">
                {symbol}{totalInvestment.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {currency !== 'THB' && (
              <div className="border-t border-sky-200/80 pt-2.5 dark:border-sky-800/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-300">
                  <span>อัตราแลกเปลี่ยนอ้างอิง:</span>
                  <span className="font-semibold">1 {currency} ≈ {(rates[currency] ?? 1).toFixed(2)} บาท</span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div>
                    <span className="block text-xs font-bold text-sky-950 dark:text-sky-100">
                      ยอดตัดบัญชีเงินบาท (THB)
                    </span>
                    <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                      บันทึกลงหน้าธุรกรรม (ปรับแก้ตามจริงได้)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative w-36">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={customThbAmount}
                        onChange={(e) => {
                          setIsThbOverridden(true)
                          setCustomThbAmount(e.target.value)
                        }}
                        className="h-9 pl-6 text-right font-black bg-white dark:bg-slate-900 text-sky-900 dark:text-sky-100 rounded-xl"
                      />
                    </div>
                    {isThbOverridden && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsThbOverridden(false)
                          setCustomThbAmount(autoThbAmount > 0 ? autoThbAmount.toFixed(2) : '')
                        }}
                        className="text-[11px] underline text-sky-600 hover:text-sky-800 dark:text-sky-400 cursor-pointer"
                        title="รีเซ็ตกลับเป็นเรทคำนวณอัตโนมัติ"
                      >
                        รีเซ็ต
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {fee > 0 && (
              <div className="mt-2 flex items-center justify-between gap-3 text-rose-700 dark:text-rose-200 border-t border-sky-200/80 pt-2 dark:border-sky-800/60">
                <span>Expense ค่าธรรมเนียม</span>
                <span>฿{fee.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="m-0 shrink-0 gap-2 border-t-2 border-[#bae6fd] bg-sky-50 px-6 py-4 dark:border-[#164e63] dark:bg-slate-950/60">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 rounded-2xl border-2 font-bold">
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleSubmit} className="h-11 rounded-2xl bg-sky-500 px-5 font-black text-white shadow-[0_4px_0_0_#0369a1] hover:bg-sky-400">
            <Plus className="h-4 w-4" />
            บันทึกการซื้อ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
