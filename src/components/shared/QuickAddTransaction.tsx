'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CalendarIcon, Check, ChevronDown, Loader2, MessageCircle, Plus, Send, Sparkles, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { TagInput } from '@/components/shared/TagInput'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useQuickAddStore } from '@/store/useQuickAddStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { bulkTransactionSchema } from '@/lib/bulkTransactionSchema'
import { quickAddAiResultSchema } from '@/lib/quickAddAiSchema'
import { cn, formatCurrency } from '@/lib/utils'
import type { Transaction, TransactionType } from '@/types'
import { hapticSuccess } from '@/lib/native'

type Entry = {
  key: string
  type: TransactionType
  categoryId: string
  amount: string
  description: string
  date: string
  note: string
  tags: string[]
  tagSuggestions: string[]
  detailsOpen: boolean
  editOpen: boolean
}

type Field = 'type' | 'categoryId' | 'amount' | 'description' | 'date' | 'note' | 'tags'
type RowErrors = Record<string, Partial<Record<Field, string>>>

function localDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function toDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function newEntry(key = crypto.randomUUID()): Entry {
  return {
    key,
    type: 'EXPENSE',
    categoryId: '',
    amount: '',
    description: '',
    date: localDate(),
    note: '',
    tags: [],
    tagSuggestions: [],
    detailsOpen: false,
    editOpen: false,
  }
}

const initialRows = (): Entry[] => []

function CategoryChips({ type, selected, onSelect }: {
  type: TransactionType
  selected: string
  onSelect: (id: string) => void
}) {
  const categories = useCategoryStore((state) => state.categories)
  const filtered = categories.filter((category) => category.type === type)

  return (
    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
      {filtered.map((category) => (
        <button
          key={category.id}
          type="button"
          aria-pressed={selected === category.id}
          onClick={() => onSelect(category.id)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all',
            selected === category.id
              ? 'text-white border-transparent scale-105'
              : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:border-gray-300 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white/80 bg-white/50 dark:bg-white/[0.03]'
          )}
          style={selected === category.id ? { backgroundColor: category.color, borderColor: category.color } : {}}
        >
          <CategoryIcon name={category.icon} className="w-3.5 h-3.5" />
          <span>{category.name}</span>
        </button>
      ))}
      {filtered.length === 0 && <p className="text-xs text-gray-400">ยังไม่มีหมวดหมู่สำหรับประเภทนี้</p>}
    </div>
  )
}

const typeOptions: { type: TransactionType; label: string }[] = [
  { type: 'EXPENSE', label: 'รายจ่าย' },
  { type: 'INCOME', label: 'รายรับ' },
  { type: 'TRANSFER', label: 'โอนย้าย' },
]

export function QuickAddTransaction() {
  const { open, setOpen } = useQuickAddStore()
  const [rows, setRows] = useState<Entry[]>(initialRows)
  const [prompts, setPrompts] = useState<string[]>([])
  const [errors, setErrors] = useState<RowErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiError, setAiError] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const suggestAbortRef = useRef<AbortController | null>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const categories = useCategoryStore((state) => state.categories)
  const getAllTags = useTransactionStore((state) => state.getAllTags)
  const allTags = getAllTags()

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => composerRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [open])

  const updateRow = (key: string, patch: Partial<Entry>) => {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row))
    setErrors((current) => {
      const rowErrors = { ...current[key] }
      for (const field of Object.keys(patch) as Field[]) delete rowErrors[field]
      if (patch.type) delete rowErrors.categoryId
      return { ...current, [key]: rowErrors }
    })
    setFormError('')
  }

  const close = () => {
    suggestAbortRef.current?.abort()
    suggestAbortRef.current = null
    setRows(initialRows())
    setPrompts([])
    setErrors({})
    setFormError('')
    setAiInput('')
    setAiError('')
    setSuggesting(false)
    setOpen(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting) return
    if (nextOpen) setOpen(true)
    else close()
  }

  const totals = rows.reduce((sum, row) => {
    const amount = Number(row.amount)
    if (Number.isFinite(amount) && amount > 0) sum[row.type] += amount
    return sum
  }, { INCOME: 0, EXPENSE: 0, TRANSFER: 0 })

  const handleSuggest = async () => {
    const text = aiInput.trim()
    if (!text || suggesting || submitting) return
    const maxEntries = Math.min(10, 50 - rows.length)
    if (maxEntries < 1) {
      setAiError('เพิ่มได้สูงสุด 50 รายการ')
      return
    }

    const controller = new AbortController()
    suggestAbortRef.current = controller
    setSuggesting(true)
    setAiError('')
    try {
      const response = await fetch('/api/transactions/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          today: localDate(),
          maxEntries,
          categories: categories.map(({ id, name, type }) => ({ id, name, type })),
          existingTags: allTags.filter((tag) => tag.trim().length > 0 && tag.length <= 40).slice(0, 150),
        }),
        signal: controller.signal,
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Gemini อ่านรายการไม่สำเร็จ')
      const parsed = quickAddAiResultSchema.safeParse(result)
      if (!parsed.success || parsed.data.transactions.length === 0) {
        throw new Error('ไม่พบรายการที่มีจำนวนเงินในข้อความ ลองระบุจำนวนเงินให้ชัดเจน')
      }

      const suggested = parsed.data.transactions.slice(0, maxEntries).map((item) => ({
        ...newEntry(),
        type: item.type,
        categoryId: categories.some((category) => category.id === item.categoryId && category.type === item.type) ? item.categoryId : '',
        amount: String(item.amount),
        description: item.description,
        date: item.date,
        tagSuggestions: item.suggestedTags,
      }))
      setRows((current) => [...current, ...suggested].slice(0, 50))
      setPrompts((current) => [...current, text])
      setAiInput('')
      window.setTimeout(() => conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: 'smooth' }), 50)
      composerRef.current?.focus()
      toast.success(`Gemini เสนอ ${suggested.length} รายการ กรุณาตรวจสอบก่อนบันทึก`)
    } catch (error) {
      if (!controller.signal.aborted) setAiError(error instanceof Error ? error.message : 'Gemini อ่านรายการไม่สำเร็จ')
    } finally {
      if (!controller.signal.aborted) setSuggesting(false)
      suggestAbortRef.current = null
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const candidate = {
      transactions: rows.map(({ type, categoryId, amount, description, date, note, tags }) => ({
        type,
        categoryId,
        amount: amount.trim() ? Number(amount) : 0,
        description,
        date,
        note,
        tags,
      })),
    }
    const parsed = bulkTransactionSchema.safeParse(candidate)
    if (!parsed.success) {
      const nextErrors: RowErrors = {}
      let nextFormError = ''
      for (const issue of parsed.error.issues) {
        const index = issue.path[0] === 'transactions' ? issue.path[1] : undefined
        const field = issue.path[2] as Field | undefined
        if (typeof index === 'number' && field) {
          const key = rows[index].key
          nextErrors[key] ??= {}
          nextErrors[key][field] ??= issue.message
        } else {
          nextFormError = issue.message
        }
      }
      setErrors(nextErrors)
      setFormError(nextFormError)
      if (Object.keys(nextErrors).length > 0) {
        setRows((current) => current.map((row) => nextErrors[row.key] ? { ...row, editOpen: true } : row))
      }
      return
    }

    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      const response = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'บันทึกรายการไม่สำเร็จ')
      if (!Array.isArray(result.transactions) || result.transactions.length !== parsed.data.transactions.length || result.transactions.some((item: { id?: string }) => !item?.id)) {
        throw new Error('ข้อมูลตอบกลับไม่ครบ กรุณาโหลดหน้าธุรกรรมใหม่ก่อนลองอีกครั้ง')
      }

      const created: Transaction[] = parsed.data.transactions.map((item, index) => ({
        ...item,
        id: result.transactions[index].id,
        createdAt: result.transactions[index].createdAt || new Date().toISOString(),
      }))
      const store = useTransactionStore.getState()
      store.replaceTransactions([...created, ...store.transactions])
      toast.success(`บันทึกแล้ว ${created.length} รายการ`)
      hapticSuccess()
      close()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setSubmitting(false)
    }
  }

    return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="เพิ่มรายการด่วน (N)"
        aria-label="เพิ่มรายการด่วน"
        className="hidden lg:flex fixed bottom-6 right-6 z-50 size-14 items-center justify-center rounded-full border-2 border-[var(--quest-primary)] bg-[var(--quest-primary-container)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <MessageCircle className="size-6" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-auto bottom-0 left-0 z-50 h-[min(88dvh,760px)] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex flex-col gap-0 overflow-hidden rounded-b-none rounded-t-2xl border-0 p-0 shadow-2xl sm:bottom-5 sm:left-auto sm:right-5 sm:h-[min(740px,calc(100dvh-2.5rem))] sm:w-[440px] sm:max-w-[440px] sm:rounded-2xl dark:bg-[#0b1020] dark:border dark:border-white/10"
        >
          <DialogHeader className="shrink-0 flex-row items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Sparkles className="size-4.5" /></span>
              <div>
                <DialogTitle className="text-sm font-semibold">เพิ่มรายการด่วน</DialogTitle>
                <p className="text-[11px] text-gray-500 dark:text-white/45">พิมพ์ให้ Gemini ช่วยเตรียมรายการ</p>
              </div>
            </div>
            <button type="button" onClick={close} disabled={submitting} aria-label="ปิดหน้าต่าง" className="flex size-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-violet-500 dark:hover:bg-white/10">
              <X className="size-4.5" />
            </button>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div ref={conversationRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-4 py-4 dark:bg-white/[0.02]" aria-live="polite">
              {prompts.length === 0 && rows.length === 0 && (
                <div className="space-y-3">
                  <div className="max-w-[90%] rounded-2xl rounded-tl-md border border-violet-100 bg-white p-3.5 shadow-sm dark:border-violet-500/15 dark:bg-white/[0.05]">
                    <p className="text-sm font-medium">วันนี้มีรายการอะไรบ้าง?</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-white/50">พิมพ์ได้ตามปกติ เช่น “กาแฟ 85 บาทเมื่อวาน” หรือหลายรายการแยกบรรทัด แล้วตรวจสอบก่อนบันทึก</p>
                  </div>
                  <p className="px-1 text-[11px] text-gray-500 dark:text-white/40">ชื่อหมวดหมู่และแท็กเดิมจะถูกส่งไปยัง Google เพื่อตีความ</p>
                </div>
              )}
              {prompts.map((prompt, index) => (
                <div key={index} className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-violet-600 px-3.5 py-2.5 text-sm text-white shadow-sm">{prompt}</div>
              ))}
              {rows.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 px-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300"><Sparkles className="size-3.5" /> ตรวจสอบรายการก่อนบันทึก</p>
                  {rows.map((row, index) => {
                    const rowErrors = errors[row.key] || {}
                    const category = categories.find((item) => item.id === row.categoryId)
                    const hasErrors = Object.keys(rowErrors).length > 0
                    return (
                      <section key={row.key} aria-label={'รายการที่ ' + (index + 1)} className={cn('rounded-2xl border bg-white shadow-sm dark:bg-white/[0.05]', hasErrors ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-white/10')}>
                        <div className="flex items-start gap-2 p-3">
                          <div className={cn('mt-0.5 size-2 shrink-0 rounded-full', row.type === 'EXPENSE' ? 'bg-red-500' : row.type === 'INCOME' ? 'bg-emerald-500' : 'bg-sky-500')} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{row.description || 'รายการใหม่'}</p>
                                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-white/45">{typeOptions.find((option) => option.type === row.type)?.label} · {category?.name || 'ยังไม่เลือกหมวดหมู่'} · {row.date}</p>
                              </div>
                              <span className={cn('shrink-0 text-sm font-bold tabular-nums', row.type === 'EXPENSE' ? 'text-red-600 dark:text-red-400' : row.type === 'INCOME' ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400')}>{row.amount ? formatCurrency(Number(row.amount)) : '฿0.00'}</span>
                            </div>
                            {hasErrors && <p role="alert" className="mt-1.5 text-xs text-red-600">{Object.values(rowErrors)[0]}</p>}
                            <div className="mt-2 flex items-center gap-3">
                              <button type="button" onClick={() => updateRow(row.key, { editOpen: !row.editOpen })} className="text-xs font-semibold text-violet-700 hover:underline focus-visible:outline-2 dark:text-violet-300">{row.editOpen ? 'ย่อรายละเอียด' : 'แก้ไข'}</button>
                              <button type="button" disabled={submitting} aria-label={'ลบรายการที่ ' + (index + 1)} onClick={() => { setRows((current) => current.filter((item) => item.key !== row.key)); setErrors((current) => { const next = { ...current }; delete next[row.key]; return next }); setFormError('') }} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 focus-visible:outline-2 dark:text-white/45"><Trash2 className="size-3" /> ลบ</button>
                            </div>
                          </div>
                        </div>
                        {row.tagSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1 border-t border-gray-100 px-3 py-2 dark:border-white/10">
                            <span className="mr-1 self-center text-[11px] text-gray-500 dark:text-white/45">แท็กแนะนำ</span>
                            {row.tagSuggestions.map((tag) => {
                              const selected = row.tags.includes(tag)
                              return <button key={tag} type="button" aria-pressed={selected} aria-label={(selected ? 'ยกเลิก' : 'เลือก') + 'แท็ก ' + tag + ' รายการที่ ' + (index + 1)} onClick={() => updateRow(row.key, { tags: selected ? row.tags.filter((item) => item !== tag) : [...row.tags, tag] })} className={cn('rounded-full border px-2 py-1 text-[11px] transition-colors focus-visible:outline-2', selected ? 'border-violet-400 bg-violet-100 text-violet-800 dark:bg-violet-500/25 dark:text-violet-200' : 'border-gray-200 text-gray-600 hover:border-violet-300 dark:border-white/15 dark:text-white/60')}>{selected && <Check className="mr-1 inline size-3" />}{tag}{allTags.includes(tag) ? ' · เคยใช้' : ''}</button>
                            })}
                          </div>
                        )}
                        {row.editOpen && (
                          <div className="space-y-3 border-t border-gray-100 p-3 dark:border-white/10">
                            <div className="flex overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                              {typeOptions.map((option) => <button key={option.type} type="button" aria-pressed={row.type === option.type} onClick={() => updateRow(row.key, { type: option.type, categoryId: '' })} className={cn('min-h-10 flex-1 text-xs font-semibold', row.type === option.type ? 'bg-violet-600 text-white' : 'hover:bg-gray-50 dark:hover:bg-white/10')}>{option.label}</button>)}
                            </div>
                            <div className="grid grid-cols-[110px_1fr] gap-2">
                              <div>
                                <label htmlFor={'amount-' + row.key} className="mb-1 block text-[11px] text-gray-500">จำนวนเงิน</label>
                                <Input id={'amount-' + row.key} type="number" inputMode="decimal" min="0" step="0.01" value={row.amount} onChange={(event) => updateRow(row.key, { amount: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }} aria-invalid={!!rowErrors.amount} placeholder="0.00" />
                              </div>
                              <div>
                                <label htmlFor={'description-' + row.key} className="mb-1 block text-[11px] text-gray-500">รายละเอียด</label>
                                <Input id={'description-' + row.key} value={row.description} onChange={(event) => updateRow(row.key, { description: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault() }} aria-invalid={!!rowErrors.description} placeholder="เช่น ค่าข้าว" />
                              </div>
                            </div>
                            <div>
                              <p className="mb-1.5 text-[11px] text-gray-500">หมวดหมู่</p>
                              <CategoryChips type={row.type} selected={row.categoryId} onSelect={(categoryId) => updateRow(row.key, { categoryId })} />
                              {rowErrors.categoryId && <p className="mt-1 text-xs text-red-600">{rowErrors.categoryId}</p>}
                            </div>
                            <div>
                              <p className="mb-1 text-[11px] text-gray-500">วันที่</p>
                              <Popover>
                                <PopoverTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full justify-start text-left font-normal text-xs')}>
                                  <CalendarIcon className="mr-2 size-3.5" />{format(toDate(row.date), 'dd MMM yyyy')}<ChevronDown className="ml-auto size-3" />
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={toDate(row.date)} onSelect={(date) => { if (date) updateRow(row.key, { date: format(date, 'yyyy-MM-dd') }) }} initialFocus />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <button type="button" onClick={() => updateRow(row.key, { detailsOpen: !row.detailsOpen })} className="text-xs font-medium text-violet-700 hover:underline dark:text-violet-300">{row.detailsOpen ? 'ซ่อนหมายเหตุและแท็ก' : 'เพิ่มหมายเหตุและแท็ก'}</button>
                            {row.detailsOpen && <div className="space-y-2"><Input value={row.note} onChange={(event) => updateRow(row.key, { note: event.target.value })} aria-label={'หมายเหตุ รายการที่ ' + (index + 1)} placeholder="หมายเหตุ (ไม่บังคับ)" /><TagInput value={row.tags} onChange={(tags) => updateRow(row.key, { tags })} suggestions={allTags} /></div>}
                          </div>
                        )}
                      </section>
                    )
                  })}
                </div>
              )}
              {suggesting && <div role="status" className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-md bg-white px-3 py-2 text-xs text-gray-600 shadow-sm dark:bg-white/[0.08] dark:text-white/60"><Loader2 className="size-3.5 animate-spin" /> Gemini กำลังอ่านรายการ...</div>}
            </div>

            <div className="shrink-0 border-t border-gray-100 bg-white px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-[#0b1020]">
              {aiError && <p role="alert" className="mb-2 text-xs text-red-600">{aiError}</p>}
              <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 focus-within:border-violet-400 dark:border-white/15 dark:bg-white/[0.05]">
                <textarea
                  ref={composerRef}
                  id="quick-add-ai-input"
                  aria-label="พิมพ์รายการให้ Gemini"
                  value={aiInput}
                  onChange={(event) => { setAiInput(event.target.value); setAiError('') }}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void handleSuggest() } }}
                  maxLength={1000}
                  rows={2}
                  placeholder="พิมพ์รายการ เช่น กาแฟ 85 บาท..."
                  className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-gray-400"
                />
                <Button type="button" size="icon" aria-label="ส่งข้อความให้ Gemini" disabled={!aiInput.trim() || suggesting || submitting || rows.length >= 50} onClick={handleSuggest} className="size-10 shrink-0 rounded-xl bg-violet-600 text-white hover:bg-violet-700">
                  {suggesting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button type="button" disabled={submitting || rows.length >= 50} onClick={() => { setRows((current) => [...current, { ...newEntry(), editOpen: true }]); window.setTimeout(() => conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: 'smooth' }), 50) }} className="flex min-h-9 items-center gap-1 text-xs font-semibold text-violet-700 hover:underline disabled:opacity-40 dark:text-violet-300"><Plus className="size-3.5" /> กรอกเอง</button>
                <span className="text-[11px] text-gray-500 dark:text-white/45">Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่</span>
              </div>
              {rows.length > 0 && (
                <div className="mt-2 border-t border-gray-100 pt-2 dark:border-white/10">
                  <div className="mb-2 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] font-medium">
                    <span>{rows.length} รายการ</span>
                    <span className="text-emerald-700 dark:text-emerald-400">รับ {formatCurrency(totals.INCOME)}</span>
                    <span className="text-red-600 dark:text-red-400">จ่าย {formatCurrency(totals.EXPENSE)}</span>
                    <span className="text-sky-700 dark:text-sky-400">โอน {formatCurrency(totals.TRANSFER)}</span>
                  </div>
                  {formError && <p role="alert" className="mb-2 text-xs text-red-600">{formError}</p>}
                  <Button type="submit" disabled={submitting || suggesting} className="w-full bg-[var(--quest-primary-container)] font-semibold text-white hover:opacity-90">
                    {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {submitting ? 'กำลังบันทึก...' : 'บันทึก ' + rows.length + ' รายการ'}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
