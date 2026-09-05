'use client'

import { useMemo } from 'react'
import { Sparkles, Heart, Droplets, Leaf, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CurrentCycleInfo, CyclePhase } from '@/types/cycle'

interface CycleWheelProps {
  info: CurrentCycleInfo
  periodLength: number
}

const PHASE_CONFIG: Record<
  CyclePhase,
  {
    name: string
    color: string
    activeBg: string
    activeBorder: string
    textColor: string
    badgeClass: string
    emoji: string
    icon: React.ElementType
  }
> = {
  menstrual: {
    name: 'มีประจำเดือน',
    color: '#f43f5e', // Rose
    activeBg: 'bg-rose-50 dark:bg-rose-950/40',
    activeBorder: 'border-rose-400 dark:border-rose-600',
    textColor: 'text-rose-600 dark:text-rose-400',
    badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300',
    emoji: '🩸',
    icon: Droplets,
  },
  follicular: {
    name: 'ก่อนไข่ตก',
    color: '#10b981', // Emerald / Mint
    activeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    activeBorder: 'border-emerald-400 dark:border-emerald-600',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300',
    emoji: '🌱',
    icon: Leaf,
  },
  ovulation: {
    name: 'ช่วงไข่ตก',
    color: '#a855f7', // Purple
    activeBg: 'bg-purple-50 dark:bg-purple-950/40',
    activeBorder: 'border-purple-400 dark:border-purple-600',
    textColor: 'text-purple-600 dark:text-purple-400',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-300',
    emoji: '✨',
    icon: Sparkles,
  },
  luteal: {
    name: 'ก่อนรอบถัดไป (PMS)',
    color: '#f59e0b', // Amber / Peach
    activeBg: 'bg-amber-50 dark:bg-amber-950/40',
    activeBorder: 'border-amber-400 dark:border-amber-600',
    textColor: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300',
    emoji: '🍂',
    icon: Moon,
  },
}

export function CycleWheel({ info, periodLength }: CycleWheelProps) {
  const {
    dayInCycle,
    totalDays,
    phase,
    phaseNameTh,
    phaseDescription,
    daysUntilNextPeriod,
    ovulationDay,
    fertilityLabelTh,
  } = info

  const radius = 135
  const strokeWidth = 24
  const circumference = 2 * Math.PI * radius
  const center = 170

  // Calculate day ranges for each phase
  const phaseRanges = useMemo(() => {
    const mEnd = periodLength
    const fEnd = Math.max(mEnd + 1, ovulationDay - 2)
    const oEnd = Math.min(totalDays, ovulationDay + 1)
    const lEnd = totalDays

    const mDays = mEnd
    const fDays = Math.max(1, fEnd - mEnd)
    const oDays = Math.max(1, oEnd - fEnd)
    const lDays = Math.max(1, lEnd - oEnd)

    return {
      menstrual: { start: 1, end: mEnd, days: mDays },
      follicular: { start: mEnd + 1, end: fEnd, days: fDays },
      ovulation: { start: fEnd + 1, end: oEnd, days: oDays },
      luteal: { start: oEnd + 1, end: lEnd, days: lDays },
    }
  }, [ovulationDay, periodLength, totalDays])

  // Segment strokeDasharray and offsets
  const segments = useMemo(() => {
    let currentOffset = 0
    const list: Array<{ phase: CyclePhase; length: number; offset: number; color: string }> = []

    const phases: CyclePhase[] = ['menstrual', 'follicular', 'ovulation', 'luteal']

    phases.forEach((p) => {
      const dayCount = phaseRanges[p].days
      const length = (dayCount / totalDays) * circumference
      list.push({
        phase: p,
        length,
        offset: currentOffset,
        color: PHASE_CONFIG[p].color,
      })
      currentOffset += length
    })

    return list
  }, [circumference, phaseRanges, totalDays])

  // Current day pointer position
  const pointerAngle = useMemo(() => {
    // 0 degrees is top (-90 in SVG standard coordinates)
    const fraction = (dayInCycle - 0.5) / totalDays
    return fraction * 360 - 90
  }, [dayInCycle, totalDays])

  const pointerCoords = useMemo(() => {
    const rad = (pointerAngle * Math.PI) / 180
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    }
  }, [center, pointerAngle, radius])

  const currentConfig = PHASE_CONFIG[phase]

  return (
    <div className="flex flex-col items-center">
      {/* Interactive SVG Circular Wheel */}
      <div className="relative flex items-center justify-center p-2">
        <svg
          width={center * 2}
          height={center * 2}
          viewBox={`0 0 ${center * 2} ${center * 2}`}
          className="transform select-none"
        >
          {/* Background Track Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800/80"
          />

          {/* 4 Colored Arcs */}
          {segments.map((seg) => {
            const gap = circumference - seg.length
            return (
              <circle
                key={seg.phase}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${seg.length} ${gap}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-700 ease-out opacity-90 hover:opacity-100"
              />
            )
          })}

          {/* Inner Accent Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 2 - 4}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-slate-300 dark:text-slate-700 opacity-60"
          />

          {/* Current Day Pointer Glow & Dot */}
          <g>
            {/* Outer Glow */}
            <circle
              cx={pointerCoords.x}
              cy={pointerCoords.y}
              r="16"
              fill={currentConfig.color}
              className="animate-pulse opacity-40"
            />
            {/* White Ring */}
            <circle
              cx={pointerCoords.x}
              cy={pointerCoords.y}
              r="11"
              fill="white"
              stroke={currentConfig.color}
              strokeWidth="4"
              className="drop-shadow-md"
            />
            {/* Center Core */}
            <circle
              cx={pointerCoords.x}
              cy={pointerCoords.y}
              r="4"
              fill={currentConfig.color}
            />
          </g>
        </svg>

        {/* Center Content Box */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          {/* Phase Badge */}
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-2 shadow-sm uppercase tracking-wider',
              currentConfig.badgeClass
            )}
          >
            <span>{currentConfig.emoji}</span>
            <span>{currentConfig.name}</span>
          </div>

          {/* Big Day Number */}
          <div className="mt-2 flex items-baseline gap-1 text-slate-900 dark:text-white">
            <span className="text-4xl sm:text-5xl font-black tracking-tight num">
              {dayInCycle}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-400">
              / {totalDays} วัน
            </span>
          </div>

          {/* Countdown / Phase Subtitle */}
          <p className="mt-1 text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 max-w-[170px] leading-tight">
            {phase === 'menstrual'
              ? `ประจำเดือนวันที่ ${dayInCycle}`
              : daysUntilNextPeriod === 1
                ? 'ประจำเดือนจะมาพรุ่งนี้'
                : `อีก ${daysUntilNextPeriod} วันรอบถัดไป`}
          </p>

          {/* Fertility Label */}
          <div className="mt-2 inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
            <span>{fertilityLabelTh}</span>
          </div>
        </div>
      </div>

      {/* 4 Phases Legend Cards */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-xl">
        {(['menstrual', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]).map((p) => {
          const cfg = PHASE_CONFIG[p]
          const isCurrent = phase === p
          const range = phaseRanges[p]

          return (
            <div
              key={p}
              className={cn(
                'flex flex-col items-center p-3 rounded-2xl border-2 transition-all text-center',
                isCurrent
                  ? `${cfg.activeBg} ${cfg.activeBorder} shadow-[0_4px_0_0_rgba(0,0,0,0.06)] scale-[1.02]`
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base">{cfg.emoji}</span>
                <span className={cn('text-xs font-black truncate', isCurrent ? cfg.textColor : 'text-slate-700 dark:text-slate-300')}>
                  {cfg.name}
                </span>
              </div>
              <span className="mt-1 text-[10px] font-bold text-slate-400">
                วัน {range.start}–{range.end}
              </span>
            </div>
          )
        })}
      </div>

      {/* Phase Description Tip Card */}
      <div className="mt-4 w-full max-w-xl rounded-2xl border-2 border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-xl shrink-0', currentConfig.activeBg)}>
            <currentConfig.icon className={cn('h-5 w-5', currentConfig.textColor)} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm text-slate-800 dark:text-slate-200">
              {phaseNameTh}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              {phaseDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
