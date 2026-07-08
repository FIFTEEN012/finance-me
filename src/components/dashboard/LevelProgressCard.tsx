import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LevelProgressData } from './forestDashboard'

interface LevelProgressCardProps {
  progress: LevelProgressData
}

export function LevelProgressCard({ progress }: LevelProgressCardProps) {
  const percent = progress.progressMax > 0 ? Math.round((progress.progressValue / progress.progressMax) * 100) : 0

  return (
    <section className="forest-panel bg-[var(--forest-surface-highest)]/35 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--forest-primary-container)] bg-white shadow-inner">
            <span className="num text-xl font-black text-[var(--forest-primary)]">{progress.level}</span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[var(--forest-tertiary-container)] text-white">
            <Sparkles className="h-3 w-3" />
          </div>
        </div>

        <div>
          <h2 className="font-quest-heading text-[1.1rem] font-black leading-tight text-[var(--forest-foreground)]">
            เลเวลการเงิน
          </h2>
          <p className="text-[11px] font-bold text-[var(--forest-muted)]">{progress.levelTitle}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-tight text-[var(--forest-foreground)]">
          <span>Progress</span>
          <span>{progress.progressLabel}</span>
        </div>
        <div className="forest-progress-track h-2.5">
          <div className="forest-progress-fill h-full rounded-full bg-[var(--forest-primary-container)]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="mt-4 border-t-2 border-[var(--forest-outline-variant)]/15 pt-4">
        <p className="mb-3 text-[12px] font-bold text-[var(--forest-foreground)]">กิจกรรมสัปดาห์นี้</p>
        <div className="flex justify-between px-1">
          {progress.weekDots.map((dot) => (
            <div key={dot.id} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'h-2.5 w-2.5 rounded-full border border-[var(--forest-outline-variant)]/30',
                  dot.active && 'bg-[var(--forest-primary-container)] shadow-[0_1.5px_0_#1b4300]',
                  dot.isToday && !dot.active && 'bg-[var(--forest-surface-low)]'
                )}
              />
              <span className={cn('text-[9px] font-bold', dot.isToday ? 'text-[var(--forest-primary)]' : 'text-[var(--forest-muted)]')}>
                {dot.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
