'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, CheckCircle2, AlertCircle, ChevronRight,
  ChevronLeft, ArrowLeftRight, X, Check, Loader2, Info,
  Building2, Sparkles, TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PressCard } from '@/components/ui/PressCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  parseBankCSV,
  suggestCategoryId,
  BANK_FORMAT_LABELS,
  type BankFormat,
  type ParsedRow,
} from '@/lib/csvParser'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { CategoryIcon } from '@/components/shared/CategoryIcon'

/* ─── Types ──────────────────────────────────────── */

interface ImportRow extends ParsedRow {
  id: string
  categoryId: string
  /** user can flip income/expense */
  overrideDebit?: boolean
  selected: boolean
}

type Step = 1 | 2 | 3

/* ─── Bank logos ─────────────────────────────────── */

const BANK_LOGOS: Record<BankFormat, { emoji: string; color: string; shadow: string; border: string }> = {
  kbank:   { emoji: '🏦', color: 'bg-emerald-500', shadow: '0 4px 0 0 #065f46', border: 'border-emerald-400' },
  scb:     { emoji: '💜', color: 'bg-violet-500',  shadow: '0 4px 0 0 #4c1d95', border: 'border-violet-400' },
  bbl:     { emoji: '🔵', color: 'bg-blue-500',    shadow: '0 4px 0 0 #1d4ed8', border: 'border-blue-400'   },
  ktb:     { emoji: '🏛️', color: 'bg-sky-500',     shadow: '0 4px 0 0 #0c4a6e', border: 'border-sky-400'    },
  generic: { emoji: '📄', color: 'bg-gray-500',    shadow: '0 4px 0 0 #374151', border: 'border-gray-400'   },
}

/* ─── Step indicator ─────────────────────────────── */

function StepBadge({ step, current }: { step: number; current: Step }) {
  const done = current > step
  const active = current === step
  return (
    <div className={cn(
      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all',
      done   ? 'bg-violet-500 border-violet-400 text-white'  : '',
      active ? 'bg-violet-600 border-violet-500 text-white scale-110 shadow-[0_3px_0_0_#4c1d95]' : '',
      !done && !active ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400' : '',
    )}>
      {done ? <Check className="w-4 h-4" /> : step}
    </div>
  )
}

function StepBar({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'อัปโหลดไฟล์' },
    { n: 2, label: 'ตรวจสอบข้อมูล' },
    { n: 3, label: 'นำเข้าสำเร็จ' },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-0">
          <div className="flex flex-col items-center gap-1.5">
            <StepBadge step={s.n} current={current} />
            <span className={cn('text-[11px] font-bold whitespace-nowrap', current === s.n ? 'text-violet-600' : 'text-gray-400')}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('w-16 sm:w-24 h-0.5 mx-2 mb-4 rounded-full transition-colors', current > s.n ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700')} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Format selector ────────────────────────────── */

const FORMAT_OPTIONS: { id: BankFormat; label: string; sub: string }[] = [
  { id: 'kbank',   label: 'KBank',   sub: 'ธนาคารกสิกรไทย' },
  { id: 'scb',     label: 'SCB',     sub: 'ธนาคารไทยพาณิชย์' },
  { id: 'bbl',     label: 'BBL',     sub: 'ธนาคารกรุงเทพ' },
  { id: 'ktb',     label: 'KTB',     sub: 'ธนาคารกรุงไทย' },
  { id: 'generic', label: 'อื่นๆ',   sub: 'ตรวจจับอัตโนมัติ' },
]

/* ─── Row editor (inline category + type toggle) ── */

function RowEditor({
  row,
  onChange,
}: {
  row: ImportRow
  onChange: (patch: Partial<ImportRow>) => void
}) {
  const { categories } = useCategoryStore()
  const isDebit = row.overrideDebit ?? row.isDebit
  const typeCategories = categories.filter((c) => c.type === (isDebit ? 'EXPENSE' : 'INCOME'))
  const cat = categories.find((c) => c.id === row.categoryId)

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Income / Expense toggle */}
      <button
        onClick={() => {
          const newDebit = !isDebit
          const suggested = suggestCategoryId(row.description, newDebit)
          onChange({ overrideDebit: newDebit, categoryId: suggested })
        }}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border-2 transition-all',
          isDebit
            ? 'bg-rose-100 border-rose-300 text-rose-600 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-400'
            : 'bg-emerald-100 border-emerald-300 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400',
        )}
      >
        <ArrowLeftRight className="w-3 h-3" />
        {isDebit ? 'รายจ่าย' : 'รายรับ'}
      </button>

      {/* Category picker */}
      <div className="relative">
        <select
          value={row.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          className="appearance-none pl-7 pr-6 py-1 text-xs font-semibold rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 cursor-pointer focus:outline-none focus:border-violet-400 transition-colors"
        >
          {typeCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {cat && (
          <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────── */

export default function ImportPage() {
  const router = useRouter()
  const { addTransaction } = useTransactionStore()
  const { categories } = useCategoryStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [bankFormat, setBankFormat] = useState<BankFormat>('generic')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [detectedFormat, setDetectedFormat] = useState<BankFormat>('generic')
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [selectAll, setSelectAll] = useState(true)

  /* ── File handling ────────────────────────────── */

  function processFile(file: File) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('กรุณาอัปโหลดไฟล์ .csv หรือ .txt เท่านั้น')
      return
    }
    setFileName(file.name)

    const tryParse = (text: string) => {
      const result = parseBankCSV(text, bankFormat === 'generic' ? undefined : bankFormat)
      setDetectedFormat(result.detectedFormat)
      setParseErrors(result.errors)
      const importRows: ImportRow[] = result.rows.map((r, i) => ({
        ...r,
        id: `row-${i}`,
        categoryId: suggestCategoryId(r.description, r.isDebit),
        selected: true,
      }))
      setRows(importRows)
      if (result.rows.length > 0) setStep(2)
      return result.rows.length
    }

    // Try UTF-8 first; if garbled (replacement chars) or 0 rows, retry with TIS-620
    const readerUtf8 = new FileReader()
    readerUtf8.onload = (e) => {
      const text = e.target?.result as string
      const hasGarbled = text.includes('�')
      const count = tryParse(text)

      if (count === 0 || hasGarbled) {
        // Fallback: Windows-874 / TIS-620 (common for Thai bank exports)
        const readerTis = new FileReader()
        readerTis.onload = (e2) => {
          const text2 = e2.target?.result as string
          tryParse(text2)
        }
        readerTis.readAsText(file, 'windows-874')
      }
    }
    readerUtf8.readAsText(file, 'utf-8')
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankFormat])

  /* ── Row update ───────────────────────────────── */

  function updateRow(id: string, patch: Partial<ImportRow>) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r))
  }

  function toggleAll(checked: boolean) {
    setSelectAll(checked)
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })))
  }

  /* ── Import ───────────────────────────────────── */

  async function doImport() {
    setImporting(true)
    const selected = rows.filter((r) => r.selected)
    let count = 0

    for (const row of selected) {
      const isDebit = row.overrideDebit ?? row.isDebit
      addTransaction({
        type:        isDebit ? 'EXPENSE' : 'INCOME',
        categoryId:  row.categoryId,
        amount:      row.amount,
        description: row.description,
        date:        row.date,
        note:        'นำเข้าจากไฟล์ CSV',
      })
      count++
      // yield to prevent blocking UI
      if (count % 20 === 0) await new Promise((r) => setTimeout(r, 0))
    }

    setImportedCount(count)
    setImporting(false)
    setStep(3)
  }

  /* ── Filtered rows ────────────────────────────── */

  const filteredRows = rows.filter((r) => {
    const isDebit = r.overrideDebit ?? r.isDebit
    if (filterType === 'income')  return !isDebit
    if (filterType === 'expense') return isDebit
    return true
  })

  const selectedCount = rows.filter((r) => r.selected).length
  const totalIncome  = rows.filter((r) => r.selected && !(r.overrideDebit ?? r.isDebit)).reduce((s, r) => s + r.amount, 0)
  const totalExpense = rows.filter((r) => r.selected && (r.overrideDebit ?? r.isDebit)).reduce((s, r) => s + r.amount, 0)

  /* ── Render ───────────────────────────────────── */

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">นำเข้าข้อมูล</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">นำเข้า Statement ธนาคารจากไฟล์ CSV</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/transactions')} className="gap-2 text-xs">
          <ChevronLeft className="w-3.5 h-3.5" />
          ธุรกรรม
        </Button>
      </div>

      {/* Step indicator */}
      <StepBar current={step} />

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Bank format selector */}
          <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-900">
            <p className="text-sm font-black text-gray-700 dark:text-gray-200 mb-3">เลือกธนาคาร</p>
            <div className="grid grid-cols-5 gap-2">
              {FORMAT_OPTIONS.map((fmt) => {
                const logo = BANK_LOGOS[fmt.id]
                const isActive = bankFormat === fmt.id
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setBankFormat(fmt.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center',
                      isActive
                        ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 shadow-[0_3px_0_0_#4c1d95]'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300',
                    )}
                  >
                    <span className="text-xl">{logo.emoji}</span>
                    <span className={cn('text-[11px] font-black', isActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-600 dark:text-gray-300')}>{fmt.label}</span>
                    <span className="text-[9px] text-gray-400 leading-tight">{fmt.sub}</span>
                  </button>
                )
              })}
            </div>
          </PressCard>

          {/* Drop zone */}
          <PressCard
            shadow={dragging ? '0 4px 0 0 #4c1d95' : '0 4px 0 0 #d1d5db'}
            shadowHover="0 2px 0 0 #d1d5db"
            className={cn(
              'border-gray-200 dark:border-gray-700 transition-all',
              dragging ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'bg-white dark:bg-gray-900',
            )}
          >
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-4 p-10 cursor-pointer"
            >
              <div className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center transition-all',
                dragging ? 'bg-violet-100 dark:bg-violet-800' : 'bg-gray-100 dark:bg-gray-800',
              )}>
                {dragging
                  ? <Upload className="w-8 h-8 text-violet-500 animate-bounce" />
                  : <FileText className="w-8 h-8 text-gray-400" />
                }
              </div>
              <div className="text-center">
                <p className="text-base font-black text-gray-700 dark:text-gray-200">
                  {dragging ? 'วางไฟล์ที่นี่' : 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก'}
                </p>
                <p className="text-xs text-gray-400 mt-1">รองรับไฟล์ .csv และ .txt (UTF-8, TIS-620)</p>
              </div>
              <div className={cn(
                'px-5 py-2.5 rounded-xl border-2 font-bold text-sm transition-all',
                'border-violet-400 bg-violet-500 text-white shadow-[0_3px_0_0_#4c1d95]',
              )}>
                เลือกไฟล์
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={onFileChange}
            />
          </PressCard>

          {/* Hint */}
          <PressCard shadow="0 3px 0 0 #bfdbfe" shadowHover="0 2px 0 0 #bfdbfe" className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex gap-3">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-bold">วิธีดาวน์โหลด Statement</p>
                <p>• <strong>KBank</strong>: K-Plus → บัญชี → ดูรายการ → Export CSV</p>
                <p>• <strong>SCB</strong>: SCB Easy App → บัญชีของฉัน → ดาวน์โหลดรายการ</p>
                <p>• <strong>BBL</strong>: Bualuang mBanking → ข้อมูลบัญชี → รายการเดินบัญชี</p>
              </div>
            </div>
          </PressCard>
        </div>
      )}

      {/* ── STEP 2: Preview & Edit ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Parse info banner */}
          {parseErrors.length > 0 ? (
            <PressCard shadow="0 3px 0 0 #fca5a5" className="border-rose-300 bg-rose-50 dark:bg-rose-900/20 p-4">
              <div className="flex gap-3">
                <TriangleAlert className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-300">พบข้อผิดพลาดบางส่วน</p>
                  {parseErrors.map((e, i) => <p key={i} className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{e}</p>)}
                </div>
              </div>
            </PressCard>
          ) : (
            <PressCard shadow="0 3px 0 0 #6ee7b7" className="border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    แยกวิเคราะห์สำเร็จ — พบ {rows.length} รายการ
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    รูปแบบ: {BANK_FORMAT_LABELS[detectedFormat]} · ไฟล์: {fileName}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700 px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3 h-3 text-violet-600" />
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400">AI แนะนำหมวดหมู่</span>
                </div>
              </div>
            </PressCard>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <PressCard shadow="0 4px 0 0 #4c1d95" className="border-violet-400 bg-violet-500 p-3.5 text-center">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">เลือกแล้ว</p>
              <p className="text-white font-black text-xl num leading-none mt-1">{selectedCount}</p>
              <p className="text-white/60 text-[10px]">รายการ</p>
            </PressCard>
            <PressCard shadow="0 4px 0 0 #065f46" className="border-emerald-400 bg-emerald-500 p-3.5 text-center">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">รายรับ</p>
              <p className="text-white font-black text-lg num leading-none mt-1 truncate">
                {totalIncome.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-white/60 text-[10px]">บาท</p>
            </PressCard>
            <PressCard shadow="0 4px 0 0 #9f1239" className="border-rose-400 bg-rose-500 p-3.5 text-center">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">รายจ่าย</p>
              <p className="text-white font-black text-lg num leading-none mt-1 truncate">
                {totalExpense.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-white/60 text-[10px]">บาท</p>
            </PressCard>
          </div>

          {/* Filter tabs + select all */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {(['all', 'income', 'expense'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    filterType === f
                      ? 'bg-violet-600 text-white shadow-[0_2px_0_0_#4c1d95]'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
                  )}
                >
                  {f === 'all' ? 'ทั้งหมด' : f === 'income' ? 'รายรับ' : 'รายจ่าย'}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => toggleAll(e.target.checked)}
                className="w-4 h-4 accent-violet-600 rounded"
              />
              เลือกทั้งหมด
            </label>
          </div>

          {/* Row list */}
          <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 dark:border-gray-700 overflow-hidden p-0 bg-white dark:bg-gray-900">
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {filteredRows.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">ไม่มีรายการในตัวกรองนี้</div>
              )}
              {filteredRows.map((row) => {
                const isDebit = row.overrideDebit ?? row.isDebit
                const cat = categories.find((c) => c.id === row.categoryId)
                return (
                  <div
                    key={row.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors',
                      row.selected
                        ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        : 'bg-gray-50 dark:bg-gray-800/30 opacity-50',
                    )}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) => updateRow(row.id, { selected: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-violet-600 rounded flex-shrink-0"
                    />

                    {/* Category icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: (cat?.color ?? '#94a3b8') + '20' }}
                    >
                      {cat
                        ? <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
                        : <Building2 className="w-4 h-4 text-gray-400" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{row.description}</p>
                          <p className="text-[11px] text-gray-400">{row.date}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className={cn('text-sm font-black num', isDebit ? 'text-rose-600' : 'text-emerald-600')}>
                            {isDebit ? '-' : '+'}{row.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {row.balance !== undefined && (
                            <p className="text-[10px] text-gray-400 num">คงเหลือ {row.balance.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</p>
                          )}
                        </div>
                      </div>
                      <RowEditor row={row} onChange={(patch) => updateRow(row.id, patch)} />
                    </div>
                  </div>
                )
              })}
            </div>
          </PressCard>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => { setStep(1); setRows([]); setFileName('') }}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              เปลี่ยนไฟล์
            </Button>
            <Button
              onClick={doImport}
              disabled={selectedCount === 0 || importing}
              className="bg-violet-600 hover:bg-violet-700 gap-2 shadow-[0_4px_0_0_#4c1d95] hover:shadow-[0_2px_0_0_#4c1d95] active:shadow-none hover:[transform:translateY(2px)] active:[transform:translateY(4px)] transition-all"
            >
              {importing
                ? <><Loader2 className="w-4 h-4 animate-spin" />กำลังนำเข้า…</>
                : <><Check className="w-4 h-4" />นำเข้า {selectedCount} รายการ<ChevronRight className="w-4 h-4" /></>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Success ── */}
      {step === 3 && (
        <div className="space-y-5">
          <PressCard shadow="0 5px 0 0 #065f46" className="border-emerald-400 bg-emerald-500 p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-white font-black text-2xl leading-tight">นำเข้าสำเร็จ!</p>
            <p className="text-white/80 text-base font-semibold mt-2">
              เพิ่ม <span className="font-black text-white">{importedCount}</span> รายการเข้าสู่ระบบแล้ว
            </p>
            <p className="text-white/60 text-sm mt-1">จากไฟล์ {fileName}</p>
          </PressCard>

          <div className="grid grid-cols-2 gap-3">
            <PressCard
              shadow="0 4px 0 0 #d1d5db"
              shadowHover="0 2px 0 0 #d1d5db"
              className="border-gray-200 bg-white dark:bg-gray-900 p-4 text-center cursor-pointer"
              onClick={() => { setStep(1); setRows([]); setFileName(''); setImportedCount(0) }}
            >
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">นำเข้าอีกครั้ง</p>
              <p className="text-xs text-gray-400 mt-0.5">อัปโหลดไฟล์ใหม่</p>
            </PressCard>
            <PressCard
              shadow="0 4px 0 0 #4c1d95"
              shadowHover="0 2px 0 0 #4c1d95"
              className="border-violet-400 bg-violet-500 p-4 text-center cursor-pointer"
              onClick={() => router.push('/transactions')}
            >
              <ArrowLeftRight className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-sm font-black text-white">ดูธุรกรรม</p>
              <p className="text-xs text-white/70 mt-0.5">ตรวจสอบรายการ</p>
            </PressCard>
          </div>

          <PressCard shadow="0 3px 0 0 #bfdbfe" className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-bold mb-1">ขั้นตอนต่อไป</p>
                <p>• ตรวจสอบหมวดหมู่ของรายการที่นำเข้า</p>
                <p>• ตั้งงบประมาณตามข้อมูลที่นำเข้า</p>
                <p>• ดูรายงานสรุปในหน้า รายงาน</p>
              </div>
            </div>
          </PressCard>
        </div>
      )}
    </div>
  )
}
