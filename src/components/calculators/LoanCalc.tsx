'use client'

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CreditCard, AlertCircle } from 'lucide-react'

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

export function LoanCalc() {
  const [loanAmount,   setLoanAmount]   = useState(500000)
  const [annualRate,   setAnnualRate]   = useState(6)
  const [termMonths,   setTermMonths]   = useState(60)
  const [showTable,    setShowTable]    = useState(false)

  const result = useMemo(() => {
    if (annualRate === 0) {
      const monthly = loanAmount / termMonths
      return { monthly, totalPayment: loanAmount, totalInterest: 0, interestRatio: 0, schedule: [] }
    }
    const r = annualRate / 100 / 12
    const n = termMonths
    const monthly = loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    const totalPayment = monthly * n
    const totalInterest = totalPayment - loanAmount

    // First 12 months + last 3 months amortization
    const schedule: { month: number; payment: number; principal: number; interest: number; balance: number }[] = []
    let balance = loanAmount
    for (let i = 1; i <= n; i++) {
      const interestPay  = balance * r
      const principalPay = monthly - interestPay
      balance = Math.max(0, balance - principalPay)
      if (i <= 12 || i > n - 3) {
        schedule.push({ month: i, payment: monthly, principal: principalPay, interest: interestPay, balance })
      }
    }

    return {
      monthly, totalPayment, totalInterest,
      interestRatio: totalInterest / loanAmount * 100,
      schedule,
    }
  }, [loanAmount, annualRate, termMonths])

  const chartData = [
    { name: 'เงินต้น',       value: loanAmount,          fill: 'rgba(99,102,241,0.75)' },
    { name: 'ดอกเบี้ยรวม',  value: result.totalInterest, fill: 'rgba(239,68,68,0.65)'  },
  ]

  const years = Math.floor(termMonths / 12)
  const months = termMonths % 12

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Inputs */}
        <div className="space-y-5">
          <Slider label="วงเงินกู้" value={loanAmount} min={10000} max={5000000} step={10000}
            format={v => `฿${v.toLocaleString()}`} onChange={setLoanAmount} />
          <Slider label="อัตราดอกเบี้ยต่อปี" value={annualRate} min={0} max={30} step={0.25}
            unit="%" onChange={setAnnualRate} />
          <Slider label="ระยะเวลาผ่อน" value={termMonths} min={6} max={360} step={6}
            format={v => {
              const y = Math.floor(v/12), m = v%12
              return y > 0 && m > 0 ? `${y}ปี ${m}เดือน` : y > 0 ? `${y} ปี` : `${m} เดือน`
            }}
            onChange={setTermMonths} />

          <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-500/8 border border-orange-200/60 dark:border-orange-500/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">อัตราส่วนดอกเบี้ย</p>
            </div>
            <p className="text-xs text-orange-600/80 dark:text-orange-300/70">
              คุณจ่ายดอกเบี้ยรวม <strong>{result.interestRatio.toFixed(1)}%</strong> ของเงินต้น
              ตลอด{years > 0 ? ` ${years} ปี` : ''}{months > 0 ? ` ${months} เดือน` : ''}
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="card-accent-violet rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] p-4">
            <p className="text-xs text-gray-400 dark:text-white/40 mb-1">ผ่อนต่อเดือน</p>
            <p className="text-3xl font-bold text-violet-600 dark:text-violet-400 num">{formatCurrency(result.monthly)}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-400 dark:text-white/35">รวม {termMonths} งวด</p>
            </div>
          </div>

          {[
            { label: 'ยอดชำระรวมทั้งหมด',  value: result.totalPayment,  color: 'text-gray-800 dark:text-white/80' },
            { label: 'ดอกเบี้ยรวมทั้งหมด', value: result.totalInterest, color: 'text-red-500' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
              <p className="text-xs text-gray-500 dark:text-white/40">{item.label}</p>
              <p className={cn('text-sm font-bold num', item.color)}>{formatCurrency(item.value)}</p>
            </div>
          ))}

          {/* Principal vs Interest chart */}
          <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
            <p className="text-[10px] text-gray-400 dark:text-white/35 mb-2">สัดส่วนเงินต้น vs ดอกเบี้ย</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'rgb(156,163,175)' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Amortization toggle */}
      <div>
        <button onClick={() => setShowTable(!showTable)}
          className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
          {showTable ? '▲ ซ่อนตารางผ่อนชำระ' : '▼ ดูตารางผ่อนชำระ'}
        </button>

        {showTable && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.06]">
                  {['งวด', 'ผ่อน/เดือน', 'เงินต้น', 'ดอกเบี้ย', 'คงเหลือ'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-gray-400 dark:text-white/35 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((row, i) => {
                  const isGap = i === 12 && result.schedule.length > 13
                  return (
                    <>
                      {isGap && (
                        <tr key="gap">
                          <td colSpan={5} className="text-center py-2 text-gray-300 dark:text-white/20 text-[10px]">· · ·</td>
                        </tr>
                      )}
                      <tr key={row.month} className="border-b border-gray-50 dark:border-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="py-1.5 px-2 text-gray-500 dark:text-white/40">{row.month}</td>
                        <td className="py-1.5 px-2 num text-gray-700 dark:text-white/70">{formatCurrency(row.payment)}</td>
                        <td className="py-1.5 px-2 num text-blue-600 dark:text-blue-400">{formatCurrency(row.principal)}</td>
                        <td className="py-1.5 px-2 num text-red-500">{formatCurrency(row.interest)}</td>
                        <td className="py-1.5 px-2 num text-gray-600 dark:text-white/60">{formatCurrency(row.balance)}</td>
                      </tr>
                    </>
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
