'use client'

import { useState, useRef, useCallback, useId } from 'react'
import {
  Camera, Upload, X, Loader2, ScanLine, CheckCircle2,
  ChevronDown, CalendarIcon, AlertCircle, Sparkles, Plus, Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useQuickAddStore } from '@/store/useQuickAddStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import type { Category, TransactionType } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'

/* ── Types ── */
interface ParsedReceipt {
  amount:      number | null
  currency:    string
  type:        'EXPENSE' | 'INCOME' | 'UNKNOWN'
  merchant:    string | null
  description: string | null
  date:        string | null
  confidence:  number
}

interface ReviewItem {
  id:          string
  file:        File
  previewUrl:  string
  status:      'pending' | 'scanning' | 'done' | 'error'
  parsed:      ParsedReceipt | null
  errorMsg:    string | null
  // editable form fields
  type:        'INCOME' | 'EXPENSE'
  amount:      string
  description: string
  categoryId:  string
  date:        Date
}

type Step = 'upload' | 'scanning' | 'review'

/* ── Image utils ── */
async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [header, data] = result.split(',')
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
      resolve({ data, mimeType })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function compressImage(file: File, maxSizeKB = 4000): Promise<File> {
  if (file.size / 1024 <= maxSizeKB) return file
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio  = Math.sqrt((maxSizeKB * 1024) / file.size)
      canvas.width  = img.width  * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

/* ── Confidence badge ── */
function ConfBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = pct >= 80
    ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
    : pct >= 50
    ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400'
    : 'text-red-500 bg-red-50 dark:bg-red-500/10'
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', color)}>
      {pct}%
    </span>
  )
}

function makeItem(file: File): ReviewItem {
  return {
    id:          crypto.randomUUID(),
    file,
    previewUrl:  URL.createObjectURL(file),
    status:      'pending',
    parsed:      null,
    errorMsg:    null,
    type:        'EXPENSE',
    amount:      '',
    description: '',
    categoryId:  '',
    date:        new Date(),
  }
}

/* ── Main component ── */
export function ReceiptScanner() {
  const { scanOpen, setScanOpen } = useQuickAddStore()
  const { addTransaction }        = useTransactionStore()
  const { categories }            = useCategoryStore()

  const [step, setStep]     = useState<Step>('upload')
  const [items, setItems]   = useState<ReviewItem[]>([])
  const [scanIdx, setScanIdx] = useState(0)   // which item is being scanned
  const [globalError, setGlobalError] = useState<string | null>(null)

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const cameraRef     = useRef<HTMLInputElement>(null)
  const uid = useId()

  /* ── helpers ── */
  const updateItem = useCallback((id: string, patch: Partial<ReviewItem>) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const removed = prev.find((it) => it.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((it) => it.id !== id)
    })
  }, [])

  const handleClose = useCallback(() => {
    setScanOpen(false)
    setStep('upload')
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl))
    setItems([])
    setScanIdx(0)
    setGlobalError(null)
  }, [setScanOpen, items])

  /* ── Add files to queue ── */
  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const newItems = Array.from(files).map(makeItem)
    setItems((prev) => [...prev, ...newItems])
    setGlobalError(null)
  }, [])

  /* ── Scan one item ── */
  const scanOne = useCallback(async (item: ReviewItem): Promise<Partial<ReviewItem>> => {
    try {
      const compressed = await compressImage(item.file)
      const { data, mimeType } = await fileToBase64(compressed)

      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: data, mimeType }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? `HTTP ${res.status}`)
      }

      const parsed: ParsedReceipt = await res.json()

      const patch: Partial<ReviewItem> = { status: 'done', parsed }
      if (parsed.type !== 'UNKNOWN') patch.type = parsed.type
      if (parsed.amount)      patch.amount      = String(parsed.amount)
      if (parsed.description) patch.description = parsed.description
      else if (parsed.merchant) patch.description = parsed.merchant
      if (parsed.date) {
        const d = new Date(parsed.date)
        if (!isNaN(d.getTime())) patch.date = d
      }
      return patch
    } catch (err) {
      return { status: 'error', errorMsg: (err as Error).message ?? 'เกิดข้อผิดพลาด' }
    }
  }, [])

  /* ── Scan all queued items sequentially ── */
  const startScanning = useCallback(async () => {
    if (items.length === 0) return
    setStep('scanning')
    setGlobalError(null)

    for (let i = 0; i < items.length; i++) {
      setScanIdx(i)
      const item = items[i]
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, status: 'scanning' } : it))
      const patch = await scanOne(item)
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, ...patch } : it))
    }

    setStep('review')
    setScanIdx(0)
  }, [items, scanOne])

  /* ── Save valid items ── */
  const saveAll = useCallback(() => {
    const valid = items.filter((it) => {
      const amt = parseFloat(it.amount)
      return !isNaN(amt) && amt > 0 && it.description.trim() && it.categoryId
    })

    if (valid.length === 0) {
      toast.error('กรุณากรอกข้อมูลให้ครบก่อนบันทึก')
      return
    }

    valid.forEach((it) => {
      addTransaction({
        type:        it.type as TransactionType,
        categoryId:  it.categoryId,
        amount:      parseFloat(it.amount),
        description: it.description.trim(),
        date:        it.date.toISOString(),
        note:        it.parsed?.merchant ? `สแกนจากสลิป: ${it.parsed.merchant}` : 'สแกนจากสลิป',
      })
    })

    toast.success(`✅ บันทึกแล้ว ${valid.length} รายการ`)
    handleClose()
  }, [items, addTransaction, handleClose])

  const doneCount    = items.filter((it) => it.status === 'done').length
  const errorCount   = items.filter((it) => it.status === 'error').length
  const totalAmount  = items.reduce((s, it) => {
    const a = parseFloat(it.amount)
    return s + (isNaN(a) ? 0 : a)
  }, 0)

  /* ── Render ── */
  return (
    <Dialog open={scanOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08]">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-violet-50 to-teal-50/50 dark:from-violet-500/10 dark:to-teal-500/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-white/80">
              <ScanLine className="w-4 h-4 text-primary" />
              สแกนสลิป / ใบเสร็จ
              {items.length > 0 && (
                <span className="ml-auto text-[11px] font-medium text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 rounded-full">
                  {items.length} สลิป
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* ══════════════════════════════════════════
            STEP: upload
        ══════════════════════════════════════════ */}
        {step === 'upload' && (
          <div className="px-5 pb-5 pt-3 space-y-3 max-h-[70vh] overflow-y-auto">

            {globalError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{globalError}</p>
              </div>
            )}

            {/* Hidden inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
            />

            {/* Add buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/5 text-violet-700 dark:text-violet-400 hover:border-violet-400 hover:bg-violet-50 transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-xs font-semibold">ถ่ายรูป</p>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] text-gray-600 dark:text-white/50 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
                  <Upload className="w-5 h-5 text-gray-500 dark:text-white/40" />
                </div>
                <p className="text-xs font-semibold">เลือกจากคลัง</p>
              </button>
            </div>

            {/* Queue thumbnails */}
            {items.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wide">
                  คิวรอสแกน ({items.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((it) => (
                    <div key={it.id} className="relative group rounded-xl overflow-hidden border border-gray-100 dark:border-white/[0.06] aspect-square bg-gray-50 dark:bg-white/[0.03]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.previewUrl} alt="slip" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeItem(it.id)}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add more mini button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-white/[0.07] flex items-center justify-center text-gray-300 dark:text-white/20 hover:border-violet-300 hover:text-violet-400 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-[10px] text-gray-400 dark:text-white/25">
              เลือกได้หลายรูปพร้อมกัน • ข้อมูลไม่ถูกเก็บไว้
            </p>

            {/* Scan button */}
            <Button
              className="w-full gap-2"
              disabled={items.length === 0}
              onClick={startScanning}
            >
              <ScanLine className="w-4 h-4" />
              สแกน {items.length > 0 ? `${items.length} สลิป` : 'สลิป'}
            </Button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP: scanning
        ══════════════════════════════════════════ */}
        {step === 'scanning' && (
          <div className="px-5 pb-6 pt-4 space-y-4">
            {/* Progress */}
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-gray-700 dark:text-white/70">
                กำลังสแกน {scanIdx + 1} / {items.length}
              </p>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${((scanIdx) / items.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Thumbnails with status */}
            <div className="grid grid-cols-3 gap-2">
              {items.map((it, idx) => (
                <div key={it.id} className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-white/[0.06] aspect-square bg-gray-50 dark:bg-white/[0.03]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.previewUrl} alt="slip" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {it.status === 'scanning' && <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />}
                    {it.status === 'done'     && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                    {it.status === 'error'    && <AlertCircle className="w-6 h-6 text-red-400" />}
                    {it.status === 'pending'  && (
                      <span className="text-[10px] font-bold text-white bg-black/40 rounded-full px-2 py-0.5">{idx + 1}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-white/30">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AI กำลังวิเคราะห์รูป...
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP: review
        ══════════════════════════════════════════ */}
        {step === 'review' && (
          <div className="flex flex-col max-h-[70vh]">
            {/* Summary bar */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ {doneCount} สลิป</span>
                {errorCount > 0 && <span className="text-red-400 font-semibold">✗ {errorCount} ผิดพลาด</span>}
              </div>
              {totalAmount > 0 && (
                <span className="text-xs font-bold text-gray-700 dark:text-white/70">
                  รวม {formatCurrency(totalAmount)}
                </span>
              )}
            </div>

            {/* Scrollable list of receipts */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {items.map((it, idx) => (
                <ReceiptCard
                  key={it.id}
                  item={it}
                  index={idx}
                  categories={categories}
                  onChange={(patch) => updateItem(it.id, patch)}
                  onRemove={() => removeItem(it.id)}
                />
              ))}
            </div>

            {/* Footer buttons */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-white/[0.05] space-y-2">
              <Button className="w-full gap-2" onClick={saveAll} disabled={doneCount === 0}>
                <CheckCircle2 className="w-4 h-4" />
                บันทึกทั้งหมด {doneCount} รายการ
              </Button>
              <button
                onClick={() => { setStep('upload') }}
                className="w-full text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 py-1 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" /> เพิ่มสลิปอีก
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ══════════════════════════════════════════════════════════
   ReceiptCard — editable card for each scanned slip
══════════════════════════════════════════════════════════ */
interface ReceiptCardProps {
  item:       ReviewItem
  index:      number
  categories: Category[]
  onChange:   (patch: Partial<ReviewItem>) => void
  onRemove:   () => void
}

function ReceiptCard({ item, index, categories, onChange, onRemove }: ReceiptCardProps) {
  const filteredCats = categories.filter((c) => c.type === item.type)
  const amt = parseFloat(item.amount)
  const isValid = !isNaN(amt) && amt > 0 && item.description.trim() && item.categoryId

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all',
      item.status === 'error'
        ? 'border-red-200 dark:border-red-500/20 bg-red-50/30 dark:bg-red-500/5'
        : isValid
        ? 'border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-white/[0.03]'
        : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.03]',
    )}>
      {/* Card header: thumbnail + status */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-white/[0.05]">
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/[0.05]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.previewUrl} alt={`slip ${index + 1}`} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-white/40">สลิป {index + 1}</span>
            {item.parsed && <ConfBadge confidence={item.parsed.confidence} />}
            {item.status === 'error' && (
              <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">• ผิดพลาด</span>
            )}
          </div>
          {item.status === 'error' && item.errorMsg && (
            <p className="text-[10px] text-red-400 truncate">{item.errorMsg}</p>
          )}
          {isValid && (
            <p className="text-xs font-bold text-gray-700 dark:text-white/80 truncate">{item.description}</p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-gray-300 dark:text-white/20 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable fields */}
      <div className="p-3 space-y-2.5">
        {/* Type toggle */}
        <div className="flex rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
          {(['EXPENSE', 'INCOME'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ type: t, categoryId: '' })}
              className={cn(
                'flex-1 py-1.5 text-xs font-semibold transition-all',
                item.type === t
                  ? t === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-violet-500 text-white'
                  : 'text-gray-400 dark:text-white/30 hover:text-gray-600',
              )}
            >
              {t === 'EXPENSE' ? '💸 รายจ่าย' : '💰 รายรับ'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">฿</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={item.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            className={cn('pl-7 font-bold h-9 text-sm', !item.amount && 'border-amber-300 dark:border-amber-500/40')}
          />
        </div>

        {/* Description */}
        <Input
          placeholder="รายละเอียด *"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={cn('h-9 text-sm', !item.description.trim() && 'border-amber-300 dark:border-amber-500/40')}
        />

        {/* Category + Date row */}
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={item.categoryId}
            onValueChange={(v) => v && onChange({ categoryId: v })}
          >
            <SelectTrigger className={cn('h-9 text-xs', !item.categoryId && 'border-amber-300 dark:border-amber-500/40')}>
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              {filteredCats.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-1.5">
                    <CategoryIcon name={c.icon} className="w-3 h-3" style={{ color: c.color }} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'w-full justify-start text-left font-normal text-xs h-9 px-2',
              'dark:bg-white/[0.04] dark:border-white/10 dark:text-white/50'
            )}>
              <CalendarIcon className="w-3 h-3 mr-1 opacity-60" />
              {format(item.date, 'dd/MM/yy')}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={item.date}
                onSelect={(d) => d && onChange({ date: d })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
