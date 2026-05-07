'use client'

import { useState } from 'react'
import { Plus, Trash2, Scissors, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { Transaction } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface SplitRow {
  id: string
  categoryId: string
  description: string
  amount: string
}

interface Props {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SplitTransactionDialog({ transaction, open, onOpenChange }: Props) {
  const { addTransaction, deleteTransaction } = useTransactionStore()
  const { categories }                        = useCategoryStore()

  const [rows, setRows] = useState<SplitRow[]>([])

  /* Re-initialize rows when transaction changes */
  const initRows = (tx: Transaction): SplitRow[] => [
    { id: crypto.randomUUID(), categoryId: tx.categoryId, description: tx.description, amount: '' },
    { id: crypto.randomUUID(), categoryId: '',             description: '',             amount: '' },
  ]

  if (open && transaction && rows.length === 0) {
    setRows(initRows(transaction))
  }

  if (!transaction) return null

  const totalOriginal = transaction.amount
  const sumRows       = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const remaining     = Math.round((totalOriginal - sumRows) * 100) / 100
  const isBalanced    = Math.abs(remaining) < 0.01
  const canSave       = isBalanced && rows.every((r) => r.categoryId && (parseFloat(r.amount) || 0) > 0) && rows.length >= 2

  const validCats = categories.filter((c) => c.type === transaction.type)

  const updateRow = (id: string, patch: Partial<SplitRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const addRow = () =>
    setRows((rs) => [...rs, { id: crypto.randomUUID(), categoryId: '', description: '', amount: '' }])

  const removeRow = (id: string) =>
    setRows((rs) => rs.filter((r) => r.id !== id))

  /* Distribute remaining to last empty row */
  const fillRemaining = (id: string) => {
    if (remaining > 0) updateRow(id, { amount: remaining.toFixed(2) })
  }

  const handleClose = () => {
    setRows([])
    onOpenChange(false)
  }

  const handleConfirm = () => {
    if (!canSave) return
    rows.forEach((r) => {
      addTransaction({
        categoryId:  r.categoryId,
        type:        transaction.type,
        amount:      parseFloat(r.amount),
        description: r.description || transaction.description,
        note:        transaction.note,
        tags:        transaction.tags,
        date:        transaction.date,
      })
    })
    deleteTransaction(transaction.id)
    toast.success(`แยก ${rows.length} รายการสำเร็จ`)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            แยกรายการ
          </DialogTitle>
        </DialogHeader>

        {/* Original transaction summary */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] text-sm">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
              {new Date(transaction.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <p className={cn('font-bold text-lg', transaction.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
            {formatCurrency(totalOriginal)}
          </p>
        </div>

        {/* Split rows */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {rows.map((row, idx) => (
            <div key={row.id} className="flex items-start gap-2">
              <span className="text-xs text-gray-400 dark:text-white/30 mt-2.5 w-4 flex-shrink-0 text-center">{idx + 1}</span>

              {/* Category */}
              <Select value={row.categoryId} onValueChange={(v) => updateRow(row.id, { categoryId: v ?? undefined })}>
                <SelectTrigger className="w-36 h-9 text-xs flex-shrink-0">
                  <SelectValue placeholder="หมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {validCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-1.5">
                        <CategoryIcon name={c.icon} className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.color }} />
                        <span className="text-xs">{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Description */}
              <Input
                value={row.description}
                onChange={(e) => updateRow(row.id, { description: e.target.value })}
                placeholder="รายละเอียด"
                className="flex-1 h-9 text-xs"
              />

              {/* Amount */}
              <div className="relative w-28 flex-shrink-0">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">฿</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.amount}
                  onChange={(e) => updateRow(row.id, { amount: e.target.value })}
                  onFocus={() => !row.amount && fillRemaining(row.id)}
                  placeholder="0.00"
                  className="pl-6 h-9 text-xs"
                />
              </div>

              {/* Remove */}
              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 2}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed mt-0.5 flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add row */}
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> เพิ่มรายการแยก
        </button>

        {/* Balance indicator */}
        <div className={cn(
          'flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium border',
          isBalanced
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400',
        )}>
          <span className="flex items-center gap-1.5">
            {!isBalanced && <AlertCircle className="w-4 h-4" />}
            {isBalanced ? '✓ ยอดครบถ้วน' : `คงเหลือที่ยังไม่ได้แยก`}
          </span>
          {!isBalanced && (
            <span className="font-bold">{formatCurrency(Math.abs(remaining))}</span>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>ยกเลิก</Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSave}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40"
          >
            <Scissors className="w-3.5 h-3.5" />
            แยกรายการ ({rows.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
