'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { InvestmentHolding } from '@/types'
import { EXCHANGE_RATES, CURRENCY_SYMBOLS } from '@/lib/exchangeRates'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  holding: InvestmentHolding | null
}

export function UpdatePriceDialog({ open, onOpenChange, holding }: Props) {
  const { updatePrice } = useInvestmentStore()
  const [price, setPrice] = useState('')

  const currency = holding?.currency ?? 'THB'
  const sym      = CURRENCY_SYMBOLS[currency] ?? currency
  const rate     = EXCHANGE_RATES[currency] ?? 1
  const isForeign = currency !== 'THB'

  function handleOpen(o: boolean) {
    if (o && holding) setPrice(String(holding.currentPricePerUnit))
    else setPrice('')
    onOpenChange(o)
  }

  function handleSave() {
    if (!holding) return
    const parsed = parseFloat(price)
    if (isNaN(parsed) || parsed < 0) { toast.error('ราคาไม่ถูกต้อง'); return }
    updatePrice(holding.id, parsed)
    toast.success(`อัปเดตราคา "${holding.name}" เป็น ${sym}${parsed.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`)
    onOpenChange(false)
  }

  const parsedPrice    = parseFloat(price)
  const totalNative    = holding ? holding.units * parsedPrice : 0
  const totalTHB       = totalNative * rate

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>อัปเดตราคา</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          {/* Holding name + currency badge */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-700 dark:text-white/70">
              {holding?.name}{holding?.ticker ? ` (${holding.ticker})` : ''}
            </p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isForeign
                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-white/[0.07] text-gray-500 dark:text-white/40'
            }`}>
              {currency}
            </span>
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">ราคาปัจจุบัน/หน่วย ({sym})</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 dark:text-white/30">
                {sym}
              </span>
              <Input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="pl-7"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>

          {/* Value preview */}
          {holding && price && !isNaN(parsedPrice) && (
            <div className="space-y-1 text-xs text-gray-400 dark:text-white/30 bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2">
              <div className="flex justify-between">
                <span>มูลค่ารวม</span>
                <span className="font-semibold text-gray-600 dark:text-white/50">
                  {sym}{totalNative.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {isForeign && (
                <div className="flex justify-between">
                  <span>เทียบเท่า (THB)</span>
                  <span className="font-semibold text-gray-600 dark:text-white/50">
                    ฿{totalTHB.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
