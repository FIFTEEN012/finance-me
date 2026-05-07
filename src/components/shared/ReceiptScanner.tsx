'use client'

import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Camera, Upload, X, Loader2, ScanLine, CheckCircle2,
  ChevronDown, CalendarIcon, AlertCircle, Sparkles,
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
import { TransactionType } from '@/types'
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

const schema = z.object({
  type:        z.enum(['INCOME', 'EXPENSE']),
  amount:      z.number().positive('ระบุจำนวนเงิน'),
  description: z.string().min(1, 'ระบุรายละเอียด'),
  categoryId:  z.string().min(1, 'เลือกหมวดหมู่'),
  date:        z.date(),
})
type FormValues = z.infer<typeof schema>

/* ── Image → base64 ── */
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

/* ── Compress image if too large (>4 MB base64) ── */
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
  const color = pct >= 80 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
    : pct >= 50 ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400'
    : 'text-red-500 bg-red-50 dark:bg-red-500/10'
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', color)}>
      ความมั่นใจ {pct}%
    </span>
  )
}

/* ── Main component ── */
export function ReceiptScanner() {
  const { scanOpen, setScanOpen }  = useQuickAddStore()
  const { addTransaction }         = useTransactionStore()
  const { categories }             = useCategoryStore()

  const [step, setStep]           = useState<'upload' | 'scanning' | 'confirm'>('upload')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [parsed, setParsed]       = useState<ParsedReceipt | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const cameraRef     = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'EXPENSE', date: new Date(), description: '', categoryId: '' },
  })

  const type       = watch('type')
  const date       = watch('date')
  const categoryId = watch('categoryId')
  const amount     = watch('amount')

  const filteredCats = categories.filter((c) => c.type === type)

  const handleClose = () => {
    setScanOpen(false)
    setStep('upload')
    setImagePreview(null)
    setParsed(null)
    setError(null)
    reset()
  }

  const processImage = useCallback(async (file: File) => {
    setError(null)
    setStep('scanning')

    // Show preview
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)

    try {
      const compressed = await compressImage(file)
      const { data, mimeType } = await fileToBase64(compressed)

      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: data, mimeType }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.error ?? `HTTP ${res.status}`
        // Attach HTTP status so UI can show contextual help
        const e = new Error(msg) as Error & { httpStatus: number }
        e.httpStatus = res.status
        throw e
      }

      const receipt: ParsedReceipt = await res.json()
      setParsed(receipt)

      // Pre-fill form
      if (receipt.type !== 'UNKNOWN') setValue('type', receipt.type)
      if (receipt.amount)      setValue('amount', receipt.amount)
      if (receipt.description) setValue('description', receipt.description)
      else if (receipt.merchant) setValue('description', receipt.merchant)
      if (receipt.date) {
        const d = new Date(receipt.date)
        if (!isNaN(d.getTime())) setValue('date', d)
      }

      setStep('confirm')
    } catch (err) {
      const e = err as Error & { httpStatus?: number }
      setError(e.message ?? 'เกิดข้อผิดพลาด')
      setStep('upload')
      URL.revokeObjectURL(previewUrl)
      setImagePreview(null)
    }
  }, [setValue])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) await processImage(file)
  }

  const onSubmit = (data: FormValues) => {
    addTransaction({
      type:        data.type as TransactionType,
      categoryId:  data.categoryId,
      amount:      data.amount,
      description: data.description,
      date:        data.date.toISOString(),
      note:        parsed?.merchant ? `สแกนจากสลิป: ${parsed.merchant}` : 'สแกนจากสลิป',
    })
    toast.success(`${data.type === 'INCOME' ? '💰' : '💸'} บันทึกแล้ว — ${data.description}`)
    handleClose()
  }

  return (
    <Dialog open={scanOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08]">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-violet-50 to-teal-50/50 dark:from-violet-500/10 dark:to-teal-500/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-white/80">
              <ScanLine className="w-4 h-4 text-primary" />
              สแกนสลิป / ใบเสร็จ
              {parsed && <ConfBadge confidence={parsed.confidence} />}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* ── Step: upload ── */}
        {step === 'upload' && (
          <div className="px-5 pb-5 pt-3 space-y-3">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p>{error}</p>
                  {error.includes('เครดิต') && (
                    <a
                      href="https://console.anthropic.com/settings/billing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block underline font-medium hover:text-red-700 dark:hover:text-red-300"
                    >
                      ไปเติมเครดิต →
                    </a>
                  )}
                </div>
              </div>
            )}

            <input ref={fileInputRef}  type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <input ref={cameraRef}     type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />

            {/* Camera button */}
            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/5 text-violet-700 dark:text-violet-400 hover:border-violet-400 dark:hover:border-violet-400/40 hover:bg-violet-50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Camera className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">ถ่ายรูปสลิป</p>
                <p className="text-xs text-violet-500/70 dark:text-violet-400/60 mt-0.5">ใช้กล้องถ่ายสลิปหรือใบเสร็จ</p>
              </div>
            </button>

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] text-gray-600 dark:text-white/50 hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Upload className="w-5 h-5 text-gray-500 dark:text-white/40" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">เลือกจากคลังรูป</p>
                <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">รองรับ JPG, PNG, WEBP</p>
              </div>
            </button>

            <p className="text-center text-[10px] text-gray-400 dark:text-white/25">
              ข้อมูลจากรูปจะถูกประมวลผลโดย AI และไม่ถูกเก็บไว้
            </p>
          </div>
        )}

        {/* ── Step: scanning ── */}
        {step === 'scanning' && (
          <div className="px-5 pb-8 pt-4 flex flex-col items-center gap-4">
            {imagePreview && (
              <div className="w-full max-h-48 rounded-xl overflow-hidden border border-gray-100 dark:border-white/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="receipt preview" className="w-full h-full object-contain bg-gray-50 dark:bg-white/[0.02]" />
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <p className="text-sm font-medium text-gray-700 dark:text-white/70">กำลังอ่านสลิป...</p>
              <p className="text-xs text-gray-400 dark:text-white/30">AI กำลังวิเคราะห์รูป</p>
            </div>
          </div>
        )}

        {/* ── Step: confirm ── */}
        {step === 'confirm' && (
          <form onSubmit={handleSubmit(onSubmit)} className="px-5 pb-5 pt-2 space-y-3">
            {/* Image + AI badge */}
            {imagePreview && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-100 dark:border-white/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="receipt" className="w-full h-full object-contain bg-gray-50 dark:bg-white/[0.02]" />
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium">
                  <Sparkles className="w-3 h-3" />
                  AI อ่านแล้ว
                </div>
                <button
                  type="button"
                  onClick={() => { setStep('upload'); setImagePreview(null); setParsed(null); reset() }}
                  className="absolute top-2 left-2 p-1 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
                  title="สแกนใหม่"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Income/Expense toggle */}
            <div className="flex rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white/60 dark:bg-white/[0.03]">
              {(['EXPENSE', 'INCOME'] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setValue('type', t); setValue('categoryId', '') }}
                  className={cn(
                    'flex-1 py-2 text-sm font-semibold transition-all',
                    type === t
                      ? t === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-violet-500 text-white'
                      : 'text-gray-500 dark:text-white/30 hover:text-gray-700'
                  )}>
                  {t === 'EXPENSE' ? '💸 รายจ่าย' : '💰 รายรับ'}
                </button>
              ))}
            </div>

            {/* Amount */}
            <div>
              <Label className="text-xs text-gray-500 dark:text-white/40 mb-1 block">จำนวนเงิน (บาท)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">฿</span>
                <Input
                  {...register('amount', { valueAsNumber: true })}
                  type="number" step="0.01" min="0"
                  placeholder="0.00"
                  className={cn('pl-7 text-lg font-bold', errors.amount && 'border-red-400')}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-gray-500 dark:text-white/40 mb-1 block">รายละเอียด</Label>
              <Input
                {...register('description')}
                placeholder="เช่น ค่าอาหาร, ซื้อของ"
                className={errors.description ? 'border-red-400' : ''}
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs text-gray-500 dark:text-white/40 mb-1 block">หมวดหมู่</Label>
              <Select value={categoryId} onValueChange={(v) => setValue('categoryId', v ?? '')}>
                <SelectTrigger className={errors.categoryId ? 'border-red-400' : ''}>
                  <SelectValue placeholder="เลือกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-1.5">
                        <CategoryIcon name={c.icon} className="w-3.5 h-3.5" style={{ color: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
            </div>

            {/* Date */}
            <div>
              <Label className="text-xs text-gray-500 dark:text-white/40 mb-1 block">วันที่</Label>
              <Popover>
                <PopoverTrigger className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'w-full justify-start text-left font-normal text-xs h-9',
                  'dark:bg-white/[0.04] dark:border-white/10 dark:text-white/50'
                )}>
                  <CalendarIcon className="w-3.5 h-3.5 mr-2 opacity-60" />
                  {format(date, 'dd MMM yyyy')}
                  <ChevronDown className="w-3 h-3 ml-auto opacity-40" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setValue('date', d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className={cn(
                'w-full font-semibold gap-2',
                type === 'EXPENSE'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              บันทึกรายการ {amount > 0 ? formatCurrency(amount) : ''}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
