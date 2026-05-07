'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, ChevronRight, ChevronLeft, Check, AlertCircle, CopyCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { parseCsv, parseDate, parseAmount } from '@/lib/csvParser'
import { TransactionType } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

/* ── Thai bank CSV presets ───────────────────────────────────────── */
interface BankPreset {
  id:    string
  name:  string
  short: string
  color: string
  // column header keywords (lowercase) for auto-detect
  date:        string[]
  amount:      string[]
  description: string[]
  negativeIsExpense: boolean
}

const BANK_PRESETS: BankPreset[] = [
  {
    id: 'kbank', name: 'KBank', short: 'K',
    color: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/25',
    date:        ['วันที่ทำรายการ', 'date', 'txn date', 'transaction date'],
    amount:      ['จำนวนเงิน', 'debit', 'credit', 'amount'],
    description: ['รายการ', 'description', 'detail', 'channel'],
    negativeIsExpense: true,
  },
  {
    id: 'scb', name: 'SCB', short: 'S',
    color: 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/25',
    date:        ['วันที่', 'date'],
    amount:      ['เดบิต', 'เครดิต', 'debit', 'credit', 'จำนวน'],
    description: ['รายการ', 'description', 'channel'],
    negativeIsExpense: true,
  },
  {
    id: 'bbl', name: 'BBL', short: 'B',
    color: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/25',
    date:        ['posting date', 'date', 'วันที่'],
    amount:      ['debit amount', 'credit amount', 'amount', 'จำนวนเงิน'],
    description: ['description', 'channel', 'remark', 'รายละเอียด'],
    negativeIsExpense: true,
  },
  {
    id: 'ktb', name: 'Krungthai', short: 'KT',
    color: 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/25',
    date:        ['txn date', 'date', 'วันที่'],
    amount:      ['amount', 'จำนวนเงิน', 'debit', 'credit'],
    description: ['description', 'channel', 'ช่องทาง'],
    negativeIsExpense: true,
  },
  {
    id: 'bay', name: 'Krungsri', short: 'BAY',
    color: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/25',
    date:        ['date', 'วันที่'],
    amount:      ['amount', 'debit', 'credit', 'จำนวน'],
    description: ['description', 'remark', 'รายการ'],
    negativeIsExpense: true,
  },
]

interface ParsedRow {
  id: string
  date: string | null
  rawDate: string
  description: string
  amount: number | null
  rawAmount: string
  type: TransactionType
  categoryId: string
  include: boolean
  error?: string
  isDuplicate?: boolean   // suspected duplicate of an existing transaction
}

interface ColumnMap {
  date: string
  amount: string
  description: string
}

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NONE = '__none__'

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const { categories } = useCategoryStore()
  const { addTransaction, transactions: existingTxns } = useTransactionStore()

  const [step, setStep] = useState<1 | 2>(1)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [colMap, setColMap] = useState<ColumnMap>({ date: NONE, amount: NONE, description: NONE })
  const [negativeIsExpense, setNegativeIsExpense] = useState(true)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [bulkType, setBulkType] = useState<TransactionType | ''>('')
  const [bulkCategory, setBulkCategory] = useState('')
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')
  const incomeCategories = categories.filter((c) => c.type === 'INCOME')

  const reset = () => {
    setStep(1)
    setHeaders([])
    setRawRows([])
    setColMap({ date: NONE, amount: NONE, description: NONE })
    setParsedRows([])
    setBulkType('')
    setBulkCategory('')
    setSelectedBank(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  /* Apply a bank preset to the column map */
  const applyBankPreset = (preset: BankPreset) => {
    if (headers.length === 0) return
    const lower = headers.map((h) => h.toLowerCase().trim())

    const findCol = (keywords: string[]) => {
      for (const kw of keywords) {
        const idx = lower.findIndex((h) => h.includes(kw.toLowerCase()))
        if (idx !== -1) return headers[idx]
      }
      return NONE
    }

    setColMap({
      date:        findCol(preset.date),
      amount:      findCol(preset.amount),
      description: findCol(preset.description),
    })
    setNegativeIsExpense(preset.negativeIsExpense)
    setSelectedBank(preset.id)
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
    if (file.size > MAX_SIZE) {
      toast.error('ไฟล์ใหญ่เกิน 5 MB — กรุณาแบ่งไฟล์ก่อนนำเข้า')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCsv(text)
      if (rows.length < 2) { toast.error('ไฟล์ CSV ต้องมีอย่างน้อย 2 แถว'); return }

      // Sanity-check: first row must look like headers (non-empty strings)
      const firstRow = rows[0]
      if (firstRow.every((cell) => cell.trim() === '' || /^\d+(\.\d+)?$/.test(cell.trim()))) {
        toast.error('ไม่พบแถว Header — ไฟล์ต้องมีชื่อคอลัมน์ในแถวแรก')
        return
      }

      setHeaders(rows[0])
      setRawRows(rows.slice(1))
      // Auto-detect columns by header name
      const lower = rows[0].map((h) => h.toLowerCase())
      setColMap({
        date: lower.findIndex((h) => h.includes('date') || h.includes('วัน') || h.includes('เวลา')) !== -1
          ? rows[0][lower.findIndex((h) => h.includes('date') || h.includes('วัน') || h.includes('เวลา'))]
          : NONE,
        amount: lower.findIndex((h) => h.includes('amount') || h.includes('จำนวน') || h.includes('เงิน')) !== -1
          ? rows[0][lower.findIndex((h) => h.includes('amount') || h.includes('จำนวน') || h.includes('เงิน'))]
          : NONE,
        description: lower.findIndex((h) => h.includes('desc') || h.includes('detail') || h.includes('รายการ') || h.includes('คำอธิบาย')) !== -1
          ? rows[0][lower.findIndex((h) => h.includes('desc') || h.includes('detail') || h.includes('รายการ') || h.includes('คำอธิบาย'))]
          : NONE,
      })
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const handleNext = () => {
    if (colMap.date === NONE || colMap.amount === NONE || colMap.description === NONE) {
      toast.error('กรุณาเลือกคอลัมน์ วันที่ จำนวนเงิน และรายละเอียด')
      return
    }

    const dateIdx = headers.indexOf(colMap.date)
    const amtIdx  = headers.indexOf(colMap.amount)
    const descIdx = headers.indexOf(colMap.description)

    // Column quality check: warn if >60% of values in date or amount column are unparseable
    const sampleSize = Math.min(rawRows.length, 20)
    const badDates   = rawRows.slice(0, sampleSize).filter((r) => !parseDate(r[dateIdx] ?? '')).length
    const badAmounts = rawRows.slice(0, sampleSize).filter((r) => parseAmount(r[amtIdx] ?? '') === null).length

    if (badDates / sampleSize > 0.6) {
      toast.error('คอลัมน์วันที่อาจไม่ถูกต้อง — ค่ามากกว่า 60% อ่านไม่ได้ กรุณาตรวจสอบการเลือกคอลัมน์')
      return
    }
    if (badAmounts / sampleSize > 0.6) {
      toast.error('คอลัมน์จำนวนเงินอาจไม่ถูกต้อง — ค่ามากกว่า 60% อ่านไม่ได้ กรุณาตรวจสอบการเลือกคอลัมน์')
      return
    }

    const defaultExpCat = expenseCategories[expenseCategories.length - 1]?.id ?? ''
    const defaultIncCat = incomeCategories[incomeCategories.length - 1]?.id ?? ''

    const rows: ParsedRow[] = rawRows.map((row, i) => {
      const rawDate = row[dateIdx] ?? ''
      const rawAmount = row[amtIdx] ?? ''
      const description = row[descIdx] ?? ''
      const date = parseDate(rawDate)
      const amount = parseAmount(rawAmount)

      let type: TransactionType = 'EXPENSE'
      if (amount !== null) {
        type = negativeIsExpense
          ? (amount < 0 ? 'EXPENSE' : 'INCOME')
          : 'EXPENSE'
      }

      const errors: string[] = []
      if (!date) errors.push('วันที่ไม่ถูกต้อง')
      if (amount === null) errors.push('จำนวนเงินไม่ถูกต้อง')

      /* Duplicate detection: same date + same absolute amount */
      const absAmount = amount !== null ? Math.abs(amount) : null
      const isDuplicate = date !== null && absAmount !== null && existingTxns.some((t) => {
        if (Math.abs(t.amount - absAmount) > 0.01) return false
        // Allow ±1 day tolerance
        const diff = Math.abs(new Date(t.date).getTime() - new Date(date).getTime())
        return diff <= 86_400_000
      })

      return {
        id: `row-${i}`,
        date,
        rawDate,
        description,
        amount: absAmount,
        rawAmount,
        type,
        categoryId: type === 'INCOME' ? defaultIncCat : defaultExpCat,
        include: errors.length === 0,
        error: errors.join(', ') || undefined,
        isDuplicate,
      }
    })
    const validRows = rows.filter((r) => !r.error)
    if (validRows.length === 0) {
      toast.error('ไม่มีแถวที่ถูกต้องเลย — ตรวจสอบการจับคู่คอลัมน์อีกครั้ง')
      return
    }
    if (rows.length > 5 && validRows.length / rows.length < 0.2) {
      toast.warning(`มีเพียง ${validRows.length} จาก ${rows.length} แถวที่อ่านได้ — ตรวจสอบคอลัมน์ที่เลือก`, { duration: 6000 })
    }

    setParsedRows(rows)
    setStep(2)
  }

  const updateRow = (id: string, patch: Partial<ParsedRow>) =>
    setParsedRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r))

  const applyBulk = () => {
    setParsedRows((prev) => prev.map((r) => ({
      ...r,
      ...(bulkType ? { type: bulkType as TransactionType } : {}),
      ...(bulkCategory ? { categoryId: bulkCategory } : {}),
    })))
  }

  const handleImport = () => {
    const toImport = parsedRows.filter((r) => r.include && r.date && r.amount !== null && r.categoryId)
    if (toImport.length === 0) { toast.error('ไม่มีรายการที่เลือก'); return }

    for (const row of toImport) {
      addTransaction({
        categoryId: row.categoryId,
        type: row.type,
        amount: row.amount!,
        description: row.description || 'นำเข้าจาก CSV',
        date: row.date!,
      })
    }
    toast.success(`นำเข้าสำเร็จ ${toImport.length} รายการ`)
    handleClose(false)
  }

  const validCount = parsedRows.filter((r) => r.include && r.date && r.amount !== null && r.categoryId).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            นำเข้าจาก CSV
            <Badge variant="secondary">ขั้นตอน {step}/2</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">

          {/* ─── Step 1: Upload + Map columns ─── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Bank presets */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">เลือกธนาคาร (ไม่บังคับ)</p>
                <div className="flex flex-wrap gap-2">
                  {BANK_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyBankPreset(preset)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        selectedBank === preset.id
                          ? preset.color + ' ring-2 ring-offset-1 ring-current'
                          : preset.color,
                        headers.length === 0 && 'opacity-40 cursor-not-allowed',
                      )}
                      disabled={headers.length === 0}
                      title={headers.length === 0 ? 'อัปโหลดไฟล์ก่อน' : `ใช้ preset ของ ${preset.name}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-[9px] font-bold">
                        {preset.short}
                      </span>
                      {preset.name}
                    </button>
                  ))}
                </div>
                {headers.length === 0 && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">อัปโหลดไฟล์ CSV ก่อนเพื่อใช้ preset</p>
                )}
              </div>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">คลิกเพื่อเลือกไฟล์ CSV</p>
                <p className="text-xs text-gray-400 mt-1">รองรับ .csv จากทุก Bank (UTF-8 หรือ TIS-620)</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </div>

              {headers.length > 0 && (
                <>
                  {/* Preview */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">ตัวอย่างข้อมูล (3 แถวแรก)</p>
                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      <table className="text-xs w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            {headers.map((h, i) => (
                              <th key={i} className="px-3 py-2 text-left text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rawRows.slice(0, 3).map((row, i) => (
                            <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[160px] truncate">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Column mapping */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">จับคู่คอลัมน์</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(['date', 'amount', 'description'] as const).map((field) => (
                        <div key={field}>
                          <Label className="text-xs mb-1.5 block">
                            {field === 'date' ? '📅 วันที่ *' : field === 'amount' ? '💰 จำนวนเงิน *' : '📝 รายละเอียด *'}
                          </Label>
                          <Select value={colMap[field]} onValueChange={(v) => setColMap((p) => ({ ...p, [field]: v }))}>
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="เลือกคอลัมน์" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>— ไม่เลือก —</SelectItem>
                              {headers.map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Amount sign convention */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <input
                      type="checkbox"
                      id="negIsExp"
                      checked={negativeIsExpense}
                      onChange={(e) => setNegativeIsExpense(e.target.checked)}
                      className="w-4 h-4 accent-violet-600"
                    />
                    <label htmlFor="negIsExp" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      จำนวนเงินติดลบ = รายจ่าย (ปลดเลือกถ้า Bank ใช้ Column แยก)
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Step 2: Preview + edit ─── */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Bulk apply */}
              <div className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <Label className="text-xs mb-1 block">ใช้กับทุกแถว — ประเภท</Label>
                  <Select value={bulkType} onValueChange={(v) => setBulkType(v as TransactionType | '')}>
                    <SelectTrigger className="text-xs h-8 w-28">
                      <SelectValue placeholder="เลือก" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPENSE">รายจ่าย</SelectItem>
                      <SelectItem value="INCOME">รายรับ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">หมวดหมู่</Label>
                  <Select value={bulkCategory} onValueChange={(v) => setBulkCategory(v ?? '')}>
                    <SelectTrigger className="text-xs h-8 w-36">
                      <SelectValue placeholder="เลือก" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-1.5">
                            <CategoryIcon name={cat.icon} className="w-3 h-3" style={{ color: cat.color }} />
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" variant="outline" onClick={applyBulk} className="h-8 text-xs">
                  ใช้งาน
                </Button>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    เลือก {validCount}/{parsedRows.length} รายการ
                  </p>
                  {parsedRows.filter(r => r.isDuplicate && !r.error).length > 0 && (
                    <p className="text-[11px] text-amber-500 flex items-center gap-1 justify-end mt-0.5">
                      <CopyCheck className="w-3 h-3" />
                      {parsedRows.filter(r => r.isDuplicate && !r.error).length} รายการอาจซ้ำ
                    </p>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-8">
                        <input
                          type="checkbox"
                          checked={parsedRows.every((r) => r.include || !!r.error)}
                          onChange={(e) => setParsedRows((p) => p.map((r) => r.error ? r : { ...r, include: e.target.checked }))}
                          className="accent-violet-600"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">วันที่</th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">รายละเอียด</th>
                      <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">จำนวน</th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">ประเภท</th>
                      <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400">หมวดหมู่</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {parsedRows.map((row) => {
                      const catList = row.type === 'INCOME' ? incomeCategories : expenseCategories
                      return (
                        <tr
                          key={row.id}
                          className={`${row.error ? 'bg-red-50 dark:bg-red-900/10' : row.include ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800 opacity-50'}`}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {row.error ? (
                                <span title={row.error}><AlertCircle className="w-4 h-4 text-red-400" /></span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={row.include}
                                  onChange={(e) => updateRow(row.id, { include: e.target.checked })}
                                  className="accent-violet-600"
                                />
                              )}
                              {row.isDuplicate && !row.error && (
                                <span title="อาจเป็นรายการซ้ำ (วันที่และจำนวนเงินตรงกับรายการที่มีอยู่แล้ว)">
                                  <CopyCheck className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {row.date ?? <span className="text-red-400">{row.rawDate}</span>}
                          </td>
                          <td className="px-3 py-2 max-w-[180px] truncate text-gray-700 dark:text-gray-300" title={row.description}>
                            {row.description}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {row.amount !== null ? (
                              <span className={row.type === 'INCOME' ? 'text-violet-600' : 'text-red-500'}>
                                {formatCurrency(row.amount)}
                              </span>
                            ) : (
                              <span className="text-red-400">{row.rawAmount}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={row.type}
                              onValueChange={(v) => {
                                const type = v as TransactionType
                                const fallback = type === 'INCOME' ? incomeCategories[0]?.id : expenseCategories[0]?.id
                                updateRow(row.id, { type, categoryId: fallback ?? '' })
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EXPENSE">รายจ่าย</SelectItem>
                                <SelectItem value="INCOME">รายรับ</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Select value={row.categoryId} onValueChange={(v) => updateRow(row.id, { categoryId: v ?? undefined })}>
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue placeholder="เลือก" />
                              </SelectTrigger>
                              <SelectContent>
                                {catList.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <span className="flex items-center gap-1.5">
                                      <CategoryIcon name={cat.icon} className="w-3 h-3" style={{ color: cat.color }} />
                                      {cat.name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>ยกเลิก</Button>
              <Button
                onClick={handleNext}
                disabled={headers.length === 0}
                className="bg-violet-600 hover:bg-violet-700 gap-1"
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0}
                className="bg-violet-600 hover:bg-violet-700 gap-1"
              >
                <Check className="w-4 h-4" /> นำเข้า {validCount} รายการ
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
