'use client'

import { useMemo } from 'react'
import { Banknote, CalendarDays, PartyPopper, Flame, Clock, TrendingUp } from 'lucide-react'
import { PressCard } from '@/components/ui/PressCard'
import { useSettingsStore } from '@/store/useSettingsStore'
import { cn } from '@/lib/utils'

/* ── Helpers ──────────────────────────────────────────────── */

function clampDay(year: number, month: number, day: number): Date {
  const maxDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, maxDay))
}

function calcCountdown(paydayDate: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const d = today.getDate()
  const m = today.getMonth()
  const y = today.getFullYear()

  // Next payday
  let nextPayday: Date
  if (d < paydayDate) {
    nextPayday = clampDay(y, m, paydayDate)
  } else if (d === paydayDate) {
    nextPayday = clampDay(y, m, paydayDate)          // today!
  } else {
    nextPayday = clampDay(y, m + 1, paydayDate)      // next month
  }

  const daysLeft = Math.round(
    (nextPayday.getTime() - today.getTime()) / 86_400_000,
  )

  // Last payday (for cycle progress)
  let lastPayday: Date
  if (d >= paydayDate) {
    lastPayday = clampDay(y, m, paydayDate)
  } else {
    lastPayday = clampDay(y, m - 1, paydayDate)
  }

  const cycleDays  = Math.round((nextPayday.getTime() - lastPayday.getTime()) / 86_400_000)
  const elapsed    = Math.round((today.getTime() - lastPayday.getTime()) / 86_400_000)
  const progress   = cycleDays > 0 ? Math.min(100, Math.round((elapsed / cycleDays) * 100)) : 0

  return { daysLeft, nextPayday, lastPayday, cycleDays, elapsed, progress }
}

/* ── Mood palette ─────────────────────────────────────────── */

interface Mood {
  bg:          string
  border:      string
  shadow:      string
  accent:      string
  barColor:    string
  label:       string
  emoji:       string
  message:     string
}

function getMood(days: number): Mood {
  if (days === 0) return {
    bg:       'bg-emerald-500', border: 'border-emerald-400', shadow: '0 5px 0 0 #065f46',
    accent:   'text-white',     barColor: '#34d399',
    label:    'วันนี้เลย!',    emoji:   '🎉',
    message:  'เงินเดือนออกวันนี้แล้ว! ยินดีด้วย 🥳',
  }
  if (days === 1) return {
    bg:       'bg-emerald-500', border: 'border-emerald-400', shadow: '0 5px 0 0 #065f46',
    accent:   'text-white',     barColor: '#34d399',
    label:    'วัน',            emoji:   '🔥',
    message:  'พรุ่งนี้เงินเดือนออกแล้ว! เกือบถึงแล้ว!',
  }
  if (days <= 3) return {
    bg:       'bg-emerald-500', border: 'border-emerald-400', shadow: '0 5px 0 0 #065f46',
    accent:   'text-white',     barColor: '#34d399',
    label:    'วัน',            emoji:   '⚡',
    message:  `อีก ${days} วันก็ถึงแล้ว! ยืนหยัดอีกนิดนึง!`,
  }
  if (days <= 7) return {
    bg:       'bg-amber-500',   border: 'border-amber-400', shadow: '0 5px 0 0 #92400e',
    accent:   'text-white',     barColor: '#fbbf24',
    label:    'วัน',            emoji:   '💪',
    message:  `ใกล้แล้ว อีก ${days} วันก็ถึงวันเงินเดือนแล้ว!`,
  }
  if (days <= 14) return {
    bg:       'bg-violet-500',  border: 'border-violet-400', shadow: '0 5px 0 0 #4c1d95',
    accent:   'text-white',     barColor: '#a78bfa',
    label:    'วัน',            emoji:   '🎯',
    message:  'บันทึกรายจ่ายทุกวัน แล้วเงินเดือนจะมาถึงเร็วขึ้น!',
  }
  return {
    bg:       'bg-violet-500',  border: 'border-violet-400', shadow: '0 5px 0 0 #4c1d95',
    accent:   'text-white',     barColor: '#a78bfa',
    label:    'วัน',            emoji:   '🌱',
    message:  'ออมทุกวัน ใช้จ่ายฉลาด แล้วทุกอย่างจะดีขึ้น!',
  }
}

/* ── Digit block ──────────────────────────────────────────── */

function DigitBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="bg-white/25 border-2 border-white/40 rounded-2xl px-3 py-1.5 min-w-[60px] text-center">
        <span className="text-4xl font-black text-white num leading-none tabular-nums">{value}</span>
      </div>
      <span className="text-white/60 text-[11px] font-bold uppercase tracking-wider">{label}</span>
    </div>
  )
}

/* ── Progress bar ─────────────────────────────────────────── */

function CycleBar({ progress, barColor }: { progress: number; barColor: string }) {
  return (
    <div className="w-full">
      <div className="h-3 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */

export function PaydayCountdown() {
  const paydayDate = useSettingsStore((s) => s.paydayDate)

  const { daysLeft, nextPayday, progress, cycleDays, elapsed } = useMemo(
    () => calcCountdown(paydayDate),
    // recompute once per render (date changes on refresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paydayDate],
  )

  const mood = getMood(daysLeft)

  const nextDateStr = nextPayday.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const isPayday = daysLeft === 0

  return (
    <PressCard
      shadow={mood.shadow}
      shadowHover={mood.shadow.replace('0 5px', '0 3px')}
      className={cn('overflow-hidden p-0', mood.border, mood.bg)}
    >
      {/* Top strip */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
            {isPayday
              ? <PartyPopper className="w-5 h-5 text-white" />
              : <Banknote className="w-5 h-5 text-white" />
            }
          </div>
          <div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider leading-none">
              นับถอยหลัง
            </p>
            <p className="text-white font-black text-sm leading-tight">วันเงินเดือน</p>
          </div>
        </div>

        {/* Payday date badge */}
        <div className="flex items-center gap-1.5 bg-white/20 border border-white/30 rounded-full px-3 py-1">
          <CalendarDays className="w-3.5 h-3.5 text-white/70" />
          <span className="text-white text-xs font-bold">{nextDateStr}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-white/15" />

      {/* Main body */}
      <div className="px-5 py-4">
        {isPayday ? (
          /* ── Payday celebration ── */
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="text-5xl">🎉</div>
            <div className="text-center">
              <p className="text-white font-black text-2xl leading-tight">เงินเดือนออกวันนี้!</p>
              <p className="text-white/70 text-sm font-semibold mt-1">ยินดีด้วยนะ ขอให้ใช้อย่างฉลาด 💪</p>
            </div>
          </div>
        ) : (
          /* ── Normal countdown ── */
          <div className="flex items-center gap-5">
            {/* Big number */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="bg-white/25 border-2 border-white/40 rounded-2xl px-4 py-2 min-w-[80px] text-center">
                <span className="text-5xl font-black text-white num leading-none tabular-nums">
                  {daysLeft}
                </span>
              </div>
              <span className="text-white/60 text-[11px] font-black uppercase tracking-wider mt-1.5">
                {mood.label}
              </span>
            </div>

            {/* Right: message + meta */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none flex-shrink-0">{mood.emoji}</span>
                <p className="text-white font-black text-sm leading-snug">{mood.message}</p>
              </div>
              <div className="flex items-center gap-2 text-white/60 text-[11px] font-semibold">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>วงรอบ {cycleDays} วัน · ผ่านมาแล้ว {elapsed} วัน</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {!isPayday && (
          <div className="mt-4 space-y-1.5">
            <CycleBar progress={progress} barColor={mood.barColor} />
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-white/50">เริ่มต้น</span>
              <span className="text-white/80">{progress}% ผ่านมาแล้ว</span>
              <span className="text-white/50 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                เงินเดือนใหม่
              </span>
            </div>
          </div>
        )}
      </div>
    </PressCard>
  )
}
