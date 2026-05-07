'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Pause, Play, List, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { RecurringForm } from '@/components/recurring/RecurringForm'
import { RecurringCalendar } from '@/components/recurring/RecurringCalendar'
import { PressCard } from '@/components/ui/PressCard'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { RecurringTransaction } from '@/types'
import { formatCurrency, THAI_MONTHS } from '@/lib/utils'
import { cn } from '@/lib/utils'

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: 'ทุกเดือน',
  yearly: 'ทุกปี',
}

export default function RecurringPage() {
  const { recurrings, deleteRecurring, updateRecurring, setLastGeneratedDate } = useRecurringStore()
  const { addTransaction } = useTransactionStore()
  const { getCategoryById } = useCategoryStore()

  const [tab, setTab] = useState<'list' | 'calendar'>('list')
  const [formOpen, setFormOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null)

  const incomeList = recurrings.filter((r) => r.type === 'INCOME')
  const expenseList = recurrings.filter((r) => r.type === 'EXPENSE')

  function handleEdit(r: RecurringTransaction) {
    setEditingRecurring(r)
    setFormOpen(true)
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingRecurring(null)
  }

  function handleToggleActive(r: RecurringTransaction) {
    updateRecurring(r.id, { isActive: !r.isActive })
    toast.success(r.isActive ? `หยุดพัก "${r.description}" แล้ว` : `เปิดใช้งาน "${r.description}" แล้ว`)
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    deleteRecurring(deleteTarget.id)
    toast.success(`ลบ "${deleteTarget.description}" แล้ว`)
    setDeleteTarget(null)
  }

  const totalMonthlyIncome = incomeList
    .filter((r) => r.isActive && r.frequency === 'monthly')
    .reduce((sum, r) => sum + r.amount, 0)

  const totalMonthlyExpense = expenseList
    .filter((r) => r.isActive && r.frequency === 'monthly')
    .reduce((sum, r) => sum + r.amount, 0)

  function generateNow() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let totalCreated = 0

    for (const r of recurrings) {
      if (!r.isActive) continue

      const startDate = new Date(r.startDate)
      startDate.setHours(0, 0, 0, 0)

      let cursor: Date
      if (r.lastGeneratedDate) {
        const last = new Date(r.lastGeneratedDate)
        cursor = new Date(last.getFullYear(), last.getMonth() + 1, 1)
      } else {
        cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      }

      const generated: string[] = []

      while (cursor <= today) {
        const year = cursor.getFullYear()
        const month = cursor.getMonth()
        const maxDay = new Date(year, month + 1, 0).getDate()
        const day = Math.min(r.dayOfMonth, maxDay)
        const txDate = new Date(year, month, day)
        txDate.setHours(0, 0, 0, 0)

        if (txDate >= startDate && txDate <= today) {
          if (r.frequency === 'monthly') {
            addTransaction({
              categoryId: r.categoryId,
              type: r.type,
              amount: r.amount,
              description: r.description,
              note: r.note,
              date: txDate.toISOString().slice(0, 10),
            })
            generated.push(txDate.toISOString().slice(0, 10))
            totalCreated++
          } else if (r.frequency === 'yearly' && month === startDate.getMonth()) {
            addTransaction({
              categoryId: r.categoryId,
              type: r.type,
              amount: r.amount,
              description: r.description,
              note: r.note,
              date: txDate.toISOString().slice(0, 10),
            })
            generated.push(txDate.toISOString().slice(0, 10))
            totalCreated++
          }
        }

        cursor = new Date(year, month + 1, 1)
      }

      if (generated.length > 0) {
        setLastGeneratedDate(r.id, generated[generated.length - 1])
      }
    }

    if (totalCreated > 0) {
      toast.success(`สร้าง ${totalCreated} รายการสำเร็จ`)
    } else {
      toast.info('ไม่มีรายการที่ต้องสร้างเพิ่ม')
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">รายการประจำ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            รายรับ/รายจ่ายที่เกิดซ้ำอัตโนมัติ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={generateNow}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            สร้างรายการวันนี้
          </Button>
          <Button onClick={() => setFormOpen(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
            <Plus className="w-4 h-4" />
            เพิ่มรายการ
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.05] w-fit">
        {([
          { key: 'list',     label: 'รายการ',   icon: List        },
          { key: 'calendar', label: 'ปฏิทิน',   icon: CalendarDays },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === key
                ? 'bg-white dark:bg-white/10 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Calendar tab ── */}
      {tab === 'calendar' && (
        <RecurringCalendar />
      )}

      {/* ── List tab ── */}
      {tab === 'list' && (
        <>
          {/* Summary */}
          {recurrings.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <PressCard shadow="0 4px 0 0 #4c1d95" className="border-violet-400 bg-violet-500 p-4">
                <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">รายรับประจำ/เดือน</p>
                <p className="text-white font-black text-xl leading-none num">{formatCurrency(totalMonthlyIncome)}</p>
              </PressCard>
              <PressCard shadow="0 4px 0 0 #9f1239" className="border-rose-400 bg-rose-500 p-4">
                <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">รายจ่ายประจำ/เดือน</p>
                <p className="text-white font-black text-xl leading-none num">{formatCurrency(totalMonthlyExpense)}</p>
              </PressCard>
            </div>
          )}

          {/* Empty state */}
          {recurrings.length === 0 && (
            <EmptyState
              icon={RefreshCw}
              title="ยังไม่มีรายการประจำ"
              description="เพิ่มรายรับ/รายจ่ายที่เกิดซ้ำ เช่น เงินเดือน ค่าเช่า เพื่อให้ระบบสร้างรายการให้อัตโนมัติ"
              action={
                <Button onClick={() => setFormOpen(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
                  <Plus className="w-4 h-4" />
                  เพิ่มรายการประจำ
                </Button>
              }
            />
          )}

          {/* Income list */}
          {incomeList.length > 0 && (
            <RecurringSection
              title="รายรับประจำ"
              items={incomeList}
              getCategoryById={getCategoryById}
              onEdit={handleEdit}
              onToggle={handleToggleActive}
              onDelete={setDeleteTarget}
            />
          )}

          {/* Expense list */}
          {expenseList.length > 0 && (
            <RecurringSection
              title="รายจ่ายประจำ"
              items={expenseList}
              getCategoryById={getCategoryById}
              onEdit={handleEdit}
              onToggle={handleToggleActive}
              onDelete={setDeleteTarget}
            />
          )}
        </>
      )}

      <RecurringForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editingRecurring={editingRecurring}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบรายการประจำ"
        description={`ต้องการลบ "${deleteTarget?.description}" ใช่หรือไม่? รายการที่สร้างไปแล้วจะไม่ถูกลบ`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

interface RecurringSectionProps {
  title: string
  items: RecurringTransaction[]
  getCategoryById: (id: string) => { name: string; icon: string; color: string } | undefined
  onEdit: (r: RecurringTransaction) => void
  onToggle: (r: RecurringTransaction) => void
  onDelete: (r: RecurringTransaction) => void
}

function RecurringSection({ title, items, getCategoryById, onEdit, onToggle, onDelete }: RecurringSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>
      <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 overflow-hidden p-0">
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((r) => {
          const cat = getCategoryById(r.categoryId)
          const startDate = new Date(r.startDate)
          const startLabel = `${THAI_MONTHS[startDate.getMonth()]} ${startDate.getFullYear() + 543}`
          const lastDate = r.lastGeneratedDate
            ? new Date(r.lastGeneratedDate)
            : null

          return (
            <div
              key={r.id}
              className={`flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 transition-colors ${
                r.isActive ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : 'opacity-50'
              }`}
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                style={{ backgroundColor: (cat?.color ?? '#94a3b8') + '20' }}
              >
                <CategoryIcon
                  name={cat?.icon ?? 'Circle'}
                  className="w-4 h-4"
                  style={{ color: cat?.color ?? '#94a3b8' }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {r.description}
                  </span>
                  {!r.isActive && (
                    <Badge variant="secondary" className="text-xs py-0 shrink-0">หยุดพัก</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {cat?.name} · วันที่ {r.dayOfMonth} · {FREQUENCY_LABEL[r.frequency]} · เริ่ม {startLabel}
                  {lastDate && ` · ล่าสุด ${lastDate.toLocaleDateString('th-TH')}`}
                </p>
              </div>

              {/* Amount */}
              <span className={`text-sm font-semibold shrink-0 ${
                r.type === 'INCOME' ? 'text-violet-600 dark:text-violet-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {r.type === 'INCOME' ? '+' : '-'}{formatCurrency(r.amount)}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onToggle(r)}
                  className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={r.isActive ? 'หยุดพัก' : 'เปิดใช้งาน'}
                >
                  {r.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => onEdit(r)}
                  className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="แก้ไข"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(r)}
                  className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="ลบ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      </PressCard>
    </section>
  )
}
