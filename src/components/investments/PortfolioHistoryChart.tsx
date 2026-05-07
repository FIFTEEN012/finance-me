'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { useInvestmentStore } from '@/store/useInvestmentStore'

function fmt(n: number) {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `฿${(n / 1_000).toFixed(1)}K`
  return `฿${n.toFixed(0)}`
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

export function PortfolioHistoryChart() {
  const snapshots = useInvestmentStore((s) => s.portfolioSnapshots)

  const data = useMemo(() => {
    if (snapshots.length < 2) return []
    return snapshots.map((s) => ({
      date:  fmtDate(s.date),
      value: Math.round(s.totalValueTHB),
      cost:  Math.round(s.totalCostTHB),
      gl:    Math.round(s.totalValueTHB - s.totalCostTHB),
    }))
  }, [snapshots])

  if (data.length < 2) return null

  const latest = data[data.length - 1]
  const isUp = latest.gl >= 0

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-white/70">ประวัติมูลค่าพอร์ต</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          isUp
            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
        }`}>
          {isUp ? '+' : ''}{latest.gl.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ฿
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
              <stop offset="95%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'rgba(150,150,150,0.7)' }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 10, fill: 'rgba(150,150,150,0.7)' }}
            axisLine={false} tickLine={false} width={56}
          />
          <Tooltip
            formatter={(val, name) => [
              `฿${Number(val ?? 0).toLocaleString('th-TH')}`,
              name === 'value' ? 'มูลค่า' : 'ต้นทุน',
            ]}
            labelStyle={{ fontSize: 11 }}
            contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid rgba(150,150,150,0.15)' }}
          />
          <Area
            type="monotone" dataKey="cost" name="cost"
            stroke="rgba(150,150,150,0.5)" strokeWidth={1.5}
            fill="none" strokeDasharray="4 3"
          />
          <Area
            type="monotone" dataKey="value" name="value"
            stroke={isUp ? '#10b981' : '#ef4444'} strokeWidth={2}
            fill="url(#gradValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 justify-end">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-white/30">
          <span className="inline-block w-4 border-t-2 border-dashed border-gray-300 dark:border-white/20" />
          ต้นทุน
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-white/30">
          <span className={`inline-block w-4 border-t-2 ${isUp ? 'border-emerald-500' : 'border-red-500'}`} />
          มูลค่า
        </span>
      </div>
    </div>
  )
}
