'use client'

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ClipboardEvent } from 'react'
import { Check, ImagePlus, Loader2, RefreshCw, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ASSET_CLASS_META } from '@/components/investments/InvestmentForm'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import {
  imageHoldingsResultSchema,
  investmentAssetClasses,
  investmentCurrencies,
  prepareInvestmentImport,
  sameHoldingCandidates,
  type InvestmentImportRow,
} from '@/lib/investmentImageImport'
import type { InvestmentHolding } from '@/types'

const MAX_ORIGINAL_BYTES = 8 * 1024 * 1024
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

async function imageForUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file
  const image = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    const maxSide = Math.max(image.width, image.height)
    const initialScale = maxSide > 3200 ? 3200 / maxSide : 1
    let scale = initialScale
    for (const quality of [0.9, 0.8, 0.7, 0.65, 0.6]) {
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('ไม่สามารถเตรียมภาพนี้ได้')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return new File([blob], 'portfolio-screenshot.jpg', { type: 'image/jpeg' })
      scale *= 0.85
    }
    throw new Error('ภาพยังมีขนาดใหญ่เกินไป กรุณาครอปภาพให้เห็นเฉพาะรายการสินทรัพย์')
  } finally {
    image.close()
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  holdings: InvestmentHolding[]
}

export function InvestmentImageImportDialog({ open, onOpenChange, holdings }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rows, setRows] = useState<InvestmentImportRow[]>([])
  const [rowErrors, setRowErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const importHoldings = useInvestmentStore((state) => state.importHoldings)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const reset = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setFile(null)
    setRows([])
    setRowErrors({})
    setError('')
    setReading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    if (saving) return
    if (!next) reset()
    onOpenChange(next)
  }

  const acceptFile = (next: File | null | undefined) => {
    if (!next) return
    if (!ACCEPTED_IMAGE_TYPES.includes(next.type)) {
      setError('รองรับเฉพาะภาพ PNG, JPEG และ WebP')
      return
    }
    if (next.size === 0 || next.size > MAX_ORIGINAL_BYTES) {
      setError('ภาพต้นฉบับต้องมีขนาดไม่เกิน 8 MB')
      return
    }
    abortRef.current?.abort()
    abortRef.current = null
    setReading(false)
    setFile(next)
    setRows([])
    setRowErrors({})
    setError('')
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => acceptFile(event.target.files?.[0])
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(event.clipboardData.files).find((item) => item.type.startsWith('image/'))
    if (image) {
      event.preventDefault()
      acceptFile(image)
    }
  }
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    acceptFile(event.dataTransfer.files[0])
  }

  const updateRow = (key: string, patch: Partial<InvestmentImportRow>) => {
    setRows((current) => current.map((row) => {
      if (row.key !== key) return row
      const next = { ...row, ...patch }
      if ('name' in patch || 'ticker' in patch || 'assetClass' in patch || 'currency' in patch) {
        const candidates = sameHoldingCandidates(next, holdings)
        next.targetHoldingId = candidates.length === 1 ? candidates[0].id : null
      }
      return next
    }))
    setRowErrors((current) => {
      const next = { ...current }
      delete next[key]
      delete next._form
      return next
    })
    setError('')
  }

  const readImage = async () => {
    if (!file || reading) return
    const controller = new AbortController()
    abortRef.current = controller
    setReading(true)
    setError('')
    setRowErrors({})
    try {
      const prepared = await imageForUpload(file)
      if (controller.signal.aborted) return
      const form = new FormData()
      form.append('image', prepared)
      const response = await fetch('/api/investments/parse-image', { method: 'POST', body: form, signal: controller.signal })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'อ่านภาพไม่สำเร็จ')
      const parsed = imageHoldingsResultSchema.safeParse(result)
      if (!parsed.success || parsed.data.holdings.length === 0) throw new Error('ไม่พบรายการสินทรัพย์ในภาพ')
      setRows(parsed.data.holdings.map((item) => {
        const normalizedItem = { ...item, currency: item.currency?.trim().toUpperCase() ?? null }
        const candidates = sameHoldingCandidates(normalizedItem, holdings)
        return {
          ...normalizedItem,
          key: crypto.randomUUID(),
          included: true,
          targetHoldingId: candidates.length === 1 ? candidates[0].id : null,
        }
      }))
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'อ่านภาพไม่สำเร็จ')
    } finally {
      if (!controller.signal.aborted) setReading(false)
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  const save = () => {
    if (saving || reading) return
    const prepared = prepareInvestmentImport(rows, holdings)
    setRowErrors(prepared.errors)
    if (Object.keys(prepared.errors).length) {
      setError('กรุณาตรวจและแก้รายการที่มีข้อความแจ้งก่อนบันทึก')
      return
    }
    setSaving(true)
    try {
      importHoldings(prepared.actions)
      const updated = prepared.actions.filter((action) => action.targetHoldingId).length
      toast.success(`นำเข้าแล้ว ${prepared.actions.length} รายการ${updated ? ` · อัปเดตเดิม ${updated}` : ''}`)
      reset()
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกพอร์ตไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const includedCount = rows.filter((row) => row.included).length
  const updateCount = rows.filter((row) => row.included && row.targetHoldingId).length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onPaste={handlePaste} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-2 border-[#becbb1] bg-[var(--quest-background)] p-0 text-[var(--quest-foreground)] shadow-xl sm:max-w-3xl dark:border-[#3b4630] dark:bg-[var(--quest-surface)]">
        <DialogHeader className="shrink-0 border-b border-[#becbb1] px-5 py-4 dark:border-[#3b4630]">
          <DialogTitle className="flex items-center gap-2 font-quest-heading text-lg font-black text-[#2b6c00] dark:text-[#87fe45]"><ImagePlus className="size-5" /> นำเข้าพอร์ตจากภาพ</DialogTitle>
          <p className="text-xs text-[var(--quest-muted)]">เลือกหรือวางภาพแคปหน้าพอร์ต แล้วตรวจข้อมูลก่อนบันทึก</p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="rounded-2xl border-2 border-dashed border-[#9cae8d] bg-[var(--quest-surface)] p-4 dark:border-[#526447]">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="sr-only" aria-label="เลือกภาพพอร์ตลงทุน" />
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
              {previewUrl ? <img src={previewUrl} alt="ตัวอย่างภาพพอร์ตที่จะอ่าน" className="max-h-32 max-w-32 rounded-lg object-contain" /> : <div className="flex size-14 items-center justify-center rounded-xl bg-[#e9f3df] text-[#2b6c00] dark:bg-[#20331d] dark:text-[#87fe45]"><Upload className="size-6" /></div>}
              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-bold">{file ? file.name : 'วางภาพที่นี่ หรือเลือกจากเครื่อง'}</p>
                <p className="mt-1 text-xs text-[var(--quest-muted)]">PNG, JPEG, WebP · ไม่เกิน 8 MB · วางจากคลิปบอร์ดได้</p>
              </div>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={reading || saving} className="min-h-11 shrink-0 border-[#6f7b64] font-bold">
                {file ? 'เปลี่ยนภาพ' : 'เลือกภาพ'}
              </Button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--quest-muted)]">ภาพจะถูกส่งไปยัง Google Gemini เพื่ออ่านรายการ และไม่ถูกเก็บในพอร์ต กรุณาครอปข้อมูลบัญชีที่ไม่ต้องการส่งก่อนเลือกภาพ</p>
          </div>

          {file && rows.length === 0 && (
            <Button type="button" onClick={readImage} disabled={reading} className="min-h-11 w-full gap-2 bg-[var(--quest-primary-container)] font-bold text-[var(--quest-on-primary-container)] hover:opacity-90">
              {reading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {reading ? 'Gemini กำลังอ่านภาพ...' : 'อ่านรายการในภาพ'}
            </Button>
          )}

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black">ตรวจรายการที่อ่านได้ {rows.length} รายการ</h3>
                  <p className="text-xs text-[var(--quest-muted)]">ช่องว่างคือข้อมูลที่ไม่พบในภาพ · ปิดรายการที่ไม่ต้องการบันทึกได้</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={readImage} disabled={reading || saving} className="gap-1.5"><RefreshCw className="size-3.5" /> อ่านอีกครั้ง</Button>
              </div>
              {rows.map((row, index) => {
                const candidates = sameHoldingCandidates(row, holdings)
                const issues = rowErrors[row.key] ?? []
                return (
                  <section key={row.key} aria-label={`รายการที่ ${index + 1}`} className={`rounded-2xl border-2 bg-[var(--quest-surface)] p-3 sm:p-4 ${issues.length ? 'border-red-300 dark:border-red-700' : 'border-[#becbb1] dark:border-[#3b4630]'} ${row.included ? '' : 'opacity-60'}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold">
                        <input type="checkbox" checked={row.included} onChange={(event) => updateRow(row.key, { included: event.target.checked })} className="size-4 accent-[#2b6c00]" />
                        รายการที่ {index + 1} {row.included ? '' : '· ข้าม'}
                      </label>
                      {row.included && <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.targetHoldingId ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'}`}>{row.targetHoldingId ? 'อัปเดตหุ้นเดิม' : 'เพิ่มใหม่'}</span>}
                    </div>
                    {row.included && (
                      <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="text-xs font-semibold">ชื่อสินทรัพย์
                            <Input value={row.name ?? ''} onChange={(event) => updateRow(row.key, { name: event.target.value || null })} placeholder="ชื่อที่เห็นในภาพ" className="mt-1" />
                          </label>
                          <label className="text-xs font-semibold">Ticker (ถ้ามี)
                            <Input value={row.ticker ?? ''} onChange={(event) => updateRow(row.key, { ticker: event.target.value || null })} placeholder="เช่น AAPL" className="mt-1" />
                          </label>
                          <label className="text-xs font-semibold">ประเภทสินทรัพย์
                            <select value={row.assetClass ?? ''} onChange={(event) => updateRow(row.key, { assetClass: (event.target.value || null) as InvestmentImportRow['assetClass'] })} className="mt-1 min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                              <option value="">เลือกประเภท</option>
                              {investmentAssetClasses.map((assetClass) => <option key={assetClass} value={assetClass}>{ASSET_CLASS_META[assetClass].label}</option>)}
                            </select>
                          </label>
                          <label className="text-xs font-semibold">สกุลเงิน
                            <select value={investmentCurrencies.includes(row.currency as typeof investmentCurrencies[number]) ? row.currency ?? '' : ''} onChange={(event) => updateRow(row.key, { currency: event.target.value || null })} className="mt-1 min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                              <option value="">{row.currency && !investmentCurrencies.includes(row.currency as typeof investmentCurrencies[number]) ? `ไม่รองรับ ${row.currency} · เลือกใหม่` : 'เลือกสกุลเงิน'}</option>
                              {investmentCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                            </select>
                          </label>
                          {([
                            ['units', 'จำนวนหน่วย / หุ้น', '0'],
                            ['avgCostPerUnit', 'ต้นทุนเฉลี่ยต่อหน่วย', '0.00'],
                            ['currentPricePerUnit', 'ราคาปัจจุบันต่อหน่วย', '0.00'],
                          ] as const).map(([field, label, placeholder]) => (
                            <label key={field} className="text-xs font-semibold">{label}
                              <Input type="number" min="0" step="any" inputMode="decimal" value={row[field] ?? ''} onChange={(event) => updateRow(row.key, { [field]: event.target.value === '' ? null : Number(event.target.value) })} placeholder={placeholder} className="mt-1" />
                            </label>
                          ))}
                          {candidates.length > 0 && (
                            <label className="text-xs font-semibold">สินทรัพย์เดิมที่จะอัปเดต
                              <select value={row.targetHoldingId ?? ''} onChange={(event) => updateRow(row.key, { targetHoldingId: event.target.value || null })} className="mt-1 min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option value="">เลือกสินทรัพย์เดิม</option>
                                {candidates.map((holding) => <option key={holding.id} value={holding.id}>{holding.name}{holding.ticker ? ` (${holding.ticker})` : ''}</option>)}
                              </select>
                            </label>
                          )}
                        </div>
                        {issues.length > 0 && <ul className="mt-3 list-disc pl-5 text-xs text-red-700 dark:text-red-300">{[...new Set(issues)].map((issue) => <li key={issue}>{issue}</li>)}</ul>}
                      </>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="shrink-0 border-t border-[#becbb1] bg-[var(--quest-surface)] px-4 py-3 dark:border-[#3b4630] sm:px-5">
            <div className="mb-2 flex gap-3 text-xs font-semibold text-[var(--quest-muted)]"><span>เลือก {includedCount} รายการ</span><span>เพิ่ม {includedCount - updateCount}</span><span>อัปเดต {updateCount}</span></div>
            <Button type="button" onClick={save} disabled={saving || reading || includedCount === 0} className="min-h-11 w-full gap-2 bg-[var(--quest-primary-container)] font-bold text-[var(--quest-on-primary-container)] hover:opacity-90">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {saving ? 'กำลังบันทึก...' : `ยืนยันบันทึก ${includedCount} รายการ`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
