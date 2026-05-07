'use client'

import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Target, CheckCircle2, Clock } from 'lucide-react'

function Slider({ label, value, min, max, step, unit, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number
  unit?: string; onChange: (v: number) => void; format?: (v: number) => string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-500 dark:text-white/45">{label}</label>
        <span className="text-sm font-bold text-gray-800 dark:text-white/85 num">
          {format ? format(value) : value.toLocaleString()}{unit && <span className="text-xs text-gray-400 ml-0.5">{unit}</span>}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #7c3aed ${pct}%, oklch(0.905 0.010 270) ${pct}%)` }}
      />
      <div className="flex justify-between text-[9px] text-gray-300 dark:text-white/20 mt-0.5">
        <span>{min.toLocaleString()}</span><span>{max.toLocaleString()}</span>
      </div>
    </div>
  )
}

const RETURN_RATES = [0, 3, 5, 7]
const RATE_COLORS  = ['#9ca3af', '#6366f1', '#8b5cf6', '#7c3aed']

export function SavingsGoalCalc() {
  const [target,   setTarget]   = useState(500000)
  const [current,  setCurrent]  = useState(50000)
  const [months,   setMonths]   = useState(36)

  const gap = Math.max(0, target - current)

  const scenarios = useMemo(() =>
    RETURN_RATES.map((annualRate, idx) => {
      const r = annualRate / 100 / 12
      let monthly: number
      if (r === 0) {
        monthly = gap / months
      } else {
        monthly = gap * r / (Math.pow(1 + r, months) - 1)
      }

      // Chart: balance over time
      const data: { month: number; balance: number }[] = []
      let bal = current
      for (let m = 0; m <= months; m++) {
        if (m > 0) {
          bal = bal * (1 + r) + monthly
        }
        if (m % 3 === 0 || m === months) {
          data.push({ month: m, balance: Math.round(bal) })
        }
      }

      return { annualRate, monthly: Math.max(0, monthly), data, color: RATE_COLORS[idx] }
    }), [target, current, months, gap])

  const mainScenario = scenarios[0]
  const progress = Math.min(100, (current / target) * 100)

  const years  = Math.floor(months / 12)
  const remMon = months % 12
  const durationLabel = years > 0 && remMon > 0
    ? `${years} ปี ${remMon} เดือน`
    : years > 0 ? `${years} ปี` : `${months} เดือน`

  const fmtCompact = (v: number) =>
    new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Inputs */}
        <div className="space-y-5">
          <Slider label="เป้าหมายออม" value={target} min={10000} max={5000000} step={10000}
            format={v => `฿${v.toLocaleString()}`} onChange={setTarget} />
          <Slider label="ออมแล้วตอนนี้" value={current} min={0} max={target} step={1000}
            format={v => `฿${v.toLocaleString()}`} onChange={v => setCurrent(Math.min(v, target))} />
          <Slider label="ระยะเวลา" value={months} min={3} max={120} step={3}
            format={() => durationLabel} onChange={setMonths} />

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-500 dark:text-white/45">ความคืบหน้า</p>
              <p className="text-xs font-bold text-violet-600 dark:text-violet-400 num">{progress.toFixed(1)}%</p>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-300 dark:text-white/20 mt-1">
              <span>฿{current.toLocaleString()}</span>
              <span>฿{target.toLocaleString()}</span>
            </div>
          </div>

          {gap === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-500/20">
              <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">ถึงเป้าหมายแล้ว!</p>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="space-y-3">
          <div className="card-accent-violet rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] p-4">
            <p className="text-xs text-gray-400 dark:text-white/40 mb-1">ออมต่อเดือน (ไม่มีดอกเบี้ย)</p>
            <p className="text-3xl font-bold text-violet-600 dark:text-violet-400 num">
              {formatCurrency(mainScenario.monthly)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-400 dark:text-white/35">ภายใน {durationLabel}</p>
            </div>
          </div>

          {/* Comparison by return rate */}
          <div className="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50 dark:border-white/[0.04]">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-white/35 uppercase tracking-wider">
                เปรียบเทียบตามผลตอบแทน
              </p>
            </div>
            {scenarios.map(s => (
              <div key={s.annualRate} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 dark:border-white/[0.03] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <p className="text-xs text-gray-500 dark:text-white/40">
                    {s.annualRate === 0 ? 'ไม่มีดอกเบี้ย' : `${s.annualRate}% ต่อปี`}
                  </p>
                </div>
                <p className="text-xs font-bold num text-gray-700 dark:text-white/75">
                  {formatCurrency(s.monthly)}<span className="font-normal text-gray-400">/เดือน</span>
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
            <Target className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500 dark:text-white/40">
              ยังขาดอีก <span className="font-bold text-gray-700 dark:text-white/70 num">{formatCurrency(gap)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Growth chart */}
      {gap > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-white/35 uppercase tracking-wider mb-3">
            เส้นทางสู่เป้าหมาย (เทียบผลตอบแทนต่างๆ)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart margin={{ left: 0, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="month" type="number" domain={[0, months]}
                tick={{ fontSize: 10, fill: 'rgb(156,163,175)' }} axisLine={false} tickLine={false}
                tickFormatter={v => v === 0 ? 'เริ่ม' : `เดือน ${v}`} ticks={[0, Math.round(months/2), months]} />
              <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10, fill: 'rgb(156,163,175)' }}
                axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={v => `เดือนที่ ${v}`}
                contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <ReferenceLine y={target} stroke="rgba(124,58,237,0.3)" strokeDasharray="5 3"
                label={{ value: 'เป้าหมาย', fontSize: 10, fill: 'rgba(124,58,237,0.6)', position: 'right' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {scenarios.map(s => (
                <Line key={s.annualRate} data={s.data} dataKey="balance"
                  name={s.annualRate === 0 ? 'ไม่มีดอกเบี้ย' : `${s.annualRate}%/ปี`}
                  stroke={s.color} strokeWidth={s.annualRate === 0 ? 1.5 : 2}
                  dot={false} activeDot={{ r: 3 }}
                  strokeDasharray={s.annualRate === 0 ? '4 3' : '0'} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
