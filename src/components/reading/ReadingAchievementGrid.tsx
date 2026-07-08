'use client'

import { Badge } from '@/components/ui/badge'
import { PressCard } from '@/components/ui/PressCard'
import { cn } from '@/lib/utils'
import type { ReadingAchievement } from '@/types/reading'

interface ReadingAchievementGridProps {
  achievements: ReadingAchievement[]
}

export function ReadingAchievementGrid({
  achievements,
}: ReadingAchievementGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {achievements.map((achievement) => (
        <PressCard
          key={achievement.id}
          shadow="0 5px 0 0 #cbd5e1"
          shadowHover="0 3px 0 0 #cbd5e1"
          className={cn(
            'rounded-3xl border-[3px] p-4 transition-opacity',
            achievement.unlocked
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-500/10'
              : 'border-slate-200 bg-slate-50 opacity-80 dark:border-slate-800 dark:bg-slate-950/40'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white bg-white text-2xl shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {achievement.emoji}
            </div>
            <Badge
              className={cn(
                achievement.unlocked
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {achievement.unlocked ? 'Unlocked' : 'Locked'}
            </Badge>
          </div>
          <h3 className="mt-4 text-base font-black text-slate-900 dark:text-white">
            {achievement.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {achievement.description}
          </p>
        </PressCard>
      ))}
    </div>
  )
}
