import Link from 'next/link'
import { CheckCircle2, Flag, PiggyBank, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DailyQuestData } from './forestDashboard'

interface DailyQuestCardProps {
  quest: DailyQuestData
  onAction?: () => void
}

const toneStyles = {
  start: {
    cardClass: 'border-[var(--forest-secondary-container)] bg-[var(--forest-secondary-container)]/5',
    iconWrapClass: 'border-[var(--forest-secondary-container)] bg-white text-[var(--forest-secondary)]',
    buttonClass: 'border-[var(--forest-secondary)] bg-[var(--forest-secondary-container)] text-white shadow-[0_4px_0_0_#006590]',
    shadow: '0 4px 0 0 #2fb8ff',
    Icon: ReceiptText,
  },
  budget: {
    cardClass: 'border-[var(--forest-secondary-container)] bg-[var(--forest-secondary-container)]/5',
    iconWrapClass: 'border-[var(--forest-secondary-container)] bg-white text-[var(--forest-secondary)]',
    buttonClass: 'border-[var(--forest-secondary)] bg-[var(--forest-secondary-container)] text-white shadow-[0_4px_0_0_#006590]',
    shadow: '0 4px 0 0 #2fb8ff',
    Icon: PiggyBank,
  },
  goal: {
    cardClass: 'border-[var(--forest-tertiary-container)] bg-[var(--forest-tertiary-container)]/10',
    iconWrapClass: 'border-[var(--forest-tertiary)] bg-white text-[var(--forest-tertiary)]',
    buttonClass: 'border-[var(--forest-tertiary)] bg-[var(--forest-tertiary-container)] text-white shadow-[0_4px_0_0_#8c5000]',
    shadow: '0 4px 0 0 #ff9c27',
    Icon: Flag,
  },
  complete: {
    cardClass: 'border-[var(--forest-primary-container)] bg-[var(--forest-primary-container)]/10',
    iconWrapClass: 'border-[var(--forest-primary)] bg-white text-[var(--forest-primary)]',
    buttonClass: '',
    shadow: '0 4px 0 0 #58cc02',
    Icon: CheckCircle2,
  },
} as const

export function DailyQuestCard({ quest, onAction }: DailyQuestCardProps) {
  const tone = toneStyles[quest.tone]

  return (
    <section className={cn('rounded-[1.5rem] border-2 p-5', tone.cardClass)} style={{ boxShadow: tone.shadow }}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2', tone.iconWrapClass)}>
          <tone.Icon className="h-5 w-5" />
        </div>

        <div className="w-full space-y-3">
          <div>
            <h2 className="font-quest-heading text-[1.05rem] font-black leading-none text-[var(--forest-foreground)]">{quest.title}</h2>
            <p className="mt-2 text-[12px] leading-tight text-[var(--forest-muted)]">{quest.description}</p>
          </div>

          {quest.ctaLabel ? (
            quest.ctaHref ? (
              <Link
                href={quest.ctaHref}
                className={cn(
                  'inline-flex w-full items-center justify-center rounded-xl border-2 px-4 py-2 text-[12px] font-bold transition-transform hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none',
                  tone.buttonClass
                )}
              >
                {quest.ctaLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className={cn(
                  'inline-flex w-full items-center justify-center rounded-xl border-2 px-4 py-2 text-[12px] font-bold transition-transform hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-none',
                  tone.buttonClass
                )}
              >
                {quest.ctaLabel}
              </button>
            )
          ) : (
            <p className="text-[12px] font-bold text-[var(--forest-primary)]">เคลียร์ครบแล้ว รับ XP ต่อจากกิจกรรมถัดไปได้เลย</p>
          )}
        </div>
      </div>
    </section>
  )
}
