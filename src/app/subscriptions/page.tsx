'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, RefreshCw, ExternalLink,
  TrendingDown, CalendarDays, Pause, Play, CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscriptionStore, toMonthlyAmount } from '@/store/useSubscriptionStore'
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm'
import { Subscription, SubscriptionCategory } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { PressCard } from '@/components/ui/PressCard'

/* ── Constants ── */
const CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  entertainment: '🎬 บันเทิง',
  productivity:  '💼 การทำงาน',
  cloud:         '☁️ คลาวด์',
  health:        '💪 สุขภาพ',
  gaming:        '🎮 เกม',
  news:          '📰 ข่าวสาร',
  food:          '🍔 อาหาร',
  transport:     '🚗 ขนส่ง',
  other:         '📦 อื่นๆ',
}

const CYCLE_LABEL: Record<string, string> = {
  weekly:    'สัปดาห์',
  monthly:   'เดือน',
  quarterly: '3 เดือน',
  yearly:    'ปี',
}

/* ── Helpers ── */
function daysUntil(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/* ── Stat card ── */
function StatCard({
  label, value, sub, icon: Icon, color, shadow,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; color: string; shadow?: string
}) {
  return (
    <PressCard
      shadow={shadow ?? `0 4px 0 0 ${color}99`}
      shadowHover={`0 2px 0 0 ${color}66`}
      className="border-gray-200 bg-white p-4"
      style={{ borderColor: color + '40' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-white/40 uppercase tracking-wide mb-1.5">{label}</p>
          <p className="text-2xl font-black num text-gray-900 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-white/30 mt-1">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '20' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
    </PressCard>
  )
}

/* ── Subscription row card ── */
function SubCard({
  sub,
  onEdit,
  onDelete,
  onToggle,
}: {
  sub: Subscription
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const days = daysUntil(sub.nextBillingDate)
  const monthly = toMonthlyAmount(sub.amount, sub.billingCycle)

  const urgency =
    days <= 3  ? 'text-red-500 dark:text-red-400' :
    days <= 7  ? 'text-amber-500 dark:text-amber-400' :
    'text-gray-400 dark:text-white/30'

  return (
    <div className={cn(
      'group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150',
      'border-gray-100 dark:border-white/[0.06]',
      'bg-white dark:bg-[oklch(0.105_0.024_270)]',
      'hover:border-gray-200 dark:hover:border-white/10',
      !sub.active && 'opacity-50',
    )}>
      {/* Emoji + color dot */}
      <div
        className="relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
        style={{ backgroundColor: sub.color + '18' }}
      >
        {sub.emoji}
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[oklch(0.105_0.024_270)]',
            sub.active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/20',
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-gray-800 dark:text-white/85 truncate">{sub.name}</p>
          {sub.website && (
            <a
              href={`https://${sub.website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-gray-400 dark:text-white/30">
            {CATEGORY_LABELS[sub.category]}
          </span>
          <span className="text-gray-200 dark:text-white/10">·</span>
          <span className="text-[11px] text-gray-400 dark:text-white/30">
            ทุก{CYCLE_LABEL[sub.billingCycle]}
          </span>
        </div>
      </div>

      {/* Next billing */}
      <div className="hidden sm:flex flex-col items-end flex-shrink-0">
        <p className={cn('text-[11px] font-medium', urgency)}>
          {days === 0 ? 'วันนี้!' : days === 1 ? 'พรุ่งนี้' : `${days} วัน`}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-white/25">{formatDate(sub.nextBillingDate)}</p>
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        <p className="text-[14px] font-bold num text-gray-800 dark:text-white/85">
          {sub.currency !== 'THB' ? sub.currency + ' ' : '฿'}
          {sub.amount.toLocaleString()}
        </p>
        {sub.billingCycle !== 'monthly' && (
          <p className="text-[11px] text-gray-400 dark:text-white/30">
            ≈ ฿{Math.round(monthly).toLocaleString()}/เดือน
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onToggle}
          title={sub.active ? 'หยุดชั่วคราว' : 'เปิดใช้'}
          className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          {sub.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ── Page ── */
export default function SubscriptionsPage() {
  const { subscriptions, deleteSubscription, toggleActive, getTotalMonthly, getTotalYearly, getUpcoming } =
    useSubscriptionStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all')

  const totalMonthly = getTotalMonthly()
  const totalYearly  = getTotalYearly()
  const upcoming7    = getUpcoming(7)
  const activeCount  = subscriptions.filter((s) => s.active).length

  /* grouped by category */
  const filtered = useMemo(() => {
    return subscriptions
      .filter((s) =>
        filter === 'all'    ? true :
        filter === 'active' ? s.active :
        !s.active
      )
      .sort((a, b) =>
        new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
      )
  }, [subscriptions, filter])

  const grouped = useMemo(() => {
    const m = new Map<SubscriptionCategory, Subscription[]>()
    for (const s of filtered) {
      const arr = m.get(s.category) ?? []
      arr.push(s)
      m.set(s.category, arr)
    }
    return m
  }, [filtered])

  function openEdit(sub: Subscription) {
    setEditing(sub)
    setFormOpen(true)
  }

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscriptions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeCount} บริการ · ติดตามรายจ่ายรายเดือนอัตโนมัติ
          </p>
        </div>
        <Button size="sm" className="gap-1.5 h-8" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" />
          เพิ่ม
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="รายเดือน (รวม)"
          value={`฿${Math.round(totalMonthly).toLocaleString()}`}
          sub="active subscriptions"
          icon={RefreshCw}
          color="#7C3AED"
        />
        <StatCard
          label="รายปี (รวม)"
          value={`฿${Math.round(totalYearly).toLocaleString()}`}
          sub="ต่อปี"
          icon={TrendingDown}
          color="#EF4444"
        />
        <StatCard
          label="บริการทั้งหมด"
          value={String(activeCount)}
          sub={`${subscriptions.length - activeCount} หยุดชั่วคราว`}
          icon={CreditCard}
          color="#3B82F6"
        />
        <StatCard
          label="ชำระใน 7 วัน"
          value={String(upcoming7.length)}
          sub={upcoming7.length > 0 ? `ถัดไป: ${upcoming7[0]?.name}` : 'ไม่มี'}
          icon={CalendarDays}
          color={upcoming7.length > 0 ? '#F59E0B' : '#10B981'}
        />
      </div>

      {/* Upcoming alert */}
      {upcoming7.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/8 p-4">
          <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400 mb-2">
            📅 ชำระเงินใน 7 วัน
          </p>
          <div className="flex flex-wrap gap-2">
            {upcoming7.map((s) => {
              const d = daysUntil(s.nextBillingDate)
              return (
                <div key={s.id} className="flex items-center gap-1.5 bg-white dark:bg-black/20 rounded-lg px-2.5 py-1.5 border border-amber-100 dark:border-amber-500/15">
                  <span>{s.emoji}</span>
                  <span className="text-[12px] font-medium text-gray-700 dark:text-white/70">{s.name}</span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                    {d === 0 ? 'วันนี้!' : d === 1 ? 'พรุ่งนี้' : `${d} วัน`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {subscriptions.length > 0 && (
        <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.05] rounded-lg p-1 w-fit">
          {(['all', 'active', 'paused'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
                filter === f
                  ? 'bg-violet-600 text-white shadow-[0_2px_0_0_#4c1d95]'
                  : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60',
              )}
            >
              {f === 'all' ? 'ทั้งหมด' : f === 'active' ? '🟢 ใช้งาน' : '⏸ หยุดชั่วคราว'}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {subscriptions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-violet-500 dark:text-violet-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">ยังไม่มี Subscription</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5 max-w-xs">
            เพิ่มบริการที่คุณสมัครสมาชิก เช่น Netflix, Spotify เพื่อติดตามค่าใช้จ่ายรายเดือน
          </p>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            เพิ่ม Subscription แรก
          </Button>
        </div>
      )}

      {/* Grouped list */}
      {filtered.length > 0 && (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([cat, subs]) => (
            <div key={cat}>
              <p className="text-[11px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider mb-2 px-1">
                {CATEGORY_LABELS[cat]}
                <span className="ml-2 font-normal normal-case">
                  ฿{Math.round(subs.filter(s => s.active).reduce((sum, s) => sum + toMonthlyAmount(s.amount, s.billingCycle), 0)).toLocaleString()}/เดือน
                </span>
              </p>
              <div className="space-y-2">
                {subs.map((s) => (
                  <SubCard
                    key={s.id}
                    sub={s}
                    onEdit={() => openEdit(s)}
                    onDelete={() => deleteSubscription(s.id)}
                    onToggle={() => toggleActive(s.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && subscriptions.length > 0 && (
        <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
          ไม่มีรายการใน filter นี้
        </div>
      )}

      <SubscriptionForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null) }}
        editing={editing}
      />
    </div>
  )
}
