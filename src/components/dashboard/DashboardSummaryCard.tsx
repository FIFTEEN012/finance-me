import { cn } from '@/lib/utils'
import type { DashboardSummaryItem } from './forestDashboard'

interface DashboardSummaryCardProps {
  item: DashboardSummaryItem
}

const toneStyles = {
  income: {
    borderClass: 'border-[#58cc02]',
    iconWrapClass: 'bg-[#58cc02]/15 text-[#1b4300]',
    valueClass: 'text-[#1b4300]',
    shadowColor: '#58cc02',
  },
  expense: {
    borderClass: 'border-[#ba1a1a]/25',
    iconWrapClass: 'bg-[#ba1a1a]/10 text-[#ba1a1a]',
    valueClass: 'text-[#ba1a1a]',
    shadowColor: '#ba1a1a',
  },
  balance: {
    borderClass: 'border-[#2fb8ff]/45',
    iconWrapClass: 'bg-[#2fb8ff]/20 text-[#006590]',
    valueClass: 'text-[#006590]',
    shadowColor: '#2fb8ff',
  },
} as const

export function DashboardSummaryCard({ item }: DashboardSummaryCardProps) {
  const tone = toneStyles[item.tone]

  return (
    <div
      className={cn(
        'rounded-[1.35rem] border-2 bg-[var(--forest-surface)] p-4 transition-transform duration-100 hover:-translate-y-0.5',
        tone.borderClass
      )}
      style={{ boxShadow: `0 4px 0 0 ${tone.shadowColor}` }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone.iconWrapClass)}>
          <item.Icon className="h-[18px] w-[18px]" />
        </div>
        <span
          className={cn(
            'text-[11px] font-bold',
            item.changeTone === 'positive'
              ? 'text-[#2b6c00]'
              : item.changeTone === 'negative'
                ? 'text-[#ba1a1a]'
                : 'text-[var(--forest-muted)]'
          )}
        >
          {item.changeLabel}
        </span>
      </div>

      <p className="text-[12px] font-bold text-[var(--forest-muted)]">{item.label}</p>
      <p className={cn('mt-1 font-quest-heading text-[1.45rem] font-black tracking-[-0.02em] md:text-[1.65rem]', tone.valueClass)}>
        {item.value}
      </p>
    </div>
  )
}
