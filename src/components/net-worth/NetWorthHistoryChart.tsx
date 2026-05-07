'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react'
import { useNetWorthStore } from '@/store/useNetWorthStore'
import { formatCurrency, THAI_MONTHS_SHORT, cn } from '@/lib/utils'
import { NetWorthSnapshot } from '@/types'

/* ── Helpers ─────────────────────────────────────────────────── */

function formatLabel(dateStr: string) {
  const d = new Date(dateStr)
  return `${THAI_MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`
}

function compact(v: number) {
  return new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

/** Latest snapshot per calendar month */
function byMonth(snaps: NetWorthSnapshot[]): NetWorthSnapshot[] {
  const map = new Map<string, NetWorthSnapshot>()
  for (const s of snaps) {
    const key = s.date.slice(0, 7)
    const ex  = map.get(key)
    if (!ex || s.date > ex.date) map.set(key, s)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** Simple linear projection: extend N months using avg monthly Δ of last `window` months */
function project(monthly: NetWorthSnapshot[], ahead = 3, window = 3): NetWorthSnapshot[] {
  if (monthly.length < 2) return []
  const recent = monthly.slice(-Math.min(window, monthly.length))
  const deltas = recent.slice(1).map((s, i) => ({
    nw:  s.netWorth        - recent[i].netWorth,
    a:   s.totalAssets     - recent[i].totalAssets,
    l:   s.totalLiabilities - recent[i].totalLiabilities,
  }))
  const avgNw = deltas.reduce((s, d) => s + d.nw, 0) / deltas.length
  const avgA  = deltas.reduce((s, d) => s + d.a,  0) / deltas.length
  const avgL  = deltas.reduce((s, d) => s + d.l,  0) / deltas.length

  const last = monthly[monthly.length - 1]
  const proj: NetWorthSnapshot[] = []
  for (let i = 1; i <= ahead; i++) {
    const base = new Date(last.date)
    base.setMonth(base.getMonth() + i)
    proj.push({
      date:             base.toISOString().slice(0, 10),
      netWorth:         last.netWorth        + avgNw * i,
      totalAssets:      last.totalAssets     + avgA  * i,
      totalLiabilities: last.totalLiabilities + avgL  * i,
    })
  }
  return proj
}

/* ── Time-range option ───────────────────────────────────────── */

type Range = '3M' | '6M' | '1Y' | '2Y' | 'ALL'
const RANGES: { label: string; value: Range; months: number | null }[] = [
  { label: '3M',  value: '3M',  months: 3   },
  { label: '6M',  value: '6M',  months: 6   },
  { label: '1Y',  value: '1Y',  months: 12  },
  { label: '2Y',  value: '2Y',  months: 24  },
  { label: 'ทั้งหมด', value: 'ALL', months: null },
]

/* ── Tooltip ─────────────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; strokeDasharray?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const isProj = payload[0]?.strokeDasharray !== undefined
  return (
    <div className={cn(
      'rounded-xl shadow-xl border px-3 py-2.5 text-xs space-y-1.5',
      'bg-white dark:bg-[oklch(0.10_0.025_272)]',
      'border-gray-100 dark:border-white/[0.08]',
    )}>
      <p className="font-semibold text-gray-700 dark:text-white/70 flex items-center gap-1.5">
        {label}
        {isProj && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-medium">
            คาดการณ์
          </span>
        )}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span className="text-gray-500 dark:text-white/40">{p.name}</span>
          <span className="font-bold" style={{ color: p.color }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────── */

export function NetWorthHistoryChart() {
  const { snapshots } = useNetWorthStore()
  const [range, setRange]       = useState<Range>('1Y')
  const [showTable, setShowTable] = useState(false)

  const monthly = useMemo(() => byMonth(snapshots), [snapshots])

  const filtered = useMemo(() => {
    const opt = RANGES.find((r) => r.value === range)!
    if (!opt.months) return monthly
    return monthly.slice(-opt.months)
  }, [monthly, range])

  const projected = useMemo(() => project(filtered, 3), [filtered])

  /* Merge: actual + projected, projected points have `proj*` keys */
  const chartData = useMemo(() => {
    const actual = filtered.map((s) => ({
      name:       formatLabel(s.date),
      สินทรัพย์:  s.totalAssets,
      หนี้สิน:    s.totalLiabilities,
      'มูลค่าสุทธิ': s.netWorth,
    }))
    const proj = projected.map((s) => ({
      name:           formatLabel(s.date),
      'คาดการณ์':      s.netWorth,
    }))
    // Bridge: last actual point also has คาดการณ์ value so line connects
    if (actual.length && proj.length) {
      const last = actual[actual.length - 1]
      actual[actual.length - 1] = {
        ...last,
        'คาดการณ์': last['มูลค่าสุทธิ'],
      } as typeof last & { 'คาดการณ์': number }
    }
    return [...actual, ...proj]
  }, [filtered, projected])

  /* Trend vs first/last of range */
  const trend = useMemo(() => {
    if (filtered.length < 2) return null
    const first = filtered[0].netWorth
    const last  = filtered[filtered.length - 1].netWorth
    const diff  = last - first
    const pct   = first !== 0 ? (diff / Math.abs(first)) * 100 : null
    return { diff, pct, last }
  }, [filtered])

  /* MoM deltas */
  const momDeltas = useMemo(() =>
    filtered.slice(1).map((s, i) => ({
      label:  formatLabel(s.date),
      delta:  s.netWorth - filtered[i].netWorth,
    }))
  , [filtered])

  /* Milestones crossed in filtered range */
  const milestones = useMemo(() => {
    const marks: { label: string; y: number }[] = []
    if (filtered.length < 2) return marks
    const min = Math.min(...filtered.map((s) => s.netWorth))
    const max = Math.max(...filtered.map((s) => s.netWorth))

    const checkpoints = [0, 100_000, 500_000, 1_000_000, 5_000_000]
    checkpoints.forEach((v) => {
      if (v >= min && v <= max) {
        if (v === 0) marks.push({ label: '฿0 จุดคุ้มทุน', y: 0 })
        else marks.push({ label: `${compact(v)}`, y: v })
      }
    })
    return marks
  }, [filtered])

  if (filtered.length === 0) return null

  const TrendIcon = !trend ? Minus : trend.diff > 0 ? TrendingUp : trend.diff < 0 ? TrendingDown : Minus
  const trendColor = !trend || trend.diff === 0
    ? 'text-gray-400'
    : trend.diff > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-red-500'

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden',
      'bg-white dark:bg-white/[0.02]',
      'border-gray-200 dark:border-white/[0.07]',
    )}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-white/80">Net Worth Timeline</p>
          {trend && (
            <div className={cn('flex items-center gap-1.5 mt-0.5 text-xs font-medium', trendColor)}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trend.diff >= 0 ? '+' : ''}{formatCurrency(trend.diff)}
              {trend.pct !== null && (
                <span className="text-gray-400 dark:text-white/25 font-normal">
                  ({trend.pct >= 0 ? '+' : ''}{trend.pct.toFixed(1)}%)
                </span>
              )}
              <span className="text-gray-400 dark:text-white/25 font-normal">ในช่วงที่เลือก</span>
            </div>
          )}
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.05]">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                range === r.value
                  ? 'bg-white dark:bg-white/10 text-violet-700 dark:text-violet-300 shadow-sm'
                  : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="px-2 pt-4 pb-2">
        {filtered.length < 2 ? (
          <p className="text-sm text-gray-400 dark:text-white/30 text-center py-12">
            บันทึกข้อมูลอย่างน้อย 2 เดือนเพื่อดูกราฟแนวโน้ม
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradAssets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="gradNW" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6d28d9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6d28d9" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradLiab" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,120,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={compact}
                tick={{ fontSize: 10 }}
                width={52}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

              {/* Milestone reference lines */}
              {milestones.map((m) => (
                <ReferenceLine
                  key={m.y}
                  y={m.y}
                  stroke={m.y === 0 ? '#94a3b8' : '#c4b5fd'}
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{ value: m.label, position: 'insideTopRight', fontSize: 9, fill: '#a78bfa' }}
                />
              ))}

              <Area
                type="monotone"
                dataKey="สินทรัพย์"
                stroke="#10b981"
                strokeWidth={1.5}
                fill="url(#gradAssets)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
              />
              <Area
                type="monotone"
                dataKey="หนี้สิน"
                stroke="#ef4444"
                strokeWidth={1.5}
                fill="url(#gradLiab)"
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />
              <Area
                type="monotone"
                dataKey="มูลค่าสุทธิ"
                stroke="#7c3aed"
                strokeWidth={2.5}
                fill="url(#gradNW)"
                dot={false}
                activeDot={{ r: 5, fill: '#7c3aed' }}
              />
              {/* Projected net worth — dashed */}
              <Area
                type="monotone"
                dataKey="คาดการณ์"
                stroke="#a78bfa"
                strokeWidth={2}
                strokeDasharray="5 4"
                fill="none"
                dot={false}
                activeDot={{ r: 4, fill: '#a78bfa' }}
                legendType="line"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── MoM delta strip ── */}
      {momDeltas.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[11px] font-medium text-gray-400 dark:text-white/25 mb-2">เปลี่ยนแปลงรายเดือน</p>
          <div className="flex gap-1.5 flex-wrap">
            {momDeltas.slice(-8).map(({ label, delta }) => (
              <div
                key={label}
                className={cn(
                  'flex flex-col items-center px-2 py-1 rounded-lg text-center',
                  delta > 0
                    ? 'bg-violet-50 dark:bg-violet-500/10'
                    : delta < 0
                    ? 'bg-red-50 dark:bg-red-500/10'
                    : 'bg-gray-50 dark:bg-white/[0.04]',
                )}
              >
                <span className="text-[9px] text-gray-400 dark:text-white/25">{label}</span>
                <span className={cn(
                  'text-[11px] font-bold',
                  delta > 0 ? 'text-violet-600 dark:text-violet-400' : delta < 0 ? 'text-red-500' : 'text-gray-400',
                )}>
                  {delta >= 0 ? '+' : ''}{compact(delta)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Milestone badge ── */}
      {milestones.some((m) => m.y === 0) && trend && trend.last >= 0 && (
        <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
          <Trophy className="w-4 h-4 text-violet-500 flex-shrink-0" />
          <p className="text-xs text-violet-700 dark:text-violet-300">
            Net Worth ของคุณเป็นบวก — สินทรัพย์มากกว่าหนี้สินแล้ว!
          </p>
        </div>
      )}

      {/* ── Toggle monthly table ── */}
      <div className="border-t border-gray-100 dark:border-white/[0.05]">
        <button
          onClick={() => setShowTable((p) => !p)}
          className="w-full px-5 py-2.5 text-xs font-medium text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/50 text-left flex items-center justify-between transition-colors"
        >
          <span>ตารางข้อมูลรายเดือน ({filtered.length} เดือน)</span>
          <span>{showTable ? '▲ ซ่อน' : '▼ แสดง'}</span>
        </button>

        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-white/[0.03]">
                <tr>
                  {['เดือน', 'สินทรัพย์', 'หนี้สิน', 'มูลค่าสุทธิ', 'เปลี่ยนแปลง'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-gray-500 dark:text-white/30 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                {filtered.map((s, i) => {
                  const prev  = i > 0 ? filtered[i - 1].netWorth : null
                  const delta = prev !== null ? s.netWorth - prev : null
                  return (
                    <tr key={s.date} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-2 text-gray-600 dark:text-white/50">{formatLabel(s.date)}</td>
                      <td className="px-4 py-2 text-violet-600 dark:text-violet-400 font-medium">{formatCurrency(s.totalAssets)}</td>
                      <td className="px-4 py-2 text-red-500 font-medium">{formatCurrency(s.totalLiabilities)}</td>
                      <td className="px-4 py-2 font-bold text-gray-800 dark:text-white/70">{formatCurrency(s.netWorth)}</td>
                      <td className="px-4 py-2">
                        {delta !== null ? (
                          <span className={cn('font-medium', delta >= 0 ? 'text-violet-600 dark:text-violet-400' : 'text-red-500')}>
                            {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
