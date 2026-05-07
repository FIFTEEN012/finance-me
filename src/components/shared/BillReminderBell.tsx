'use client'

import { useEffect } from 'react'
import { Bell, CheckCircle2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useBillReminders, BillItem } from '@/hooks/useBillReminders'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

/* ─── Bill item row ─────────────────────────────────────────── */

function BillRow({ item }: { item: BillItem }) {
  const { recurring, cat, dueDate, daysUntilDue } = item

  const dueLabelColor =
    daysUntilDue < 0
      ? 'text-red-500'
      : daysUntilDue === 0
        ? 'text-orange-500'
        : daysUntilDue <= 3
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-gray-400 dark:text-white/35'

  const dueLabel =
    daysUntilDue < 0
      ? `เลยกำหนด ${Math.abs(daysUntilDue)} วัน`
      : daysUntilDue === 0
        ? 'วันนี้'
        : daysUntilDue === 1
          ? 'พรุ่งนี้'
          : `อีก ${daysUntilDue} วัน`

  return (
    <div className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
      {/* Category icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: cat ? `${cat.color}20` : 'rgba(107,114,128,0.12)' }}
      >
        <span>{cat?.icon ?? '📋'}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800 dark:text-white/80 truncate">{recurring.description}</p>
        <p className="text-[10px] text-gray-400 dark:text-white/35 truncate">
          {cat?.name ?? 'ไม่มีหมวดหมู่'} · วันที่ {dueDate.getDate()}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold num text-gray-700 dark:text-white/70">{formatCurrency(recurring.amount)}</p>
        <p className={cn('text-[10px] font-medium', dueLabelColor)}>{dueLabel}</p>
      </div>
    </div>
  )
}

/* ─── Bell component ────────────────────────────────────────── */

export function BillReminderBell() {
  const { upcoming, overdue } = useBillReminders(7)

  // Count urgent (≤3 days) + overdue for badge
  const urgentCount = upcoming.filter((b) => b.daysUntilDue <= 3).length + overdue.length

  // Browser notifications on mount
  useEffect(() => {
    const urgent = [...upcoming.filter((b) => b.daysUntilDue <= 1), ...overdue]
    if (urgent.length === 0) return

    if (!('Notification' in window)) return

    const showNotifications = () => {
      for (const item of urgent) {
        const label =
          item.daysUntilDue < 0
            ? `เลยกำหนด ${Math.abs(item.daysUntilDue)} วัน`
            : item.daysUntilDue === 0
              ? 'วันนี้'
              : 'พรุ่งนี้'
        new Notification(`บิล: ${item.recurring.description}`, {
          body: `${formatCurrency(item.recurring.amount)} · ${label}`,
          icon: '/icons/icon-192x192.png',
        })
      }
    }

    if (Notification.permission === 'granted') {
      showNotifications()
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') showNotifications()
      })
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
          'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60',
          'hover:bg-gray-100 dark:hover:bg-white/[0.05]',
        )}
        aria-label="Bill reminders"
      >
        <Bell className="w-4 h-4" />
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {urgentCount > 9 ? '9+' : urgentCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent side="bottom" align="end" className="w-80 p-0 overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-gray-100 dark:border-white/[0.06]">
          <p className="text-xs font-semibold text-gray-800 dark:text-white/80">การแจ้งเตือนบิล</p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {upcoming.length === 0 && overdue.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center px-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <p className="text-xs font-medium text-gray-500 dark:text-white/40">ไม่มีบิลที่ใกล้ครบกำหนด</p>
              <p className="text-[10px] text-gray-400 dark:text-white/30">บิลทุกรายการอยู่ในสถานะปกติ</p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider px-2 py-1.5">
                    ครบกำหนดเร็วๆ นี้
                  </p>
                  {upcoming.map((item) => (
                    <BillRow key={item.recurring.id} item={item} />
                  ))}
                </>
              )}

              {/* Overdue */}
              {overdue.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider px-2 py-1.5 mt-1">
                    เลยกำหนด
                  </p>
                  {overdue.map((item) => (
                    <BillRow key={item.recurring.id} item={item} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
