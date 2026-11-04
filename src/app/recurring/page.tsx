'use client'

import { useState } from 'react'
import { Pause, Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { FREQUENCY_LABELS, RecurringForm, RecurringFormValues } from '@/components/recurring/RecurringForm'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useRecurringStore } from '@/store/useRecurringStore'
import { nextOccurrence } from '@/lib/recurring'
import { RecurringTransaction } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'

function formatThaiDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function RecurringPage() {
  const { recurrings, addRecurring, updateRecurring, deleteRecurring, setRecurringActive, generateDue } = useRecurringStore()
  const getCategoryById = useCategoryStore((s) => s.getCategoryById)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransaction | null>(null)
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null)

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (rule: RecurringTransaction) => { setEditing(rule); setFormOpen(true) }

  const handleSubmit = (values: RecurringFormValues) => {
    const input = { ...values, note: values.note?.trim() || undefined }
    if (editing) {
      updateRecurring(editing.id, input)
      toast.success('แก้ไขรายการประจำแล้ว')
    } else {
      addRecurring(input)
      toast.success('เพิ่มรายการประจำแล้ว')
    }
    setFormOpen(false)

    const count = generateDue()
    if (count > 0) toast.success(`บันทึกรายการประจำอัตโนมัติ ${count} รายการ`)
  }

  const handleToggle = (rule: RecurringTransaction) => {
    setRecurringActive(rule.id, !rule.isActive)
    if (rule.isActive) {
      toast.success('พักรายการประจำแล้ว')
      return
    }
    toast.success('เปิดใช้รายการประจำแล้ว รอบที่ผ่านไประหว่างพักจะไม่ถูกบันทึก')
    const count = generateDue()
    if (count > 0) toast.success(`บันทึกรายการประจำอัตโนมัติ ${count} รายการ`)
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteRecurring(deleting.id)
    toast.success('ลบรายการประจำแล้ว')
    setDeleting(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">รายการประจำ</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ตั้งไว้ครั้งเดียว ระบบบันทึกให้เมื่อถึงวันครบรอบ ถ้าวันนั้นไม่ได้เปิดแอป จะบันทึกย้อนหลังให้เมื่อเปิดครั้งถัดไป
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="w-4 h-4" /> เพิ่มรายการประจำ
        </Button>
      </div>

      {recurrings.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="ยังไม่มีรายการประจำ"
          description="เพิ่มรายการที่จ่ายหรือรับเป็นประจำ เช่น ค่าเช่า ค่าอินเทอร์เน็ต หรือเงินเดือน"
        />
      ) : (
        <div className="space-y-3">
          {recurrings.map((rule) => {
            const category = getCategoryById(rule.categoryId)
            return (
              <PressCard
                key={rule.id}
                shadow="0 4px 0 0 #e5e5e5"
                shadowHover="0 2px 0 0 #e5e5e5"
                className={cn(
                  'flex flex-wrap items-center gap-3 p-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
                  !rule.isActive && 'opacity-60',
                )}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: `${category?.color ?? '#94a3b8'}20` }}
                >
                  <CategoryIcon
                    name={category?.icon ?? 'Folder'}
                    className="w-5 h-5"
                    style={{ color: category?.color ?? '#94a3b8' }}
                  />
                </div>

                <div className="flex-1 min-w-[10rem]">
                  <p className="font-bold text-slate-800 dark:text-slate-100 break-words">{rule.description}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {FREQUENCY_LABELS[rule.frequency]} · {category?.name ?? 'ไม่มีหมวดหมู่'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {rule.isActive ? `รอบถัดไป ${formatThaiDate(nextOccurrence(rule))}` : 'พักอยู่'}
                  </p>
                </div>

                <span className={cn(
                  'font-black num tabular-nums',
                  rule.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
                )}>
                  {rule.type === 'INCOME' ? '+' : '-'}{formatCurrency(rule.amount)}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={rule.isActive ? `พัก ${rule.description}` : `เปิดใช้ ${rule.description}`}
                    onClick={() => handleToggle(rule)}
                  >
                    {rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`แก้ไข ${rule.description}`} onClick={() => openEdit(rule)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`ลบ ${rule.description}`} onClick={() => setDeleting(rule)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </PressCard>
            )
          })}
        </div>
      )}

      <RecurringForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSubmit={handleSubmit} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="ลบรายการประจำ"
        description={`ลบ "${deleting?.description ?? ''}" ระบบจะหยุดบันทึกรอบถัดไป รายการที่บันทึกไปแล้วยังอยู่`}
        onConfirm={handleDelete}
        confirmLabel="ลบ"
      />
    </div>
  )
}
