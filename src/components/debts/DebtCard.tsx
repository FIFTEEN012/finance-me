'use client'

import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit2,
  HandCoins,
  History,
  Trash2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { PressCard } from '@/components/ui/PressCard'
import { DebtItem } from '@/types/debt'
import { formatCurrency, cn } from '@/lib/utils'

interface DebtCardProps {
  debt: DebtItem
  onRepay: (debt: DebtItem) => void
  onEdit: (debt: DebtItem) => void
  onDelete: (debt: DebtItem) => void
  onDeletePayment: (debtId: string, paymentId: string) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  person: 'เพื่อน / คนรู้จัก',
  family: 'ครอบครัว / ญาติ',
  credit_card: 'บัตรเครดิต',
  loan: 'สินเชื่อ / เงินกู้',
  other: 'อื่น ๆ',
}

function getDueDateStatus(dueDate?: string, isSettled?: boolean) {
  if (isSettled) {
    return { label: 'เคลียร์ครบแล้ว', tone: 'settled', icon: CheckCircle2 }
  }
  if (!dueDate) {
    return { label: 'ไม่มีกำหนดวัน', tone: 'none', icon: Clock }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dueDate)
  target.setHours(0, 0, 0, 0)

  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      label: `เกินกำหนด ${Math.abs(diffDays)} วัน`,
      tone: 'overdue',
      icon: AlertCircle,
    }
  }
  if (diffDays === 0) {
    return { label: 'ครบกำหนดวันนี้', tone: 'due-today', icon: AlertCircle }
  }
  if (diffDays <= 3) {
    return { label: `อีก ${diffDays} วันครบกำหนด`, tone: 'due-soon', icon: Clock }
  }
  return {
    label: `ครบกำหนด ${target.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`,
    tone: 'normal',
    icon: Calendar,
  }
}

export function DebtCard({
  debt,
  onRepay,
  onEdit,
  onDelete,
  onDeletePayment,
}: DebtCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false)

  const isIOwe = debt.type === 'I_OWE'
  const remaining = Math.max(0, debt.totalAmount - debt.paidAmount)
  const progressPercent = debt.totalAmount === 0 ? 100 : Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100))
  const dueStatus = getDueDateStatus(debt.dueDate, debt.isSettled)

  return (
    <PressCard
      shadow="0 6px 0 0 #becbb1"
      shadowHover="0 4px 0 0 #becbb1"
      className="overflow-hidden rounded-[1.75rem] border-[#becbb1] bg-[var(--quest-surface)] p-5 dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:shadow-[0_6px_0_0_#0f130c]"
    >
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 text-white shadow-sm"
              style={{ backgroundColor: debt.color, borderColor: debt.color }}
            >
              {isIOwe ? (
                <ArrowDownLeft className="h-6 w-6 stroke-[2.5px]" />
              ) : (
                <ArrowUpRight className="h-6 w-6 stroke-[2.5px]" />
              )}
            </div>
            <div className="min-w-0 overflow-hidden">
              <h3 className="font-quest-heading text-lg font-black tracking-tight text-[var(--quest-foreground)] truncate">
                {debt.personName}
              </h3>
              <p className="text-[11px] font-bold text-[var(--quest-outline)]">
                {CATEGORY_LABELS[debt.category] || 'ทั่วไป'} · เริ่ม {new Date(debt.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                isIOwe
                  ? 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-400'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400'
              )}
            >
              {isIOwe ? 'ฉันติดหนี้' : 'ติดหนี้ฉัน'}
            </span>

            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black',
                dueStatus.tone === 'settled' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
                dueStatus.tone === 'overdue' && 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 animate-pulse',
                (dueStatus.tone === 'due-today' || dueStatus.tone === 'due-soon') && 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
                (dueStatus.tone === 'normal' || dueStatus.tone === 'none') && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              <dueStatus.icon className="h-3 w-3 shrink-0" />
              <span>{dueStatus.label}</span>
            </span>
          </div>
        </div>

        {/* Note (if any) */}
        {debt.note && (
          <p className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            💬 {debt.note}
          </p>
        )}

        {/* Financial Numbers Strip */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ยอดรวม</span>
            <p className="font-quest-heading text-sm font-black text-slate-800 dark:text-white truncate">
              {formatCurrency(debt.totalAmount)}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ชำระแล้ว</span>
            <p className="font-quest-heading text-sm font-black text-emerald-600 dark:text-emerald-400 truncate">
              {formatCurrency(debt.paidAmount)}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">คงเหลือ</span>
            <p
              className={cn(
                'font-quest-heading text-sm font-black truncate',
                remaining === 0 ? 'text-slate-400 line-through' : isIOwe ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'
              )}
            >
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-black">
            <span className="text-slate-500 dark:text-slate-400">ความคืบหน้าการชำระ</span>
            <span className="text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]">
              {progressPercent}%
            </span>
          </div>
          <div className="h-3.5 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: debt.color,
              }}
            />
          </div>
        </div>

        {/* Payment History Accordion */}
        {debt.payments.length > 0 && (
          <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex w-full items-center justify-between py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 select-none"
            >
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                ประวัติการชำระ ({debt.payments.length} ครั้ง)
              </span>
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform duration-200', historyOpen && 'rotate-180')}
              />
            </button>

            {historyOpen && (
              <div className="mt-2 space-y-1.5 rounded-2xl bg-slate-50/80 p-2.5 dark:bg-slate-800/40">
                {debt.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(p.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(p.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {p.note && <p className="text-[10px] text-slate-500 truncate">{p.note}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeletePayment(debt.id, p.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="ลบรายการชำระนี้"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          {!debt.isSettled ? (
            <button
              type="button"
              onClick={() => onRepay(debt)}
              className="quest-action-button flex flex-1 items-center justify-center gap-1.5 px-4 text-xs font-black whitespace-nowrap"
            >
              <HandCoins className="h-4 w-4" />
              <span>{isIOwe ? 'บันทึกชำระหนี้' : 'บันทึกรับคืนเงิน'}</span>
            </button>
          ) : (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-xs font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 select-none">
              <CheckCircle2 className="h-4 w-4" />
              <span>เคลียร์ครบเรียบร้อย</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onEdit(debt)}
            className="quest-secondary-button flex h-11 w-11 items-center justify-center rounded-xl"
            title="แก้ไขข้อมูล"
          >
            <Edit2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(debt)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-b-4 border-rose-300 bg-[var(--quest-surface)] text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-[var(--quest-surface)] dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
            title="ลบรายการ"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </PressCard>
  )
}
