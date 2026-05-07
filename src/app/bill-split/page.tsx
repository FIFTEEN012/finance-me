'use client'

import { useState } from 'react'
import {
  Plus, Trash2, Receipt, ArrowUpRight, ArrowDownLeft, Clock,
  CheckCircle2, Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useBillSplitStore } from '@/store/useBillSplitStore'
import { BillSplitForm } from '@/components/bill-split/BillSplitForm'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PressCard } from '@/components/ui/PressCard'
import { BillSplit } from '@/types'
import { cn } from '@/lib/utils'

/* ── helpers ────────────────────────────────────────────── */

function fmt(n: number, currency = 'THB') {
  return '฿' + n.toLocaleString('th-TH', { maximumFractionDigits: 2 })
}

function isSettled(s: BillSplit) {
  return s.participants.every((p) => p.paid || p.name === s.paidBy)
}

/* ── Avatar ─────────────────────────────────────────────── */

function Avatar({ name, variant }: { name: string; variant: 'payer' | 'default' }) {
  return (
    <div className={cn(
      'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
      variant === 'payer'
        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
        : 'bg-white/[0.07] text-white/60 border border-white/10',
      // light-mode fallback
      variant === 'payer'
        ? 'dark:bg-violet-500/20 bg-violet-100 text-violet-700 border-violet-200'
        : 'dark:bg-white/[0.07] bg-gray-100 dark:text-white/60 text-gray-500 dark:border-white/10 border-gray-200',
    )}>
      {name.charAt(0).toUpperCase() || '?'}
    </div>
  )
}

/* ── SplitCard ──────────────────────────────────────────── */

function SplitCard({ split, onDelete }: { split: BillSplit; onDelete: () => void }) {
  const { markPaid } = useBillSplitStore()
  const settled = isSettled(split)

  return (
    <PressCard
      shadow={settled ? '0 4px 0 0 #065f46' : '0 4px 0 0 #d1d5db'}
      shadowHover={settled ? '0 2px 0 0 #065f46' : '0 2px 0 0 #d1d5db'}
      className={cn(
        'overflow-hidden p-0',
        settled ? 'border-emerald-400' : 'border-gray-200',
      )}
    >
      {/* Card header */}
      <div className={cn(
        'px-6 py-5 border-b flex items-start justify-between gap-3',
        settled
          ? 'border-emerald-500/10 dark:bg-white/[0.01]'
          : 'border-gray-100 dark:border-white/[0.06] dark:bg-white/[0.01]',
      )}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {split.title}
            </h3>
            {settled && (
              <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                เสร็จสิ้น
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 dark:text-white/40">
            จ่ายโดย <span className="font-medium text-gray-600 dark:text-white/60">{split.paidBy}</span>
            {' · '}
            {new Date(split.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <p className={cn(
            'text-2xl font-bold tabular-nums num leading-none',
            settled
              ? 'text-gray-400 dark:text-white/30 line-through'
              : 'text-gray-900 dark:text-white',
          )}>
            {fmt(split.totalAmount, split.currency)}
          </p>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-300 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="ลบบิล"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Participants */}
      <div className="px-6 divide-y divide-gray-100 dark:divide-white/[0.04]">
        {split.participants.map((p) => {
          const isPayer = p.name === split.paidBy
          const isPaid  = isPayer || p.paid

          return (
            <div
              key={p.id}
              className="flex items-center justify-between py-3.5 gap-3"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={p.name} variant={isPayer ? 'payer' : 'default'} />
                <span className={cn(
                  'text-sm font-medium truncate',
                  isPayer
                    ? 'text-violet-600 dark:text-violet-300'
                    : 'text-gray-700 dark:text-white/80',
                )}>
                  {p.name}
                </span>
              </div>

              {/* Share + status */}
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn(
                  'text-sm font-semibold num tabular-nums',
                  isPayer
                    ? 'text-violet-600 dark:text-violet-300'
                    : p.paid
                      ? 'text-gray-400 dark:text-white/30 line-through'
                      : 'text-gray-700 dark:text-white/70',
                )}>
                  {fmt(p.share, split.currency)}
                </span>

                {isPayer ? (
                  /* Payer badge */
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    จ่ายแล้ว
                  </span>
                ) : (
                  /* Toggle button */
                  <button
                    onClick={() => markPaid(split.id, p.id, !p.paid)}
                    title={p.paid ? 'คลิกเพื่อยกเลิก' : 'คลิกเพื่อทำเครื่องหมายจ่ายแล้ว'}
                    className={cn(
                      'transition-colors rounded-full',
                      p.paid
                        ? 'text-emerald-500 dark:text-emerald-400 hover:text-gray-400 dark:hover:text-white/30'
                        : 'text-gray-300 dark:text-white/20 hover:text-emerald-500 dark:hover:text-emerald-400',
                    )}
                  >
                    {p.paid
                      ? <CheckCircle2 className="w-5 h-5" />
                      : <Circle className="w-5 h-5" />
                    }
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Note */}
      {split.note && (
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-400 dark:text-white/30 italic">{split.note}</p>
        </div>
      )}
    </PressCard>
  )
}

/* ── Page ────────────────────────────────────────────────── */

type FilterTab = 'all' | 'pending' | 'settled'

export default function BillSplitPage() {
  const { splits, getTotalOwedToMe, getTotalIOwe, getPendingCount, deleteSplit } = useBillSplitStore()
  const [formOpen, setFormOpen]       = useState(false)
  const [filter, setFilter]           = useState<FilterTab>('all')
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  const owedToMe   = getTotalOwedToMe()
  const iOwe       = getTotalIOwe()
  const pendingCnt = getPendingCount()

  const filtered = splits.filter((s) => {
    const settled = isSettled(s)
    if (filter === 'pending') return !settled
    if (filter === 'settled') return settled
    return true
  })

  const handleDelete = () => {
    if (!deletingId) return
    deleteSplit(deletingId)
    toast.success('ลบบิลแล้ว')
    setDeletingId(null)
  }

  /* stat cards config */
  const stats = [
    {
      label:  'คนอื่นค้างฉัน',
      value:  owedToMe === 0 ? '฿0' : fmt(owedToMe),
      Icon:   ArrowUpRight,
      accent: {
        text:   'text-emerald-600 dark:text-emerald-400',
        icon:   'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10',
        border: 'border-emerald-100 dark:border-emerald-500/15',
        bg:     'bg-emerald-50/60 dark:bg-emerald-500/[0.04]',
      },
    },
    {
      label:  'ฉันค้างคนอื่น',
      value:  iOwe === 0 ? '฿0' : fmt(iOwe),
      Icon:   ArrowDownLeft,
      accent: {
        text:   'text-red-500 dark:text-red-400',
        icon:   'text-red-500 dark:text-red-400 bg-red-500/10',
        border: 'border-red-100 dark:border-red-500/15',
        bg:     'bg-red-50/60 dark:bg-red-500/[0.04]',
      },
    },
    {
      label:  'รอชำระ',
      value:  `${pendingCnt}`,
      unit:   'บิล',
      Icon:   Clock,
      accent: {
        text:   'text-amber-600 dark:text-amber-400',
        icon:   'text-amber-500 dark:text-amber-400 bg-amber-500/10',
        border: 'border-amber-100 dark:border-amber-500/15',
        bg:     'bg-amber-50/60 dark:bg-amber-500/[0.04]',
      },
    },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24">
      {/* Page heading */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">แบ่งบิล</h2>
        <p className="text-sm text-gray-400 dark:text-white/40">{splits.length} บิลทั้งหมด</p>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => {
          const shadowColor = s.label === 'คนอื่นค้างฉัน' ? '#065f46' : s.label === 'ฉันค้างคนอื่น' ? '#9f1239' : '#92400e'
          const borderColor = s.label === 'คนอื่นค้างฉัน' ? 'border-emerald-400 bg-emerald-500' : s.label === 'ฉันค้างคนอื่น' ? 'border-rose-400 bg-rose-500' : 'border-amber-400 bg-amber-500'
          return (
          <PressCard
            key={s.label}
            shadow={`0 4px 0 0 ${shadowColor}`}
            className={`${borderColor} p-4`}
          >
            <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <s.Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-white font-black text-xl leading-none num">
              {s.value}
              {s.unit && <span className="text-sm font-medium ml-1">{s.unit}</span>}
            </p>
          </PressCard>
          )
        })}
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between gap-3">
        {/* Segmented pill control */}
        <div className={cn(
          'flex rounded-full border p-1 gap-0.5',
          'border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03]',
        )}>
          {(['all', 'pending', 'settled'] as FilterTab[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
                filter === f
                  ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.35)]'
                  : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70',
              )}
            >
              {f === 'all' ? 'ทั้งหมด' : f === 'pending' ? 'รอชำระ' : 'เสร็จสิ้น'}
              {f === 'pending' && pendingCnt > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {pendingCnt}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setFormOpen(true)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all',
            'bg-violet-600 hover:bg-violet-500 text-white',
            'shadow-[0_0_20px_rgba(124,58,237,0.30)]',
          )}
        >
          <Plus className="w-4 h-4" />
          แบ่งบิลใหม่
        </button>
      </div>

      {/* Bill list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Receipt className="w-12 h-12 mb-3 text-gray-200 dark:text-white/10" />
          <p className="text-sm text-gray-400 dark:text-white/30">
            {filter === 'all'
              ? 'ยังไม่มีบิล — กด "แบ่งบิลใหม่" เพื่อเริ่มต้น'
              : 'ไม่มีบิลในหมวดนี้'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => (
            <SplitCard
              key={s.id}
              split={s}
              onDelete={() => setDeletingId(s.id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <BillSplitForm open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="ลบบิลนี้?"
        description="บิลและข้อมูลผู้เข้าร่วมทั้งหมดจะถูกลบถาวร ไม่สามารถย้อนกลับได้"
        onConfirm={handleDelete}
      />
    </div>
  )
}
