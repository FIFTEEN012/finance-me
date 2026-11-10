'use client'

import { useMemo, useState } from 'react'
import { CircleCheck, Package, Pencil, Plus, RotateCcw, ShoppingBasket, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { SupplyForm } from '@/components/supplies/SupplyForm'
import { FinishSupplyDialog } from '@/components/supplies/FinishSupplyDialog'
import { SupplyInput, useSupplyStore } from '@/store/useSupplyStore'
import { todayKey } from '@/lib/recurring'
import { dailyUsage, forecast, formatAmount, formatDuration, productKey, usageDays } from '@/lib/supplies'
import { SupplyItem } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'

function formatThaiDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function usageDetails(item: SupplyItem, today: string): string[] {
  const { costPerDay, quantityPerDay } = dailyUsage(item, today)
  const parts: string[] = []
  if (item.price) parts.push(`ราคา ${formatCurrency(item.price)}`)
  if (item.quantity) parts.push(`ปริมาณ ${formatAmount(item.quantity)}${item.unit ? ` ${item.unit}` : ''}`)
  if (item.finishedDate) {
    if (costPerDay !== undefined) parts.push(`ตกวันละ ${formatCurrency(costPerDay)}`)
    if (quantityPerDay !== undefined) parts.push(`ใช้วันละ ${formatAmount(quantityPerDay)}${item.unit ? ` ${item.unit}` : ''}`)
  }
  return parts
}

export default function SuppliesPage() {
  const { items, addItem, updateItem, deleteItem, markFinished, markInUse, restock } = useSupplyStore()
  const today = todayKey()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupplyItem | null>(null)
  const [finishing, setFinishing] = useState<SupplyItem | null>(null)
  const [deleting, setDeleting] = useState<SupplyItem | null>(null)

  const inUse = useMemo(
    () => items.filter((i) => !i.finishedDate).sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [items],
  )
  const finished = useMemo(
    () => items.filter((i) => i.finishedDate).sort((a, b) => (b.finishedDate as string).localeCompare(a.finishedDate as string)),
    [items],
  )
  const knownNames = useMemo(() => {
    const byKey = new Map<string, string>()
    for (const item of items) byKey.set(productKey(item.name), item.name)
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'th'))
  }, [items])

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (item: SupplyItem) => { setEditing(item); setFormOpen(true) }

  const handleSubmit = (input: SupplyInput) => {
    if (editing) {
      updateItem(editing.id, input)
      toast.success('แก้ไขของใช้แล้ว')
    } else {
      addItem(input)
      toast.success(input.finishedDate ? 'บันทึกประวัติของใช้แล้ว' : 'เริ่มนับวันใช้แล้ว')
    }
    setFormOpen(false)
  }

  const handleFinish = (date: string) => {
    if (!finishing) return
    markFinished(finishing.id, date)
    toast.success(`${finishing.name} ใช้ได้ ${formatDuration(usageDays({ ...finishing, finishedDate: date }, today))}`)
    setFinishing(null)
  }

  const handleRestock = (item: SupplyItem) => {
    restock(item.id)
    toast.success(`เริ่มนับวันใช้ ${item.name} ชิ้นใหม่แล้ว`)
  }

  const handleDelete = () => {
    if (!deleting) return
    deleteItem(deleting.id)
    toast.success('ลบของใช้แล้ว')
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">ของใช้</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            บันทึกวันที่ซื้อหรือเริ่มใช้ ระบบจะนับวันไปเรื่อย ๆ พอใช้หมดก็กดว่าหมดแล้ว จะรู้ว่าแต่ละชิ้นใช้ได้กี่วัน
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="w-4 h-4" /> เพิ่มของใช้
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="ยังไม่มีของใช้"
          description="เพิ่มสิ่งที่ซื้อมาใช้ เช่น ครีม ยาสีฟัน แชมพู แล้วกดว่าหมดเมื่อใช้หมด"
        />
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">กำลังใช้ ({inUse.length})</h3>
            {inUse.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">ไม่มีของที่กำลังใช้</p>
            )}
            {inUse.map((item) => {
              const elapsed = usageDays(item, today)
              const plan = forecast(item, items, today)
              const details = usageDetails(item, today)
              return (
                <PressCard
                  key={item.id}
                  shadow="0 4px 0 0 #e5e5e5"
                  shadowHover="0 2px 0 0 #e5e5e5"
                  className="p-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 bg-sky-100 dark:bg-sky-500/15">
                      <Package className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-[9rem]">
                      <p className="font-bold text-slate-800 dark:text-slate-100 break-words">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">เริ่มใช้ {formatThaiDate(item.startDate)}</p>
                      {details.length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{details.join(' · ')}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">ใช้มาแล้ว</p>
                      <p className="text-2xl font-black num tabular-nums text-slate-800 dark:text-slate-100">
                        {elapsed} <span className="text-sm font-bold">วัน</span>
                      </p>
                    </div>
                  </div>

                  {plan && (
                    <div className="space-y-1">
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', plan.overdueDays > 0 ? 'bg-amber-500' : 'bg-emerald-500')}
                          style={{ width: `${Math.round(plan.progress * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        ปกติใช้ได้ {formatDuration(plan.averageDays)} จาก {plan.samples} ชิ้นก่อน
                        {' · '}
                        {plan.overdueDays > 0
                          ? `ใช้นานกว่าปกติ ${plan.overdueDays} วันแล้ว`
                          : `น่าจะหมดราว ${formatThaiDate(plan.expectedEndDate)}`}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label={`แก้ไข ${item.name}`} onClick={() => openEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`ลบ ${item.name}`} onClick={() => setDeleting(item)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => setFinishing(item)}>
                      <CircleCheck className="w-4 h-4" /> หมดแล้ว
                    </Button>
                  </div>
                </PressCard>
              )
            })}
          </section>

          {finished.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">ใช้หมดแล้ว ({finished.length})</h3>
              {finished.map((item) => {
                const details = usageDetails(item, today)
                return (
                  <PressCard
                    key={item.id}
                    shadow="0 4px 0 0 #e5e5e5"
                    shadowHover="0 2px 0 0 #e5e5e5"
                    className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div className="flex-1 min-w-[10rem]">
                      <p className="font-bold text-slate-800 dark:text-slate-100 break-words">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatThaiDate(item.startDate)} – {formatThaiDate(item.finishedDate as string)}
                      </p>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        ใช้ได้ {formatDuration(usageDays(item, today))}
                      </p>
                      {details.length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{details.join(' · ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" aria-label={`ซื้อ ${item.name} ใหม่`} title="ซื้อใหม่ เริ่มนับวันนี้" onClick={() => handleRestock(item)}>
                        <ShoppingBasket className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`ยังไม่หมด ${item.name}`} title="ยังไม่หมด" onClick={() => markInUse(item.id)}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`แก้ไข ${item.name}`} onClick={() => openEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`ลบ ${item.name}`} onClick={() => setDeleting(item)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </PressCard>
                )
              })}
            </section>
          )}
        </>
      )}

      <SupplyForm open={formOpen} onOpenChange={setFormOpen} editing={editing} knownNames={knownNames} onSubmit={handleSubmit} />
      <FinishSupplyDialog item={finishing} onOpenChange={(open) => { if (!open) setFinishing(null) }} onConfirm={handleFinish} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="ลบของใช้"
        description={`ลบ "${deleting?.name ?? ''}" ออกจากประวัติ ค่าเฉลี่ยวันใช้ของสินค้านี้จะคำนวณใหม่โดยไม่นับชิ้นนี้`}
        onConfirm={handleDelete}
        confirmLabel="ลบ"
      />
    </div>
  )
}
