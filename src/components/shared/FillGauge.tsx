'use client'

import { useId, type KeyboardEvent, type ReactNode } from 'react'
import type { SupplyShape } from '@/types'
import { cn } from '@/lib/utils'

/** Everything the gauge can draw: the Water Bottle plus the seven Supply Shapes. */
export type GaugeShape = 'water' | SupplyShape

interface Geometry {
  /** Outline of the container (SVG path, viewBox 0 0 100 140). */
  body: string
  /** Liquid range in viewBox y: `top` = full, `bottom` = empty. */
  top: number
  bottom: number
  /** Caps and rims drawn over the body. Classes: fg-cap (solid part), fg-ink (outline-coloured), fg-line (stroke only). */
  parts: ReactNode
  color: string
}

function zigzagSachet(): string {
  let d = 'M18 22'
  for (let i = 0; i < 8; i++) d += ' l4 -5 l4 5'
  d += ' v96'
  for (let i = 0; i < 8; i++) d += ' l-4 5 l-4 -5'
  return d + ' z'
}

const GEOM: Record<GaugeShape, Geometry> = {
  water: {
    body: 'M36 26 h28 v6 q16 6 16 22 v14 q-5 7 0 14 v40 q0 14 -14 14 h-32 q-14 0 -14 -14 v-40 q5 -7 0 -14 v-14 q0 -16 16 -22 z',
    top: 32,
    bottom: 136,
    color: '#0ea5e9',
    parts: <rect className="fg-cap" x={38} y={8} width={24} height={18} rx={4} />,
  },
  bottle: {
    body: 'M38 28 h24 v8 q16 4 16 18 v70 q0 12 -12 12 h-32 q-12 0 -12 -12 v-70 q0 -14 16 -18 z',
    top: 36,
    bottom: 136,
    color: '#8b5cf6',
    parts: (
      <g className="fg-cap">
        <rect x={46} y={6} width={18} height={5} rx={2} />
        <rect x={47} y={10} width={6} height={8} />
        <rect x={40} y={17} width={20} height={11} rx={3} />
      </g>
    ),
  },
  tube: {
    body: 'M18 14 h64 l-8 92 q-1 8 -9 8 h-30 q-8 0 -9 -8 z',
    top: 14,
    bottom: 114,
    color: '#14b8a6',
    parts: (
      <g className="fg-cap">
        <rect x={15} y={4} width={70} height={11} rx={2} />
        <rect x={40} y={114} width={20} height={20} rx={4} />
      </g>
    ),
  },
  bag: {
    body: 'M28 22 h44 q6 10 12 26 q8 22 8 46 v28 q0 12 -12 12 h-60 q-12 0 -12 -12 v-28 q0 -24 8 -46 q6 -16 12 -26 z',
    top: 22,
    bottom: 134,
    color: '#f59e0b',
    parts: <rect className="fg-cap" x={25} y={9} width={50} height={13} rx={4} />,
  },
  box: {
    body: 'M14 34 h72 v96 q0 6 -6 6 h-60 q-6 0 -6 -6 z',
    top: 34,
    bottom: 136,
    color: '#f43f5e',
    parts: (
      <>
        <path className="fg-handle" d="M40 22 q10 -22 20 0" />
        <rect className="fg-cap" x={10} y={22} width={80} height={13} rx={3} />
      </>
    ),
  },
  roll: {
    body: 'M20 28 v92 a30 10 0 0 0 60 0 v-92 z',
    top: 28,
    bottom: 130,
    color: '#a8a29e',
    parts: (
      <>
        <ellipse className="fg-cap" cx={50} cy={28} rx={30} ry={10} />
        <ellipse className="fg-ink" cx={50} cy={28} rx={9} ry={3.5} />
      </>
    ),
  },
  can: {
    body: 'M22 26 a28 8 0 0 1 56 0 v94 a28 8 0 0 1 -56 0 z',
    top: 24,
    bottom: 128,
    color: '#f97316',
    parts: (
      <>
        <ellipse className="fg-cap" cx={50} cy={26} rx={28} ry={8} />
        <rect className="fg-ink" x={44} y={22} width={14} height={5} rx={2} />
      </>
    ),
  },
  sachet: {
    body: zigzagSachet(),
    top: 22,
    bottom: 118,
    color: '#84cc16',
    parts: <line className="fg-line" x1={30} y1={34} x2={70} y2={34} strokeDasharray="4 4" />,
  },
}

// Colours live in CSS so the `.dark` class (next-themes) can swap them; motion is switched off
// for users who ask the OS for reduced motion.
const GAUGE_CSS = `
.fill-gauge .fg-glass-0 { stop-color: #ffffff; stop-opacity: .55 }
.fill-gauge .fg-glass-1 { stop-color: #e2e8f0; stop-opacity: .25 }
.fill-gauge .fg-glass-2 { stop-color: #cbd5e1; stop-opacity: .5 }
.fill-gauge .fg-body { stroke: #94a3b8 }
.fill-gauge .fg-cap { fill: #64748b; stroke: #475569; stroke-width: 1 }
.fill-gauge .fg-ink { fill: #475569; stroke: #475569; stroke-width: 1 }
.fill-gauge .fg-line { stroke: #475569; stroke-width: 1 }
.fill-gauge .fg-handle { fill: #ffffff; stroke: #475569; stroke-width: 1 }
.fill-gauge .fg-shine { fill: #ffffff; opacity: .5 }
.fill-gauge .fg-unknown { fill: #94a3b8 }
.dark .fill-gauge .fg-glass-0 { stop-color: #475569; stop-opacity: .45 }
.dark .fill-gauge .fg-glass-1 { stop-color: #1e293b; stop-opacity: .3 }
.dark .fill-gauge .fg-glass-2 { stop-color: #334155; stop-opacity: .55 }
.dark .fill-gauge .fg-body { stroke: #64748b }
.dark .fill-gauge .fg-cap { fill: #94a3b8; stroke: #cbd5e1 }
.dark .fill-gauge .fg-ink { fill: #cbd5e1; stroke: #cbd5e1 }
.dark .fill-gauge .fg-line { stroke: #cbd5e1 }
.dark .fill-gauge .fg-handle { fill: #1e293b; stroke: #cbd5e1 }
.dark .fill-gauge .fg-shine { opacity: .25 }
.dark .fill-gauge .fg-unknown { fill: #64748b }
@keyframes fgWave { from { transform: translateX(0) } to { transform: translateX(50px) } }
.fill-gauge .fg-liquid { transition: transform .7s cubic-bezier(.3,1.4,.5,1) }
.fill-gauge .fg-wave { animation: fgWave 2.4s linear infinite }
.fill-gauge .fg-wave-slow { animation: fgWave 4s linear infinite reverse }
@media (prefers-reduced-motion: reduce) {
  .fill-gauge .fg-wave, .fill-gauge .fg-wave-slow { animation: none }
  .fill-gauge .fg-liquid { transition: none }
  .fill-gauge.fg-tappable { transition: none }
}
`

const WAVE = 'M-100 0 q12.5 -5 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V200 H-100 Z'
const WAVE_SLOW = 'M-100 2 q12.5 -4 25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 t25 0 V200 H-100 Z'

export interface FillGaugeProps {
  shape: GaugeShape
  /** How full, 0..1 (clamped). `null` = unknown: drawn empty with a "?". */
  level: number | null
  className?: string
  /** Makes the gauge a button (click, Enter or Space). */
  onClick?: () => void
  /** Overrides the default "เหลือ N%" accessible name. */
  label?: string
}

/**
 * Realistic glass fill gauge (prototype variant A): moving water surface, soft highlight and a
 * springy level change. Badges such as "เกินเป้า" or "ควรซื้อเพิ่ม" belong outside the gauge.
 */
export function FillGauge({ shape, level, className, onClick, label }: FillGaugeProps) {
  const id = useId().replace(/:/g, '')
  const g = GEOM[shape]
  const lv = level === null || Number.isNaN(level) ? null : Math.max(0, Math.min(1, level))
  const liquidY = lv === null ? g.bottom : g.top + (1 - lv) * (g.bottom - g.top)
  const clip = `fg-clip-${id}`
  const glass = `fg-glass-${id}`
  const liquid = `fg-liq-${id}`

  const onKeyDown = onClick
    ? (e: KeyboardEvent<SVGSVGElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }
    : undefined

  return (
    <svg
      viewBox="0 0 100 140"
      className={cn(
        'fill-gauge overflow-visible',
        onClick && 'fg-tappable cursor-pointer transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-500 rounded-lg',
        className,
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : 'img'}
      aria-label={label ?? (lv === null ? 'ยังไม่ทราบระดับ' : `เหลือ ${Math.round(lv * 100)}%`)}
    >
      <style>{GAUGE_CSS}</style>
      <defs>
        <clipPath id={clip}>
          <path d={g.body} />
        </clipPath>
        <linearGradient id={glass} x1="0" x2="1">
          <stop className="fg-glass-0" offset="0" />
          <stop className="fg-glass-1" offset="0.5" />
          <stop className="fg-glass-2" offset="1" />
        </linearGradient>
        <linearGradient id={liquid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={g.color} stopOpacity="0.75" />
          <stop offset="1" stopColor={g.color} />
        </linearGradient>
      </defs>
      <path className="fg-body" d={g.body} fill={`url(#${glass})`} strokeWidth={1.5} />
      <g clipPath={`url(#${clip})`}>
        <g className="fg-liquid" style={{ transform: `translateY(${liquidY}px)` }}>
          <path className="fg-wave" d={WAVE} fill={`url(#${liquid})`} />
          <path className="fg-wave-slow" d={WAVE_SLOW} fill={g.color} opacity={0.35} />
        </g>
        <rect className="fg-shine" x={26} y={g.top} width={6} height={(g.bottom - g.top) * 0.7} rx={3} />
      </g>
      {g.parts}
      {lv === null && (
        <text className="fg-unknown" x={50} y={(g.top + g.bottom) / 2 + 8} textAnchor="middle" fontSize={26} fontWeight={800}>
          ?
        </text>
      )}
    </svg>
  )
}
