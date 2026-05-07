'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useNetWorthStore } from '@/store/useNetWorthStore'
import { formatCurrency, cn } from '@/lib/utils'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/90 backdrop-blur-xl px-3 py-2 shadow-xl">
      <p className="text-[11px] text-white/50 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-white num">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function NetWorthSparkline({ className }: { className?: string }) {
  const { snapshots, items } = useNetWorthStore()

  // Current net worth from items
  const totalAssets      = items.filter((i) => i.type === 'ASSET').reduce((s, i) => s + i.amount, 0)
  const totalLiabilities = items.filter((i) => i.type === 'LIABILITY').reduce((s, i) => s + i.amount, 0)
  const netWorth         = totalAssets - totalLiabilities

  const chartData = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
    // Take last 12 points (or fewer)
    const recent = sorted.slice(-12)
    return recent.map((s) => ({
      date:  new Date(s.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
      value: s.netWorth,
    }))
  }, [snapshots])

  // Trend: compare first vs last snapshot
  const trend = useMemo(() => {
    if (chartData.length < 2) return 0
    return chartData[chartData.length - 1].value - chartData[0].value
  }, [chartData])

  const isPositive = trend >= 0

  const gradientId = 'nwGradient'

  return (
    <div className={cn(
      'rounded-2xl border',
      'border-gray-100 bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:backdrop-blur-xl',
      'shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_4px_20px_rgba(0,0,0,0.3)]',
      'p-5',
      className,
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium text-gray-400 dark:text-white/40 uppercase tracking-wider mb-1">
            Net Worth
          </p>
          <p className="text-2xl font-bold num text-gray-900 dark:text-white leading-none">
            {formatCurrency(netWorth)}
          </p>
        </div>

        {chartData.length >= 2 && (
          <div className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
            isPositive
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="num">{formatCurrency(Math.abs(trend))}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length < 2 ? (
        <div className="flex flex-col items-center justify-center h-28 text-center">
          <Minus className="w-6 h-6 text-gray-200 dark:text-white/20 mb-2" />
          <p className="text-xs text-gray-400 dark:text-white/30">บันทึก Net Worth หลายครั้งเพื่อดูกราฟ</p>
        </div>
      ) : (
        <div className="h-28 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'currentColor', className: 'text-gray-400 dark:text-white/30' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
