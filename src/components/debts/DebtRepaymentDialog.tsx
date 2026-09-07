'use client'

import { useState, useEffect } from 'react'
import { Check, HandCoins, Calendar, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DebtItem } from '@/types/debt'
import { useDebtStore } from '@/store/useDebtStore'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface DebtRepaymentDialogProps {
  open: boolean
  onClose: () => void
  debt: DebtItem | null
}

export function DebtRepaymentDialog({ open, onClose, debt }: DebtRepaymentDialogProps) {
  const { addPayment } = useDebtStore()

  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [createTx, setCreateTx] = useState(true)

  const remaining = debt ? Math.max(0, debt.totalAmount - debt.paidAmount) : 0

  useEffect(() => {
    if (open && debt) {
      const rem = Math.max(0, debt.totalAmount - debt.paidAmount)
      setAmount(String(rem))
      setDate(new Date().toISOString().slice(0, 10))
      setNote('')
      setCreateTx(true)
    }
  }, [open, debt])

  if (!debt) return null

  const isIOwe = debt.type === 'I_OWE'
  const title = isIOwe ? `ชำระหนี้คืนให้: ${debt.personName}` : `รับเงินคืนจาก: ${debt.personName}`
  const numAmount = parseFloat(amount) || 0

  const handleQuickPercent = (pct: number) => {
    const calculated = Math.round(remaining * (pct / 100))
    setAmount(String(calculated))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (numAmount <= 0) {
      toast.error('กรุณาระบุจำนวนเงินที่ถูกต้อง')
      return
    }

    addPayment(debt.id, {
      amount: numAmount,
      date,
      note: note.trim() || undefined,
      createTransaction: createTx,
    })

    toast.success(
      isIOwe
        ? `บันทึกการชำระหนี้ ${formatCurrency(numAmount)} ให้ ${debt.personName} แล้ว`
        : `บันทึกการรับเงินคืน ${formatCurrency(numAmount)} จาก ${debt.personName} แล้ว`
    )

    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-xl rounded-3xl border-2 border-slate-200 bg-white p-6 sm:p-8 font-quest-body dark:border-slate-800 dark:bg-slate-900">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 shadow-sm text-white"
              style={{ backgroundColor: debt.color, borderColor: debt.color }}
            >
              <HandCoins className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="font-quest-heading text-lg font-black text-slate-800 dark:text-white">
                {title}
              </DialogTitle>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                ยอดคงเหลือที่ต้องเคลียร์: <span className="text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]">{formatCurrency(remaining)}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Quick Percent Pills */}
          <div className="flex gap-2">
            {[
              { label: 'เต็มจำนวน (100%)', pct: 100 },
              { label: 'ครึ่งหนึ่ง (50%)', pct: 50 },
              { label: '25%', pct: 25 },
            ].map(({ label, pct }) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickPercent(pct)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-black text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 select-none whitespace-nowrap"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              จำนวนเงินที่ชำระ (บาท) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-lg font-black text-slate-800 focus:border-[var(--quest-primary-container)] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                THB
              </span>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              วันที่ชำระ *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-[var(--quest-primary-container)] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              หมายเหตุ (ถ้ามี)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น โอนผ่านพร้อมเพย์, คืนงวดที่ 1"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-[var(--quest-primary-container)] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Transaction Sync Checkbox */}
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 cursor-pointer dark:border-slate-800 dark:bg-slate-800/50">
            <input
              type="checkbox"
              checked={createTx}
              onChange={(e) => setCreateTx(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--quest-primary-container)] focus:ring-[var(--quest-primary-container)]"
            />
            <div className="text-xs">
              <p className="font-black text-slate-800 dark:text-slate-200">
                {isIOwe ? 'ลงเป็นรายการรายจ่ายในระบบธุรกรรม (Transactions)' : 'ลงเป็นรายการรายรับในระบบธุรกรรม (Transactions)'}
              </p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {isIOwe
                  ? 'ช่วยอัปเดตยอดใช้จ่ายจริงในกระเป๋าของคุณอัตโนมัติ'
                  : 'ช่วยบันทึกยอดเงินที่ได้รับกลับเข้ามาในกระเป๋า'}
              </p>
            </div>
          </label>

          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="quest-secondary-button flex-1 px-4 text-xs"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="quest-action-button flex-1 flex items-center justify-center gap-2 px-6 text-xs whitespace-nowrap"
            >
              <Check className="h-4 w-4 stroke-[3px]" />
              ยืนยันการชำระ
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
