'use client'

import { useMemo, useState, useCallback } from 'react'
import { MoreHorizontal, Pencil, Trash2, Scissors, CheckSquare, Tags, X } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Transaction } from '@/types'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency, cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { TagInput } from '@/components/shared/TagInput'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SplitTransactionDialog } from './SplitTransactionDialog'
import { toast } from 'sonner'

interface Props {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  className?: string
}

/* ─── Date label helper ──────────────────────────────────── */

function parseLocalDate(dateStr: string): Date {
  // Parse "YYYY-MM-DD" as local time (not UTC) to avoid timezone offset issues
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Convert any date string (UTC ISO or YYYY-MM-DD) to local "YYYY-MM-DD" key */
function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function dateLabelFor(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('th-TH', {
    weekday: 'short',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}

/* ─── Main component ─────────────────────────────────────── */

const PAGE_SIZE = 60

export function TransactionGroupedList({ transactions, onEdit, className }: Props) {
  const { deleteTransaction, deleteTransactions, recategorizeTransactions, bulkAddTag, getAllTags } = useTransactionStore()
  const { categories, getCategoryById } = useCategoryStore()

  const [deletingId, setDeletingId]           = useState<string | null>(null)
  const [splittingTx, setSplittingTx]         = useState<Transaction | null>(null)
  const [selected, setSelected]               = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen]   = useState(false)
  const [recatOpen, setRecatOpen]             = useState(false)
  const [recatCategoryId, setRecatCategoryId] = useState('')
  const [bulkTagOpen, setBulkTagOpen]         = useState(false)
  const [bulkTagInput, setBulkTagInput]       = useState<string[]>([])
  const [visibleCount, setVisibleCount]       = useState(PAGE_SIZE)

  /* Sort newest first then group by local date */
  const { groups, allIds } = useMemo(() => {
    const sorted = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, visibleCount)

    const map = new Map<string, Transaction[]>()
    for (const tx of sorted) {
      const key = toLocalDateKey(tx.date)   // ใช้ local date key เสมอ แก้ปัญหา UTC offset
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    }

    return {
      groups: Array.from(map.entries()),
      allIds: sorted.map((t) => t.id),
    }
  }, [transactions, visibleCount])

  const hasMore = transactions.length > visibleCount

  /* ── Selection helpers ── */
  const toggleOne = useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])
  const clearSel = () => setSelected(new Set())
  const selectAll = () => setSelected(new Set(transactions.map((t) => t.id)))

  /* ── Derived for bulk re-cat ── */
  const selectedTxs  = transactions.filter((t) => selected.has(t.id))
  const hasIncome    = selectedTxs.some((t) => t.type === 'INCOME')
  const hasExpense   = selectedTxs.some((t) => t.type === 'EXPENSE')
  const mixedTypes   = hasIncome && hasExpense
  const recatCategories = mixedTypes
    ? categories
    : hasIncome
      ? categories.filter((c) => c.type === 'INCOME')
      : categories.filter((c) => c.type === 'EXPENSE')

  /* ── Actions ── */
  const handleDelete = () => {
    if (!deletingId) return
    deleteTransaction(deletingId)
    toast.success('ลบรายการสำเร็จ')
    setDeletingId(null)
  }
  const handleBulkDelete = () => {
    const ids = [...selected]
    deleteTransactions(ids)
    toast.success(`ลบ ${ids.length} รายการสำเร็จ`)
    clearSel(); setBulkDeleteOpen(false)
  }
  const handleBulkTag = () => {
    if (!bulkTagInput.length) return
    const ids = [...selected]
    bulkTagInput.forEach((tag) => bulkAddTag(ids, tag))
    toast.success(`เพิ่มแท็ก ${bulkTagInput.join(', ')} ให้ ${ids.length} รายการ`)
    setBulkTagInput([]); setBulkTagOpen(false)
  }
  const handleRecat = () => {
    if (!recatCategoryId) return
    const ids = [...selected]
    recategorizeTransactions(ids, recatCategoryId)
    const cat = getCategoryById(recatCategoryId)
    toast.success(`เปลี่ยนหมวดหมู่ ${ids.length} รายการ → ${cat?.name ?? ''}`)
    clearSel(); setRecatOpen(false); setRecatCategoryId('')
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-gray-400 dark:text-white/30">ไม่พบรายการธุรกรรม</p>
      </div>
    )
  }

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className={cn(
          'flex items-center gap-2 px-4 py-2.5 flex-wrap',
          'bg-violet-50 dark:bg-violet-500/10',
          'border-b border-violet-200 dark:border-violet-500/20',
        )}>
          <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">
            เลือก {selected.size} รายการ
          </span>
          {selected.size < transactions.length && (
            <button onClick={selectAll} className="text-xs text-violet-600 dark:text-violet-400 underline underline-offset-2">
              เลือกทั้งหมด {transactions.length}
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Button size="sm" variant="outline"
              className="h-7 text-xs gap-1.5 border-violet-300 dark:border-violet-500/30 text-violet-700 dark:text-violet-400"
              onClick={() => { setRecatCategoryId(''); setRecatOpen(true) }}>
              <Tags className="w-3.5 h-3.5" /> เปลี่ยนหมวดหมู่
            </Button>
            <Button size="sm" variant="outline"
              className="h-7 text-xs gap-1.5 border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
              onClick={() => { setBulkTagInput([]); setBulkTagOpen(true) }}>
              <Tags className="w-3.5 h-3.5" /> เพิ่มแท็ก
            </Button>
            <Button size="sm" variant="outline"
              className="h-7 text-xs gap-1.5 border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400"
              onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> ลบที่เลือก
            </Button>
            <button onClick={clearSel} className="p-1 rounded-md text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grouped list */}
      <div className={cn(
        'rounded-2xl border overflow-hidden',
        'border-gray-100 dark:border-white/[0.07]',
        'bg-white dark:bg-white/[0.02]',
        'shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none',
        className,
      )}>
        {groups.map(([dateKey, txs], gi) => {
          const dailyTotal = txs.reduce((sum, tx) => {
            if (tx.type === 'INCOME') return sum + tx.amount
            return sum - tx.amount
          }, 0)

          const isPositive = dailyTotal > 0
          const isNegative = dailyTotal < 0
          const absTotal = Math.abs(dailyTotal)

          return (
            <div key={dateKey}>
              {/* Date group header */}
              <div className={cn(
                'px-5 py-2.5 flex items-center justify-between',
                'border-b border-gray-100 dark:border-white/[0.05]',
                gi > 0 && 'border-t border-gray-100 dark:border-white/[0.05]',
                'bg-gray-50/60 dark:bg-white/[0.015]',
              )}>
                <span className="text-[11px] font-semibold text-gray-400 dark:text-white/40 uppercase tracking-widest">
                  {dateLabelFor(txs[0].date)}
                </span>
                <span className={cn(
                  'text-[11px] font-bold num tabular-nums tracking-wide',
                  isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-white/40'
                )}>
                  {isPositive ? '+' : isNegative ? '-' : ''}{formatCurrency(absTotal)}
                </span>
              </div>

            {/* Transaction rows */}
            <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              {txs.map((tx) => {
                const cat   = getCategoryById(tx.categoryId)
                const isSel = selected.has(tx.id)
                const isInc = tx.type === 'INCOME'

                return (
                  <div
                    key={tx.id}
                    onClick={() => toggleOne(tx.id)}
                    className={cn(
                      'group flex items-center justify-between px-5 py-3 h-[52px]',
                      'cursor-pointer transition-colors',
                      isSel
                        ? 'bg-violet-50/70 dark:bg-violet-500/[0.08]'
                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
                    )}
                  >
                    {/* Left: icon + name + category */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Selection dot */}
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all',
                        isSel ? 'bg-violet-500 scale-125' : 'bg-transparent',
                      )} />

                      {/* Category icon circle */}
                      {cat ? (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border"
                          style={{
                            backgroundColor: `${cat.color}18`,
                            borderColor:      `${cat.color}40`,
                          }}
                        >
                          <CategoryIcon name={cat.icon} className="w-4 h-4 flex-shrink-0" style={{ color: cat.color }} />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 flex-shrink-0" />
                      )}

                      {/* Description + category name */}
                      <div className="min-w-0 flex flex-col justify-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-white/90 truncate leading-tight">
                          {tx.description}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-white/35 leading-tight">
                          {cat?.name ?? '—'}
                          {tx.tags && tx.tags.length > 0 && (
                            <span className="ml-1.5 text-violet-500 dark:text-violet-400">
                              {tx.tags.map((t) => `#${t}`).join(' ')}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Right: amount + menu */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={cn(
                        'text-sm font-semibold num tabular-nums',
                        isInc
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500 dark:text-red-400',
                      )}>
                        {isInc ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:opacity-100 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => { onEdit(tx); clearSel() }}>
                            <Pencil className="w-4 h-4 mr-2" /> แก้ไข
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSplittingTx(tx)}>
                            <Scissors className="w-4 h-4 mr-2" /> แยกรายการ
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingId(tx.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )})}

        {/* Load more */}
        {hasMore && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-center">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline"
            >
              โหลดเพิ่ม ({transactions.length - visibleCount} รายการ)
            </button>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <SplitTransactionDialog
        transaction={splittingTx}
        open={!!splittingTx}
        onOpenChange={(o) => !o && setSplittingTx(null)}
      />
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="ลบรายการธุรกรรม"
        description="คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`ลบ ${selected.size} รายการ`}
        description={`คุณแน่ใจหรือไม่? รายการที่เลือกทั้ง ${selected.size} รายการจะถูกลบถาวร`}
        onConfirm={handleBulkDelete}
      />
      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent className="max-w-sm dark:bg-[rgba(8,14,30,0.95)] dark:border-white/[0.08] dark:backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">เพิ่มแท็กให้ {selected.size} รายการ</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <TagInput value={bulkTagInput} onChange={setBulkTagInput} suggestions={getAllTags()} placeholder="พิมพ์แท็กแล้วกด Enter..." />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkTagOpen(false)}>ยกเลิก</Button>
            <Button size="sm" disabled={!bulkTagInput.length} onClick={handleBulkTag} className="bg-blue-600 hover:bg-blue-500 text-white">เพิ่มแท็ก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={recatOpen} onOpenChange={setRecatOpen}>
        <DialogContent className="max-w-sm dark:bg-[rgba(8,14,30,0.95)] dark:border-white/[0.08] dark:backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">เปลี่ยนหมวดหมู่ {selected.size} รายการ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {mixedTypes && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
                รายการที่เลือกมีทั้งรายรับและรายจ่าย — จะแสดงหมวดหมู่ทั้งหมด
              </p>
            )}
            <Select value={recatCategoryId} onValueChange={(v) => setRecatCategoryId(v ?? '')}>
              <SelectTrigger className="dark:bg-white/[0.05] dark:border-white/10">
                <SelectValue placeholder="เลือกหมวดหมู่ใหม่" />
              </SelectTrigger>
              <SelectContent>
                {recatCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={c.icon} className="w-4 h-4" style={{ color: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRecatOpen(false)}>ยกเลิก</Button>
            <Button size="sm" disabled={!recatCategoryId} onClick={handleRecat} className="bg-violet-600 hover:bg-violet-500 text-white">ยืนยัน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
