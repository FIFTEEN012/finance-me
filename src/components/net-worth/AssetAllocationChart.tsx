'use client'

import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNetWorthStore } from '@/store/useNetWorthStore'
import { formatCurrency, cn } from '@/lib/utils'
import { ASSET_CATEGORIES, LIABILITY_CATEGORIES } from '@/components/net-worth/NetWorthForm'

/* ─── Rebalancing targets for assets ─────────────────────── */
const ASSET_TARGETS: Record<string, { target: number; label: string }> = {
  savings:     { target: 20, label: 'เงินฝาก' },
  investment:  { target: 40, label: 'การลงทุน' },
  property:    { target: 30, label: 'อสังหาฯ' },
  vehicle:     { target: 5,  label: 'ยานพาหนะ' },
  crypto:      { target: 5,  label: 'คริปโต' },
  other_asset: { target: 0,  label: 'อื่นๆ' },
}

interface SliceData {
  value:   string
  label:   string
  color:   string
  amount:  number
  pct:     number
}

interface CustomTooltipProps {
  active?:  boolean
  payload?: Array<{ payload: SliceData }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">{d.label}</p>
      <p style={{ color: d.color }}>{formatCurrency(d.amount)}</p>
      <p className="text-gray-400 dark:text-gray-500">{d.pct.toFixed(1)}%</p>
    </div>
  )
}

/* ─── Custom legend row ───────────────────────────────────── */
function LegendRow({ d, target }: { d: SliceData; target?: number }) {
  const diff = target !== undefined ? d.pct - target : null

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{d.label}</span>
      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-shrink-0">
        {formatCurrency(d.amount)}
      </span>
      <span className="text-xs text-gray-400 dark:text-gray-500 w-10 text-right flex-shrink-0">
        {d.pct.toFixed(1)}%
      </span>
      {diff !== null && Math.abs(diff) > 3 && (
        <span className={cn('text-[10px] font-medium w-12 text-right flex-shrink-0', diff > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-red-400')}>
          {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
        </span>
      )}
    </div>
  )
}

/* ─── Main component ──────────────────────────────────────── */
export function AssetAllocationChart() {
  const { items } = useNetWorthStore()
  const [view, setView] = useState<'ASSET' | 'LIABILITY'>('ASSET')

  const { slices, total, insights } = useMemo(() => {
    const filtered = items.filter((i) => i.type === view)
    const total = filtered.reduce((s, i) => s + i.amount, 0)
    const catList = view === 'ASSET' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES

    const slices: SliceData[] = catList
      .map((cat) => {
        const amount = filtered.filter((i) => i.category === cat.value).reduce((s, i) => s + i.amount, 0)
        return { value: cat.value, label: cat.label, color: cat.color, amount, pct: total > 0 ? (amount / total) * 100 : 0 }
      })
      .filter((s) => s.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    // Auto insights (assets only)
    const insights: string[] = []
    if (view === 'ASSET' && total > 0) {
      const invest = slices.find((s) => s.value === 'investment')
      const savings = slices.find((s) => s.value === 'savings')
      const crypto = slices.find((s) => s.value === 'crypto')

      if (!invest || invest.pct < 20)
        insights.push(`การลงทุนอยู่ที่ ${invest ? invest.pct.toFixed(0) : 0}% — เป้าหมายที่ดีควรอยู่ที่ 40%+`)
      if (savings && savings.pct > 50)
        insights.push(`เงินฝากสูงถึง ${savings.pct.toFixed(0)}% — ลองพิจารณาย้ายบางส่วนไปลงทุนเพื่อผลตอบแทนที่ดีกว่า`)
      if (crypto && crypto.pct > 20)
        insights.push(`คริปโตคิดเป็น ${crypto.pct.toFixed(0)}% ของสินทรัพย์ — ความเสี่ยงสูง ควรไม่เกิน 10-15%`)
      if (insights.length === 0)
        insights.push('สัดส่วนสินทรัพย์ดูสมดุล — ทำต่อเนื่องไปเรื่อยๆ')
    }

    return { slices, total, insights }
  }, [items, view])

  const assets = items.filter((i) => i.type === 'ASSET')
  const liabilities = items.filter((i) => i.type === 'LIABILITY')
  if (assets.length === 0 && liabilities.length === 0) return null

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          สัดส่วน{view === 'ASSET' ? 'สินทรัพย์' : 'หนี้สิน'}
        </CardTitle>
        {/* Toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
          {(['ASSET', 'LIABILITY'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setView(t)}
              className={cn(
                'px-3 py-1.5 font-medium transition-colors',
                view === t
                  ? t === 'ASSET' ? 'bg-violet-600 text-white' : 'bg-red-500 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              {t === 'ASSET' ? 'สินทรัพย์' : 'หนี้สิน'}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {slices.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            ยังไม่มีข้อมูล{view === 'ASSET' ? 'สินทรัพย์' : 'หนี้สิน'}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Chart + legend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Donut */}
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={slices}
                      dataKey="amount"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={slices.length > 1 ? 3 : 0}
                    >
                      {slices.map((s) => (
                        <Cell key={s.value} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centre label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">รวม</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{formatCurrency(total)}</p>
                </div>
              </div>

              {/* Legend */}
              <div className="overflow-auto max-h-48">
                {slices.map((d) => (
                  <LegendRow
                    key={d.value}
                    d={d}
                    target={view === 'ASSET' ? ASSET_TARGETS[d.value]?.target : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Target reference (assets only) */}
            {view === 'ASSET' && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 flex gap-1 items-center">
                <span className="font-medium">เป้าหมายสัดส่วนแนะนำ:</span>
                {Object.entries(ASSET_TARGETS).filter(([, v]) => v.target > 0).map(([k, v]) => (
                  <span key={k}>{v.label} {v.target}%</span>
                )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ' · ', el], [])}
              </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
              <div className="space-y-1.5">
                {insights.map((text, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                    <Lightbulb className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                    {text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
