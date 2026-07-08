import { cn } from '@/lib/utils'
import type { RewardBadgeItem } from './forestDashboard'

interface RewardBadgeGridProps {
  badges: RewardBadgeItem[]
}

const toneStyles = {
  orange: 'bg-[var(--forest-tertiary-container)] text-white',
  green: 'bg-[var(--forest-primary-container)] text-white',
  blue: 'bg-[var(--forest-secondary-container)] text-white',
  red: 'bg-[var(--forest-surface-low)] text-[#ba1a1a] border-[#ba1a1a]/20',
} as const

export function RewardBadgeGrid({ badges }: RewardBadgeGridProps) {
  return (
    <section className="forest-panel p-5">
      <h2 className="mb-3 font-quest-heading text-[1rem] font-black tracking-[-0.02em] text-[var(--forest-foreground)]">
        เหรียญรางวัล
      </h2>

      <div className="grid grid-cols-4 gap-3">
        {badges.map((badge) => (
          <div key={badge.id} className={cn('flex flex-col items-center gap-1.5', !badge.unlocked && 'opacity-35 grayscale')}>
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border-2 border-white shadow-sm',
                toneStyles[badge.tone]
              )}
            >
              <badge.Icon className="h-[18px] w-[18px]" />
            </div>
            <span className="text-center text-[8px] font-bold text-[var(--forest-foreground)]">{badge.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
