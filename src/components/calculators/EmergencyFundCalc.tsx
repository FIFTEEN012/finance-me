'use client'

import { useMemo, useState } from 'react'
import { useTransactionStore } from '@/store/useTransactionStore'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Shield, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'

const COVERAGE_OPTIONS = [
  { months: 3,  label: '3 เดือน',  desc: 'ขั้นต่ำ',        level: 'warning' },
  { months: 6,  label: '6 เดือน',  desc: 'แนะนำ',          level: 'info'    },
  { months: 9,  label: '9 เดือน',  desc: 'ปลอดภัย',        level: 'success' },
  { months: 12, label: '12 เดือน', desc: 'มั่นคงมาก',      level: 'success' },
]

export function EmergencyFundCalc() {
  const { getSumByTypeAndMonth } = useTransactionStore()
  const now = new Date()

  // Average monthly expense from last 3 months
  const avgExpense = useMemo(() => {
    let total = 0
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      total += getSumByTypeAndMonth('EXPENSE', d.getMonth() + 1, d.getFullYear())
    }
    const avg = total / 3
    return avg > 0 ? Math.round(avg) : 20000 // fallback
  }, [getSumByTypeAndMonth])

  const [monthlyExp,  setMonthlyExp]  = useState<number | null>(null)
  const [currentFund, setCurrentFund] = useState(0)
  const [coverageIdx, setCoverageIdx] = useState(1) // 6 months default
  const [monthlySave, setMonthlySave] = useState(5000)

  const expense  = monthlyExp ?? avgExpense
  const coverage = COVERAGE_OPTIONS[coverageIdx]
  const target   = expense * coverage.months
  const gap      = Math.max(0, target - currentFund)
  const progress = Math.min(100, (currentFund / target) * 100)
  const monthsToGoal = monthlySave > 0 ? Math.ceil(gap / monthlySave) : null

  const statusLevel = progress >= 100 ? 'done' : progress >= 50 ? 'halfway' : progress > 0 ? 'started' : 'empty'

  const STATUS = {
    done:     { icon: CheckCircle2, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-200/60 dark:border-violet-500/20', text: 'กองทุนฉุกเฉินครบแล้ว 🎉', sub: 'คุณพร้อมรับมือเหตุฉุกเฉินได้ดี' },
    halfway:  { icon: Shield,       color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-500/10',     border: 'border-blue-200/60 dark:border-blue-500/20',     text: 'เริ่มดีแล้ว ทำต่อไป',             sub: `ยังขาดอีก ${formatCurrency(gap)}` },
    started:  { icon: Zap,          color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200/60 dark:border-orange-500/20', text: 'เพิ่งเริ่มต้น',                   sub: `เป้าหมาย ${coverage.months} เดือนอยู่ที่ ${formatCurrency(target)}` },
    empty:    { icon: AlertTriangle, color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-500/10',       border: 'border-red-200/60 dark:border-red-500/20',       text: 'ยังไม่มีกองทุนฉุกเฉิน',           sub: 'ควรเริ่มออมโดยเร็วที่สุด' },
  }
  const st = STATUS[statusLevel]

  const pct = ((expense - 0) / (100000 - 0)) * 100

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Inputs */}
        <div className="space-y-5">
          {/* Monthly expense — auto-filled or manual */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-white/45">รายจ่ายต่อเดือน</label>
              <span className="text-sm font-bold text-gray-800 dark:text-white/85 num">฿{expense.toLocaleString()}</span>
            </div>
            <input type="range" min={1000} max={100000} step={500} value={expense}
              onChange={e => setMonthlyExp(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #7c3aed ${Math.min(100, pct)}%, oklch(0.905 0.010 270) ${Math.min(100, pct)}%)` }}
            />
            {monthlyExp === null && (
              <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-1">
                ← คำนวณจากรายจ่ายเฉลี่ย 3 เดือนที่แล้ว
              </p>
            )}
          </div>

          {/* Current fund */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-white/45">กองทุนฉุกเฉินปัจจุบัน</label>
              <span className="text-sm font-bold text-gray-800 dark:text-white/85 num">฿{currentFund.toLocaleString()}</span>
            </div>
            <input type="range" min={0} max={Math.max(target * 1.5, 100000)} step={1000} value={currentFund}
              onChange={e => setCurrentFund(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #7c3aed ${Math.min(100, (currentFund / Math.max(target * 1.5, 100000)) * 100)}%, oklch(0.905 0.010 270) ${Math.min(100, (currentFund / Math.max(target * 1.5, 100000)) * 100)}%)` }}
            />
          </div>

          {/* Monthly saving plan */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-white/45">แผนออมต่อเดือน</label>
              <span className="text-sm font-bold text-gray-800 dark:text-white/85 num">฿{monthlySave.toLocaleString()}</span>
            </div>
            <input type="range" min={500} max={50000} step={500} value={monthlySave}
              onChange={e => setMonthlySave(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(to right, #7c3aed ${(monthlySave / 50000) * 100}%, oklch(0.905 0.010 270) ${(monthlySave / 50000) * 100}%)` }}
            />
          </div>

          {/* Coverage selector */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-white/45 mb-2">ระยะคุ้มครองที่ต้องการ</p>
            <div className="grid grid-cols-4 gap-1.5">
              {COVERAGE_OPTIONS.map((opt, i) => (
                <button key={i} onClick={() => setCoverageIdx(i)}
                  className={cn(
                    'flex flex-col items-center py-2 px-1 rounded-lg border text-center transition-colors',
                    i === coverageIdx
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:border-violet-300 dark:hover:border-violet-500/40'
                  )}>
                  <span className="text-xs font-bold">{opt.months}เดือน</span>
                  <span className={cn('text-[9px]', i === coverageIdx ? 'text-white/70' : 'text-gray-400 dark:text-white/25')}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {/* Status banner */}
          <div className={cn('flex items-start gap-3 p-3.5 rounded-xl border', st.bg, st.border)}>
            <st.icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', st.color)} />
            <div>
              <p className={cn('text-xs font-semibold', st.color)}>{st.text}</p>
              <p className="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">{st.sub}</p>
            </div>
          </div>

          {/* Target */}
          <div className="card-accent-violet rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] p-4">
            <p className="text-xs text-gray-400 dark:text-white/40 mb-1">เป้าหมายกองทุนฉุกเฉิน ({coverage.months} เดือน)</p>
            <p className="text-3xl font-bold text-violet-600 dark:text-violet-400 num">{formatCurrency(target)}</p>
          </div>

          {/* Progress */}
          <div className="px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 dark:text-white/40">ความคืบหน้า</p>
              <p className="text-xs font-bold text-violet-600 dark:text-violet-400 num">{Math.min(100, progress).toFixed(1)}%</p>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, progress)}%` }} />
            </div>
          </div>

          {gap > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
                <p className="text-[10px] text-gray-400 dark:text-white/35 mb-0.5">ยังขาดอีก</p>
                <p className="text-sm font-bold text-red-500 num">{formatCurrency(gap)}</p>
              </div>
              <div className="px-3 py-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
                <p className="text-[10px] text-gray-400 dark:text-white/35 mb-0.5">ถึงเป้าใน</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 num">
                  {monthsToGoal ? `${monthsToGoal} เดือน` : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Breakdown per coverage */}
          <div className="rounded-xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[oklch(0.105_0.024_270)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50 dark:border-white/[0.04]">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-white/35 uppercase tracking-wider">เป้าหมายแต่ละระดับ</p>
            </div>
            {COVERAGE_OPTIONS.map((opt, i) => {
              const t = expense * opt.months
              const p = Math.min(100, (currentFund / t) * 100)
              return (
                <div key={i} className="px-4 py-2.5 border-b border-gray-50 dark:border-white/[0.03] last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600 dark:text-white/55">{opt.label} <span className="text-gray-400 dark:text-white/25">({opt.desc})</span></p>
                    <p className="text-xs font-semibold num text-gray-700 dark:text-white/70">{formatCurrency(t)}</p>
                  </div>
                  <div className="h-1 rounded-full bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
                    <div className={cn('h-full rounded-full', p >= 100 ? 'bg-violet-500' : 'bg-violet-300 dark:bg-violet-500/50')}
                      style={{ width: `${p}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
