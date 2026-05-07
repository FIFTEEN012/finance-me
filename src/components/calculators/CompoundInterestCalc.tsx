'use client'

import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

const FREQ_OPTIONS = [
  { label: 'รายปี',      value: 1  },
  { label: 'รายไตรมาส', value: 4  },
  { label: 'รายเดือน',   value: 12 },
  { label: 'รายวัน',     value: 365 },
]

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
      <input
        type="range" min={min} max={max} step={step} value={value}
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

export function CompoundInterestCalc() {
  const [principal,    setPrincipal]    = useState(100000)
  const [rate,         setRate]         = useState(5)
  const [years,        setYears]        = useState(10)
  const [monthly,      setMonthly]      = useState(2000)
  const [freqIdx,      setFreqIdx]      = useState(2) // monthly

  const freq = FREQ_OPTIONS[freqIdx].value

  const result = useMemo(() => {
    const r  = rate / 100
    const n  = freq
    const t  = years
    const rn = r / n

    const chartData: { year: number; principal: number; contributions: number; interest: number }[] = []
    let total = principal

    for (let y = 1; y <= t; y++) {
      // Balance after y years with monthly contributions
      const contributed = monthly * 12 * y
      const futureP = principal * Math.pow(1 + rn, n * y)
      const futurePMT = monthly * (Math.pow(1 + r / 12, 12 * y) - 1) / (r / 12)
      total = futureP + futurePMT
      chartData.push({
        year: y,
        principal: Math.round(principal),
        contributions: Math.round(contributed),
        interest: Math.round(total - principal - contributed),
      })
    }

    const finalContributions = monthly * 12 * years
    return {
      total:         Math.round(total),
      interest:      Math.round(total - principal - finalContributions),
      contributions: Math.round(finalContributions),
      chartData,
      multiplier:    total / (principal + finalContributions),
    }
  }, [principal, rate, years, monthly, freq])

  const fmtCompact = (v: number) =>
    new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-5">
          <Slider label="เงินต้นเริ่มต้น" value={principal} min={0} max={1000000} step={5000}
            format={v => `฿${v.toLocaleString()}`} onChange={setPrincipal} />
          <Slider label="อัตราดอกเบี้ยต่อปี" value={rate} min={0.5} max={20} step={0.5}
            unit="%" onChange={setRate} />
          <Slider label="ระยะเวลา" value={years} min={1} max={40} step={1}
            unit="ปี" onChange={setYears} />
          <Slider label="ออมเพิ่มต่อเดือน" value={monthly} min={0} max={50000} step={500}
            format={v => `฿${v.toLocaleString()}`} onChange={setMonthly} />

          {/* Frequency pills */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-white/45 mb-2">ทบดอกเบี้ย</p>
            <div className="flex gap-1.5 flex-wrap">
              {FREQ_OPTIONS.map((opt, i) => (
                <button key={i} onClick={() => setFreqIdx(i)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    i === freqIdx
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:border-violet-300 dark:hover:border-violet-500/40'
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result cards */}
        <div className="space-y-3">
          <div className="card-accent-violet rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] p-4">
            <p className="text-xs text-gray-400 dark:text-white/40 mb-1">มูลค่าทั้งหมดเมื่อครบกำหนด</p>
            <p className="text-3xl font-bold text-violet-600 dark:text-violet-400 num">{formatCurrency(result.total)}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
              <p className="text-xs text-violet-500">เงินงอก {result.multiplier.toFixed(2)}x</p>
            </div>
          </div>

          {[
            { label: 'เงินต้น + ออมสะสม', value: principal + result.contributions, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'ดอกเบี้ยที่ได้รับ', value: result.interest, color: 'text-violet-600 dark:text-violet-400' },
            { label: 'ออมสะสมทั้งหมด', value: result.contributions, color: 'text-gray-600 dark:text-white/70' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
              <p className="text-xs text-gray-500 dark:text-white/40">{item.label}</p>
              <p className={cn('text-sm font-bold num', item.color)}>{formatCurrency(item.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-white/35 uppercase tracking-wider mb-3">การเติบโตรายปี</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={result.chartData} margin={{ left: 0, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'rgb(156,163,175)' }} axisLine={false} tickLine={false}
              tickFormatter={v => `ปี ${v}`} />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10, fill: 'rgb(156,163,175)' }} axisLine={false} tickLine={false} width={48} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }}
              labelFormatter={v => `ปีที่ ${v}`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="principal"     name="เงินต้น"        stackId="1" stroke="#6366f1" fill="rgba(99,102,241,0.15)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="contributions" name="ออมสะสม"        stackId="1" stroke="#8b5cf6" fill="rgba(139,92,246,0.20)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="interest"      name="ดอกเบี้ยสะสม"  stackId="1" stroke="#7c3aed" fill="rgba(124,58,237,0.30)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
