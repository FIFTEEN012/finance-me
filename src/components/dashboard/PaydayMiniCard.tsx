import { CalendarDays } from 'lucide-react'
import type { PaydayMiniData } from './forestDashboard'

interface PaydayMiniCardProps {
  payday: PaydayMiniData
}

export function PaydayMiniCard({ payday }: PaydayMiniCardProps) {
  return (
    <section className="forest-panel flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--forest-muted)]">
          {payday.title}
        </p>
        <p className="mt-1 font-quest-heading text-[1.65rem] font-black tracking-[-0.03em] text-[var(--forest-primary)]">
          เหลือ {payday.daysLeft} วัน
        </p>
        <p className="mt-1 text-[12px] font-medium text-[var(--forest-muted)]">{payday.detail}</p>
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--forest-outline-variant)]/30 bg-[var(--forest-surface-low)] text-[var(--forest-primary)]">
        <CalendarDays className="h-5 w-5" />
      </div>
    </section>
  )
}
