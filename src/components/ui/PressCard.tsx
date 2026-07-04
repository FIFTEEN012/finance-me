'use client'

/**
 * Duolingo-style 3-D pressable card components
 * Used in: Dashboard, and any page that wants the gamified feel
 */

import { cn } from '@/lib/utils'
import { Flame, CheckCircle2, Circle, ChevronRight, Zap } from 'lucide-react'

/* ─── PressCard ─────────────────────────────────────────────
   Core primitive. thick bottom shadow + translateY on hover/active  */

export interface PressCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** e.g. "0 5px 0 0 #4c1d95" */
  shadow: string
  shadowHover?: string
  onClick?: () => void
}

export function PressCard({ children, className, style, shadow, shadowHover, onClick }: PressCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border-2 border-slate-200 dark:border-slate-800 transition-all duration-100 ease-out select-none bg-white dark:bg-slate-900',
        onClick && 'cursor-pointer',
        'hover:-translate-y-0.5 active:translate-y-1',
        className,
      )}
      style={{ boxShadow: shadow, ...style }}
      onMouseEnter={(e) => { if (shadowHover) (e.currentTarget as HTMLElement).style.boxShadow = shadowHover }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = shadow }}
      onMouseDown={(e)  => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
      onMouseUp={(e)    => { (e.currentTarget as HTMLElement).style.boxShadow = shadow }}
    >
      {children}
    </div>
  )
}

/* ─── XpBar ─────────────────────────────────────────────────── */

export function XpBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="w-full h-5 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

/* ─── WeekDot ───────────────────────────────────────────────── */

export function WeekDot({ label, active, today }: { label: string; active: boolean; today?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
        today
          ? 'bg-amber-400 border-amber-500 text-white scale-110'
          : active
            ? 'bg-emerald-400 border-emerald-500 text-white'
            : 'bg-gray-100 border-gray-200 text-gray-400',
      )}>
        {active && !today ? '✓' : today ? <Flame className="w-4 h-4" /> : '·'}
      </div>
      <span className="text-[10px] font-semibold text-gray-400">{label}</span>
    </div>
  )
}

/* ─── ChallengeCard ─────────────────────────────────────────── */

export interface ChallengeCardProps {
  icon: React.ElementType
  title: string
  subtitle: string
  xp: number
  done: boolean
  color: string
  borderColor: string
  shadow: string
  href?: string
}

export function ChallengeCard({ icon: Icon, title, subtitle, xp, done, color, borderColor, shadow }: ChallengeCardProps) {
  return (
    <PressCard
      shadow={done ? '0 4px 0 0 #d1d5db' : shadow}
      shadowHover={done ? '0 2px 0 0 #d1d5db' : undefined}
      className={cn('flex items-center gap-4 px-5 py-4', done ? 'border-gray-200 bg-gray-50' : 'bg-white')}
      style={{ borderColor: done ? '#e5e7eb' : borderColor }}
      onClick={() => {}}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: done ? '#f3f4f6' : `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color: done ? '#9ca3af' : color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('font-bold text-sm leading-tight', done ? 'text-gray-400 line-through' : 'text-gray-800')}>
          {title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
          done ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-600',
        )}>
          <Zap className="w-3 h-3" />
          {xp} XP
        </div>
        {done
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <ChevronRight className="w-5 h-5 text-gray-300" />
        }
      </div>
    </PressCard>
  )
}

/* ─── AchievCard ────────────────────────────────────────────── */

export function AchievCard({
  label, value, unit, icon: Icon, borderColor, shadowColor, iconBg, iconColor,
}: {
  label: string; value: string; unit?: string
  icon: React.ElementType
  borderColor: string; shadowColor: string; iconBg: string; iconColor: string
}) {
  return (
    <PressCard
      shadow={`0 4px 0 0 ${shadowColor}`}
      shadowHover={`0 2px 0 0 ${shadowColor}`}
      className="p-4 bg-white flex flex-col gap-3"
      style={{ borderColor }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: iconBg }}>
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-800 leading-none mt-0.5 num">
          {value}
          {unit && <span className="text-sm font-semibold text-gray-400 ml-1">{unit}</span>}
        </p>
      </div>
    </PressCard>
  )
}
