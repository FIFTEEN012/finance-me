import Link from 'next/link'
import { PiggyBank } from 'lucide-react'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import type { BudgetQuestItem } from './forestDashboard'

interface BudgetQuestCardProps {
  items: BudgetQuestItem[]
}

const toneStyles = {
  orange: {
    iconWrapClass: 'bg-[#ff9c27]/15 text-[#8c5000]',
    barClass: 'bg-[#ff9c27]',
  },
  blue: {
    iconWrapClass: 'bg-[var(--forest-primary-container)]/15 text-[var(--forest-primary)]',
    barClass: 'bg-[var(--forest-primary-container)]',
  },
  red: {
    iconWrapClass: 'bg-[#ba1a1a]/10 text-[#ba1a1a]',
    barClass: 'bg-[#ba1a1a]',
  },
} as const

export function BudgetQuestCard({ items }: BudgetQuestCardProps) {
  return (
    <section className="forest-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-quest-heading text-[1.2rem] font-black tracking-[-0.02em] text-[var(--forest-foreground)]">
          งบประมาณเดือนนี้
        </h2>
        <Link href="/budgets" className="text-[12px] font-bold text-[var(--forest-primary)] hover:underline">
          จัดการ
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => {
            const tone = toneStyles[item.tone]
            return (
              <div key={item.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-[12px] font-bold text-[var(--forest-foreground)]">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.iconWrapClass}`}>
                      <CategoryIcon name={item.icon} className="h-4 w-4" style={{ color: item.iconColor }} />
                    </span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="num text-[11px] font-bold text-[var(--forest-foreground)]">{item.spentLabel}</span>
                </div>

                <div className="forest-progress-track h-3">
                  <div className={`forest-progress-fill h-full rounded-full ${tone.barClass}`} style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--forest-outline-variant)] bg-[var(--forest-surface-low)] px-4 py-8 text-center">
          <PiggyBank className="h-9 w-9 text-[var(--forest-outline)]" />
          <div>
            <p className="font-quest-heading text-lg font-black text-[var(--forest-foreground)]">ยังไม่มีงบของเดือนนี้</p>
            <p className="text-sm font-medium text-[var(--forest-muted)]">ตั้งงบประมาณแรกเพื่อปลดล็อกการติดตามความคืบหน้ารายหมวด</p>
          </div>
          <Link href="/budgets" className="forest-button-outline inline-flex items-center justify-center px-4 py-2 text-sm">
            ไปตั้งงบประมาณ
          </Link>
        </div>
      )}
    </section>
  )
}
