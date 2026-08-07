'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Transaction } from '@/types'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ExportDialogProps {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  filtered:      Transaction[]   // currently filtered rows
}

type ColKey = 'date' | 'description' | 'note' | 'tags' | 'category' | 'type' | 'amount'

const ALL_COLS: { key: ColKey; label: string; required?: boolean }[] = [
  { key: 'date',        label: 'วันที่',        required: true },
  { key: 'description', label: 'รายละเอียด',   required: true },
  { key: 'note',        label: 'หมายเหตุ'   },
  { key: 'tags',        label: 'แท็ก'        },
  { key: 'category',    label: 'หมวดหมู่',    required: true },
  { key: 'type',        label: 'ประเภท',       required: true },
  { key: 'amount',      label: 'จำนวนเงิน',   required: true },
]

type Scope = 'filtered' | 'all'

export function ExportDialog({ open, onOpenChange, filtered }: ExportDialogProps) {
  const { getCategoryById } = useCategoryStore()
  const { transactions } = useTransactionStore()

  const [scope, setScope]       = useState<Scope>('filtered')
  const [cols, setCols]         = useState<Set<ColKey>>(
    new Set(['date', 'description', 'note', 'tags', 'category', 'type', 'amount'])
  )

  const rows    = scope === 'filtered' ? filtered : transactions
  const rowCount = rows.length

  const toggleCol = (key: ColKey) => {
    setCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else               next.add(key)
      return next
    })
  }

  const handleExport = () => {
    const orderedCols = ALL_COLS.filter((c) => cols.has(c.key))

    const headers = orderedCols.map((c) => c.label)

    const dataRows = rows.map((t) => {
      const cat = getCategoryById(t.categoryId)
      return orderedCols.map(({ key }) => {
        switch (key) {
          case 'date':        return t.date
          case 'description': return `"${t.description.replace(/"/g, '""')}"`
          case 'note':        return t.note ? `"${t.note.replace(/"/g, '""')}"` : ''
          case 'tags':        return t.tags?.length ? `"${t.tags.join(', ')}"` : ''
          case 'category':    return cat?.name ?? ''
          case 'type':        return t.type === 'INCOME' ? 'รายรับ' : t.type === 'EXPENSE' ? 'รายจ่าย' : 'โอนย้าย'
          case 'amount':      return t.type === 'EXPENSE' ? `-${t.amount}` : `${t.amount}`
          default:            return ''
        }
      })
    })

    const csv = [headers, ...dataRows].map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `financeme-${scope}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success(`ส่งออกสำเร็จ ${rowCount} รายการ`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'max-w-sm',
        'dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08] dark:backdrop-blur-2xl',
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="w-4 h-4 text-violet-500" />
            ส่งออก CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Scope */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 dark:text-white/50">ข้อมูลที่ส่งออก</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger className="dark:bg-white/[0.05] dark:border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="filtered">
                  รายการที่กรองอยู่ ({filtered.length} รายการ)
                </SelectItem>
                <SelectItem value="all">
                  ทั้งหมด ({transactions.length} รายการ)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600 dark:text-white/50">คอลัมน์ที่รวม</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_COLS.map(({ key, label, required }) => {
                const active = cols.has(key)
                return (
                  <button
                    key={key}
                    onClick={() => !required && toggleCol(key)}
                    disabled={required}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left',
                      active
                        ? required
                          ? 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40 cursor-default'
                          : 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30'
                        : 'bg-gray-50 dark:bg-white/[0.03] text-gray-400 dark:text-white/25 border border-transparent hover:border-gray-200 dark:hover:border-white/10',
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      active
                        ? required ? 'border-gray-400 dark:border-white/30 bg-gray-400 dark:bg-white/30' : 'border-violet-500 bg-violet-500'
                        : 'border-gray-300 dark:border-white/20',
                    )}>
                      {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-white/25">
              คอลัมน์สีเทาบังคับรวม
            </p>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
            <FileSpreadsheet className="w-4 h-4 text-violet-500 flex-shrink-0" />
            <div className="text-xs text-violet-700 dark:text-violet-400">
              <span className="font-semibold">{rowCount}</span> แถว ×{' '}
              <span className="font-semibold">{cols.size}</span> คอลัมน์
              {' '}→ <span className="font-medium">financeme-{scope}-{new Date().toISOString().slice(0, 10)}.csv</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button
            onClick={handleExport}
            disabled={rowCount === 0}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            ส่งออก {rowCount} รายการ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
