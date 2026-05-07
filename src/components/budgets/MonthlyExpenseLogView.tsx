'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, History, Check, X, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { useMonthlyExpenseStore } from '@/store/useMonthlyExpenseStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { THAI_MONTHS, formatCurrency, cn } from '@/lib/utils'

interface Props {
  month: number
  year: number
}

/* ── tiny spark bar (6-month trend inline) ── */
function SparkBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-0.5 h-6">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm"
          style={{
            height: `${Math.max(2, (v / max) * 100)}%`,
            backgroundColor: i === data.length - 1 ? 'var(--color-primary, #7c3aed)' : '#e5e7eb',
          }}
        />
      ))}
    </div>
  )
}

/* ── History dialog ── */
interface HistoryDialogProps {
  categoryId: string
  open: boolean
  onOpenChange: (o: boolean) => void
}
function HistoryDialog({ categoryId, open, onOpenChange }: HistoryDialogProps) {
  const { getLogsByCategory, deleteLog } = useMonthlyExpenseStore()
  const categories = useCategoryStore((s) => s.categories)
  const cat = categories.find((c) => c.id === categoryId)
  const allLogs = getLogsByCategory(categoryId)

  // Build 12-month chart data (last 12 months)
  const now = new Date()
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const log = allLogs.find((l) => l.year === y && l.month === m)
    return { label: THAI_MONTHS[m - 1].slice(0, 3), amount: log?.amount ?? 0, y, m }
  })

  const total = allLogs.reduce((s, l) => s + l.amount, 0)
  const avg   = allLogs.length > 0 ? total / allLogs.length : 0
  const maxAmt = Math.max(...allLogs.map((l) => l.amount), 1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cat && (
              <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
            )}
            ประวัติ {cat?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Summary stats */}
        {allLogs.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'สูงสุด', value: formatCurrency(maxAmt) },
              { label: 'เฉลี่ย/เดือน', value: formatCurrency(avg) },
              { label: 'รวมทั้งหมด', value: formatCurrency(total) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5">{label}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Bar chart */}
        {allLogs.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(150,150,150,0.8)' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                tick={{ fontSize: 9, fill: 'rgba(150,150,150,0.7)' }}
                axisLine={false} tickLine={false} width={36}
              />
              <Tooltip
                formatter={(val) => [formatCurrency(Number(val ?? 0)), cat?.name ?? '']}
                contentStyle={{ borderRadius: 8, fontSize: 11, border: '1px solid rgba(150,150,150,0.15)' }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.amount > 0 ? (cat?.color ?? '#7c3aed') : '#e5e7eb'}
                    fillOpacity={entry.amount > 0 ? 1 : 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-center text-gray-400 dark:text-white/30 py-6">ยังไม่มีข้อมูล</p>
        )}

        {/* Log table */}
        {allLogs.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...allLogs].reverse().map((log) => (
              <div key={log.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] group">
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-white/70">
                    {THAI_MONTHS[log.month - 1]} {log.year + 543}
                  </p>
                  {log.note && <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{log.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{formatCurrency(log.amount)}</p>
                  <button
                    onClick={() => { deleteLog(log.id); toast.success('ลบรายการแล้ว') }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ── Inline editable amount cell ── */
interface AmountCellProps {
  categoryId: string
  year: number
  month: number
}
function AmountCell({ categoryId, year, month }: AmountCellProps) {
  const { getLog, upsertLog } = useMonthlyExpenseStore()
  const log = getLog(categoryId, year, month)

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setValue(log?.amount ? String(log.amount) : '')
    setNote(log?.note ?? '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const commit = () => {
    const n = parseFloat(value)
    if (!isNaN(n) && n >= 0) {
      upsertLog({ categoryId, year, month, amount: n, note: note || undefined })
      toast.success('บันทึกแล้ว')
    }
    setEditing(false)
  }

  const cancel = () => setEditing(false)

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">฿</span>
            <Input
              ref={inputRef}
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
              className="pl-6 h-8 text-xs w-full"
              placeholder="0.00"
            />
          </div>
          <button onClick={commit} className="p-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={cancel} className="p-1.5 rounded-md bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
        <Input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
          className="h-7 text-[10px]"
          placeholder="หมายเหตุ (ไม่บังคับ)"
        />
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className={cn(
        'text-right w-full px-2 py-1.5 rounded-lg transition-colors text-sm font-semibold',
        log?.amount
          ? 'text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]'
          : 'text-gray-300 dark:text-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-500 dark:hover:text-white/40',
      )}
      title="คลิกเพื่อแก้ไข"
    >
      {log?.amount ? formatCurrency(log.amount) : '— กรอกยอด'}
    </button>
  )
}

/* ── Main view ── */
export function MonthlyExpenseLogView({ month, year }: Props) {
  const { trackedCategoryIds, trackCategory, untrackCategory, getLogsByCategory, getLog } = useMonthlyExpenseStore()
  const categories = useCategoryStore((s) => s.categories)
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  const [addingCategory, setAddingCategory] = useState(false)
  const [newCatId, setNewCatId] = useState('')
  const [historyFor, setHistoryFor] = useState<string | null>(null)

  const trackedCats = trackedCategoryIds
    .map((id) => expenseCategories.find((c) => c.id === id))
    .filter(Boolean) as typeof expenseCategories

  const untrackedCats = expenseCategories.filter(
    (c) => !trackedCategoryIds.includes(c.id)
  )

  const handleAddCategory = () => {
    if (!newCatId) return
    trackCategory(newCatId)
    setNewCatId('')
    setAddingCategory(false)
    toast.success('เพิ่มหมวดหมู่ติดตามแล้ว')
  }

  // Build 6-month lookback for spark bars
  const getSpark = (categoryId: string): number[] => {
    const logs = getLogsByCategory(categoryId)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - 5 + i)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      return logs.find((l) => l.year === y && l.month === m)?.amount ?? 0
    })
  }

  // Month total
  const monthTotal = trackedCategoryIds.reduce((s, id) => {
    const log = getLog(id, year, month)
    return s + (log?.amount ?? 0)
  }, 0)

  if (trackedCats.length === 0 && !addingCategory) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
          <History className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-white/70">ยังไม่มีหมวดหมู่ที่ติดตาม</p>
          <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
            เพิ่มหมวดหมู่ที่ต้องการบันทึกยอดรายเดือน เช่น ช็อปปิ้ง ท่องเที่ยว
          </p>
        </div>
        <Button
          onClick={() => setAddingCategory(true)}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          เพิ่มหมวดหมู่แรก
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Month total summary */}
      {trackedCats.length > 0 && monthTotal > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
          <p className="text-xs font-medium text-violet-700 dark:text-violet-400">
            รวมรายจ่าย {THAI_MONTHS[month - 1]} {year + 543}
          </p>
          <p className="text-sm font-bold text-violet-700 dark:text-violet-400">{formatCurrency(monthTotal)}</p>
        </div>
      )}

      {/* Category rows */}
      {trackedCats.map((cat) => {
        const spark = getSpark(cat.id)
        const hasAnyData = spark.some((v) => v > 0)
        return (
          <div
            key={cat.id}
            className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 mt-0.5"
                style={{ backgroundColor: cat.color + '18' }}
              >
                <CategoryIcon name={cat.icon} className="w-4 h-4" style={{ color: cat.color }} />
              </div>

              {/* Name + amount */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{cat.name}</p>
                  <div className="flex-shrink-0 w-36">
                    <AmountCell categoryId={cat.id} year={year} month={month} />
                  </div>
                </div>

                {/* Spark + actions */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    {hasAnyData && <SparkBars data={spark} />}
                    {hasAnyData && (
                      <button
                        onClick={() => setHistoryFor(cat.id)}
                        className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-white/30 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                      >
                        ดูประวัติ <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      untrackCategory(cat.id)
                      toast.success(`ลบ "${cat.name}" ออกจากรายการติดตามแล้ว`)
                    }}
                    className="p-1 rounded-md text-gray-300 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="ลบออกจากรายการ"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Add category */}
      {addingCategory ? (
        <div className="flex items-center gap-2 p-3 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-500/20 bg-violet-50/50 dark:bg-violet-500/5">
          <Select value={newCatId} onValueChange={(v) => setNewCatId(v ?? '')}>
            <SelectTrigger className="flex-1 h-9 text-xs">
              <SelectValue placeholder="เลือกหมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              {untrackedCats.length === 0 ? (
                <SelectItem value="__none__" disabled>ติดตามครบทุกหมวดแล้ว</SelectItem>
              ) : (
                untrackedCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-1.5">
                      <CategoryIcon name={c.icon} className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.color }} />
                      <span>{c.name}</span>
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAddCategory} disabled={!newCatId || newCatId === '__none__'} className="bg-primary hover:bg-primary/90 h-9 px-3">
            เพิ่ม
          </Button>
          <button
            onClick={() => { setAddingCategory(false); setNewCatId('') }}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingCategory(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.06] text-xs font-medium text-gray-400 dark:text-white/30 hover:border-violet-300 dark:hover:border-violet-500/30 hover:text-violet-500 dark:hover:text-violet-400 transition-all"
        >
          <Plus className="w-4 h-4" />
          เพิ่มหมวดหมู่ที่ต้องการติดตาม
        </button>
      )}

      {/* History dialog */}
      {historyFor && (
        <HistoryDialog
          categoryId={historyFor}
          open={!!historyFor}
          onOpenChange={(o) => { if (!o) setHistoryFor(null) }}
        />
      )}
    </div>
  )
}
