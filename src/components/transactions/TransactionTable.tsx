'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MoreHorizontal, Pencil, Trash2, ArrowUpDown,
  ChevronLeft, ChevronRight, Tags, X, CheckSquare, Scissors,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Transaction } from '@/types'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { TagInput } from '@/components/shared/TagInput'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SplitTransactionDialog } from './SplitTransactionDialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TransactionTableProps {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
}

type SortField = 'date' | 'amount'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 20

export function TransactionTable({ transactions, onEdit }: TransactionTableProps) {
  const { deleteTransaction, deleteTransactions, recategorizeTransactions, bulkAddTag, bulkRemoveTag, getAllTags } = useTransactionStore()
  const { categories, getCategoryById } = useCategoryStore()

  const [deletingId, setDeletingId]         = useState<string | null>(null)
  const [splittingTx, setSplittingTx]       = useState<Transaction | null>(null)
  const [sortField, setSortField]           = useState<SortField>('date')
  const [sortDir, setSortDir]               = useState<SortDir>('desc')
  const [page, setPage]                     = useState(1)
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [recatOpen, setRecatOpen]           = useState(false)
  const [recatCategoryId, setRecatCategoryId] = useState('')
  const [bulkTagOpen, setBulkTagOpen]       = useState(false)
  const [bulkTagInput, setBulkTagInput]     = useState<string[]>([])

  /* ── Sort + paginate ── */
  const sorted = [...transactions].sort((a, b) => {
    const m = sortDir === 'asc' ? 1 : -1
    return sortField === 'date'
      ? (new Date(a.date).getTime() - new Date(b.date).getTime()) * m
      : (a.amount - b.amount) * m
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setPage(1); setSelected(new Set()) }, [transactions.length])

  /* ── Selection helpers ── */
  const pageIds      = paginated.map((t) => t.id)
  const allPageSel   = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const somePageSel  = pageIds.some((id) => selected.has(id))

  const toggleOne = useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])

  const togglePage = useCallback(() => {
    setSelected((s) => {
      const n = new Set(s)
      if (allPageSel) pageIds.forEach((id) => n.delete(id))
      else            pageIds.forEach((id) => n.add(id))
      return n
    })
  }, [allPageSel, pageIds])

  const selectAll = () => setSelected(new Set(sorted.map((t) => t.id)))
  const clearSel  = () => setSelected(new Set())

  /* ── Sort toggle ── */
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
  }

  /* ── Single delete ── */
  const handleDelete = () => {
    if (!deletingId) return
    deleteTransaction(deletingId)
    toast.success('ลบรายการสำเร็จ')
    setDeletingId(null)
  }

  /* ── Bulk delete ── */
  const handleBulkDelete = () => {
    const ids = [...selected]
    deleteTransactions(ids)
    toast.success(`ลบ ${ids.length} รายการสำเร็จ`)
    clearSel()
    setBulkDeleteOpen(false)
  }

  /* ── Bulk tag ── */
  const handleBulkTag = () => {
    if (bulkTagInput.length === 0) return
    const ids = [...selected]
    bulkTagInput.forEach((tag) => bulkAddTag(ids, tag))
    toast.success(`เพิ่มแท็ก ${bulkTagInput.join(', ')} ให้ ${ids.length} รายการ`)
    setBulkTagInput([])
    setBulkTagOpen(false)
  }

  /* ── Bulk re-categorize ── */
  const handleRecat = () => {
    if (!recatCategoryId) return
    const ids = [...selected]
    recategorizeTransactions(ids, recatCategoryId)
    const cat = getCategoryById(recatCategoryId)
    toast.success(`เปลี่ยนหมวดหมู่ ${ids.length} รายการ → ${cat?.name ?? ''}`)
    clearSel()
    setRecatOpen(false)
    setRecatCategoryId('')
  }

  /* ── Selected types (for re-cat filter) ── */
  const selectedTxs = sorted.filter((t) => selected.has(t.id))
  const hasIncome   = selectedTxs.some((t) => t.type === 'INCOME')
  const hasExpense  = selectedTxs.some((t) => t.type === 'EXPENSE')
  const mixedTypes  = hasIncome && hasExpense
  const recatCategories = mixedTypes
    ? categories
    : hasIncome
      ? categories.filter((c) => c.type === 'INCOME')
      : categories.filter((c) => c.type === 'EXPENSE')

  return (
    <>
      {/* ── Bulk action toolbar ── */}
      {selected.size > 0 && (
        <div className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl mb-2 flex-wrap',
          'bg-violet-50 dark:bg-violet-500/10',
          'border border-violet-200 dark:border-violet-500/20',
        )}>
          <CheckSquare className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">
            เลือก {selected.size} รายการ
          </span>

          {selected.size < sorted.length && (
            <button
              onClick={selectAll}
              className="text-xs text-violet-600 dark:text-violet-400 underline underline-offset-2"
            >
              เลือกทั้งหมด {sorted.length} รายการ
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-violet-300 dark:border-violet-500/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/10"
              onClick={() => { setRecatCategoryId(''); setRecatOpen(true) }}
            >
              <Tags className="w-3.5 h-3.5" />
              เปลี่ยนหมวดหมู่
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              onClick={() => { setBulkTagInput([]); setBulkTagOpen(true) }}
            >
              <Tags className="w-3.5 h-3.5" />
              เพิ่มแท็ก
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบที่เลือก
            </Button>
            <button
              onClick={clearSel}
              className="p-1 rounded-md text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className={cn(
        'rounded-xl border overflow-hidden',
        'border-gray-200 dark:border-white/[0.07]',
        'bg-white dark:bg-white/[0.02]',
      )}>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.03]">
              {/* Select all checkbox */}
              <TableHead className="w-10 pl-4">
                <input
                  type="checkbox"
                  checked={allPageSel}
                  ref={(el) => { if (el) el.indeterminate = somePageSel && !allPageSel }}
                  onChange={togglePage}
                  className="w-4 h-4 rounded border-gray-300 dark:border-white/20 accent-violet-600 cursor-pointer"
                />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('date')}>
                <span className="flex items-center gap-1 text-xs">
                  วันที่ <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </span>
              </TableHead>
              <TableHead className="text-xs">รายละเอียด</TableHead>
              <TableHead className="text-xs">หมวดหมู่</TableHead>
              <TableHead className="text-xs">ประเภท</TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort('amount')}>
                <span className="flex items-center justify-end gap-1 text-xs">
                  จำนวนเงิน <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </span>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((tx) => {
              const cat   = getCategoryById(tx.categoryId)
              const isSel = selected.has(tx.id)
              return (
                <TableRow
                  key={tx.id}
                  className={cn(
                    'transition-colors',
                    isSel
                      ? 'bg-violet-50/60 dark:bg-violet-500/[0.07] hover:bg-violet-50 dark:hover:bg-violet-500/10'
                      : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
                  )}
                  onClick={() => toggleOne(tx.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Checkbox */}
                  <TableCell className="pl-4 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleOne(tx.id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-white/20 accent-violet-600 cursor-pointer"
                    />
                  </TableCell>

                  <TableCell className="text-sm text-gray-600 dark:text-white/50 whitespace-nowrap">
                    {formatDateShort(tx.date)}
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white/90">{tx.description}</p>
                      {tx.note && <p className="text-xs text-gray-400 dark:text-white/30">{tx.note}</p>}
                      {tx.tags && tx.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tx.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 text-[10px] font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    {cat && (
                      <span className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-white/60">
                        <CategoryIcon name={cat.icon} className="w-4 h-4 flex-shrink-0" style={{ color: cat.color }} />
                        {cat.name}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className={cn(
                      'text-xs',
                      tx.type === 'INCOME'
                        ? 'border-violet-300 text-violet-700 bg-violet-50 dark:border-violet-500/30 dark:text-violet-400 dark:bg-violet-500/10'
                        : 'border-red-300 text-red-700 bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:bg-red-500/10'
                    )}>
                      {tx.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <span className={cn('font-semibold text-sm', tx.type === 'INCOME' ? 'text-violet-600 dark:text-violet-400' : 'text-red-500 dark:text-red-400')}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(tx)}>
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
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-white/[0.05]">
            <p className="text-xs text-gray-400 dark:text-white/30">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} จาก {sorted.length} รายการ
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                className="p-1.5 rounded-md text-gray-500 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '...')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...'
                    ? <span key={`e-${i}`} className="px-1 text-xs text-gray-400 dark:text-white/20">…</span>
                    : <button key={p} onClick={() => setPage(p as number)}
                        className={cn('min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors',
                          safePage === p ? 'bg-violet-600 text-white' : 'text-gray-600 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.05]')}>
                        {p}
                      </button>
                )}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="p-1.5 rounded-md text-gray-500 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Split dialog ── */}
      <SplitTransactionDialog
        transaction={splittingTx}
        open={!!splittingTx}
        onOpenChange={(o) => !o && setSplittingTx(null)}
      />

      {/* ── Single delete confirm ── */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="ลบรายการธุรกรรม"
        description="คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        onConfirm={handleDelete}
      />

      {/* ── Bulk delete confirm ── */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`ลบ ${selected.size} รายการ`}
        description={`คุณแน่ใจหรือไม่? รายการที่เลือกทั้ง ${selected.size} รายการจะถูกลบถาวร`}
        onConfirm={handleBulkDelete}
      />

      {/* ── Bulk tag dialog ── */}
      <Dialog open={bulkTagOpen} onOpenChange={setBulkTagOpen}>
        <DialogContent className="max-w-sm dark:bg-[rgba(8,14,30,0.95)] dark:border-white/[0.08] dark:backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">เพิ่มแท็กให้ {selected.size} รายการ</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <TagInput
              value={bulkTagInput}
              onChange={setBulkTagInput}
              suggestions={getAllTags()}
              placeholder="พิมพ์แท็กแล้วกด Enter..."
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkTagOpen(false)}>ยกเลิก</Button>
            <Button size="sm" disabled={bulkTagInput.length === 0} onClick={handleBulkTag}
              className="bg-blue-600 hover:bg-blue-500 text-white">
              เพิ่มแท็ก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Re-categorize dialog ── */}
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
                      <span className="text-xs text-gray-400 ml-1">
                        {c.type === 'INCOME' ? '(รายรับ)' : '(รายจ่าย)'}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRecatOpen(false)}>ยกเลิก</Button>
            <Button size="sm" disabled={!recatCategoryId} onClick={handleRecat}
              className="bg-violet-600 hover:bg-violet-500 text-white">
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
