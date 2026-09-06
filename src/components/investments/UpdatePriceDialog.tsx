'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { InvestmentHolding } from '@/types'
import { CURRENCY_SYMBOLS } from '@/components/investments/InvestmentForm'

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

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md rounded-[1.5rem] border-2 border-[#becbb1] bg-[var(--quest-background)] p-0 text-[var(--quest-foreground)] shadow-[0_8px_0_0_#becbb1] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-foreground)] dark:shadow-[0_8px_0_0_#0f130c]">
        <DialogHeader className="border-b-2 border-[#becbb1] px-5 py-4 dark:border-[#3b4630]">
          <DialogTitle className="font-quest-heading text-xl font-black text-[#2b6c00] dark:text-[#87fe45]">
            อัปเดตราคา
          </DialogTitle>
          <p className="font-quest-body text-sm font-bold text-[var(--quest-muted)]">
            ปรับราคาปัจจุบันของสินทรัพย์นี้แบบรวดเร็ว
          </p>
        </DialogHeader>
        <div className="space-y-4 px-5 py-5 font-quest-body">
          {/* Holding name + currency badge */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-[var(--quest-foreground)]">
              {holding?.name}{holding?.ticker ? ` (${holding.ticker})` : ''}
            </p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isForeign
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'
                : 'bg-[var(--quest-surface-soft)] text-[var(--quest-muted)] dark:bg-[var(--quest-surface-soft)] dark:text-[var(--quest-muted)]'
            }`}>
              {currency}
            </span>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-bold text-[var(--quest-muted)]">ราคาปัจจุบัน/หน่วย ({sym})</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--quest-muted)]">
                {sym}
              </span>
              <Input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="rounded-xl border-[#becbb1] bg-[var(--quest-surface)] pl-7 shadow-none dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>

          {/* Value preview */}
          {holding && price && !isNaN(parsedPrice) && (
            <div className="space-y-1 rounded-xl border border-[#becbb1] bg-[var(--quest-surface-low)] px-3 py-3 text-xs text-[var(--quest-muted)] dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
              <div className="flex justify-between">
                <span>มูลค่ารวม</span>
                <span className="font-bold text-[var(--quest-foreground)]">
                  {sym}{totalNative.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="-mx-0 -mb-0 gap-2 border-[#becbb1] bg-[var(--quest-surface-low)] px-5 py-4 dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-2xl border-2 border-[#6f7b64] bg-[var(--quest-surface)] font-bold text-[var(--quest-muted)] shadow-[0_4px_0_0_#6f7b64] hover:bg-[var(--quest-surface)] dark:border-[#5f6e52] dark:bg-[var(--quest-surface)]"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            className="h-11 rounded-2xl border-2 border-[var(--quest-primary)] bg-[var(--quest-primary-container)] font-bold text-[var(--quest-on-primary-container)] shadow-[0_4px_0_0_var(--quest-primary)] hover:opacity-95"
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
