'use client'

import { useMemo, useState } from 'react'
import { Plus, CreditCard, TrendingDown, Pencil, Trash2, Wallet, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { DebtForm } from '@/components/debt/DebtForm'
import { useDebtStore } from '@/store/useDebtStore'
import { Debt, DebtType } from '@/types'
import { formatCurrency, THAI_MONTHS_SHORT } from '@/lib/utils'
import { cn } from '@/lib/utils'

/* ── Helpers ───────────────────────────────────────────────── */

const DEBT_TYPE_LABEL: Record<DebtType, string> = {
  credit_card:   'บัตรเครดิต',
  personal_loan: 'สินเชื่อส่วนบุคคล',
  mortgage:      'สินเชื่อบ้าน',
  car_loan:      'สินเชื่อรถยนต์',
  student_loan:  'เงินกู้การศึกษา',
  other:         'อื่นๆ',
}

function calcPayoff(balance: number, annualRate: number, payment: number) {
  if (balance <= 0) return { months: 0, totalInterest: 0 }
  if (payment <= 0) return { months: Infinity, totalInterest: Infinity }
  const r = annualRate / 100 / 12
  if (r === 0) return { months: Math.ceil(balance / payment), totalInterest: 0 }
  const minToMakeProgress = balance * r
  if (payment <= minToMakeProgress) return { months: Infinity, totalInterest: Infinity }
  const months = Math.ceil(-Math.log(1 - (balance * r) / payment) / Math.log(1 + r))
  const totalInterest = payment * months - balance
  return { months, totalInterest: Math.max(0, totalInterest) }
}

function payoffDate(months: number): string {
  if (!isFinite(months)) return 'ไม่มีกำหนด'
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })
}

/* ── DebtCard ──────────────────────────────────────────────── */

function DebtCard({ debt, onEdit, onDelete, onPay }: {
  debt: Debt
  onEdit: () => void
  onDelete: () => void
  onPay: (amount: number) => void
}) {
  const [payInput, setPayInput] = useState('')
  const [showPay, setShowPay]   = useState(false)

  const { months, totalInterest } = calcPayoff(debt.currentBalance, debt.interestRate, debt.minPayment)
  const usedPct  = Math.min(100, (debt.currentBalance / debt.totalAmount) * 100)
  const isFinite_ = isFinite(months)

  function submitPay() {
    const amt = parseFloat(payInput)
    if (!isNaN(amt) && amt > 0) {
      onPay(amt)
      setPayInput('')
      setShowPay(false)
    }
  }

  return (
    <PressCard
      shadow={`0 4px 0 0 ${debt.color}99`}
      shadowHover={`0 2px 0 0 ${debt.color}99`}
      className="overflow-hidden"
      style={{ borderColor: debt.color + '80' }}
    >
      {/* Color bar */}
      <div className="h-1" style={{ background: debt.color }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${debt.color}20` }}>
              <CreditCard className="w-4 h-4" style={{ color: debt.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/85 truncate">{debt.name}</p>
              <p className="text-[11px] text-gray-400 dark:text-white/35">{DEBT_TYPE_LABEL[debt.type]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.05]">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-3">
          <div className="flex items-end justify-between mb-1.5">
            <p className="text-2xl font-bold num" style={{ color: debt.color }}>{formatCurrency(debt.currentBalance)}</p>
            <p className="text-xs text-gray-400 dark:text-white/35 num">/ {formatCurrency(debt.totalAmount)}</p>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${usedPct}%`, background: debt.color }} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'ดอกเบี้ย/ปี',  value: `${debt.interestRate}%`                         },
            { label: 'ขั้นต่ำ/เดือน', value: formatCurrency(debt.minPayment)                   },
            { label: 'ปลดหนี้',        value: isFinite_ ? `${months} เดือน` : 'ไม่มีกำหนด'  },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-gray-50 dark:bg-white/[0.03] px-2.5 py-2 text-center">
              <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5">{s.label}</p>
              <p className="text-xs font-bold num text-gray-700 dark:text-white/70 truncate">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Payoff info */}
        {isFinite_ && (
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-gray-400 dark:text-white/35">คาดปลดหนี้: <span className="text-gray-600 dark:text-white/60 font-medium">{payoffDate(months)}</span></span>
            <span className="text-red-500/80">ดอกเบี้ยรวม: <span className="font-semibold num">{formatCurrency(totalInterest)}</span></span>
          </div>
        )}
        {!isFinite_ && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-orange-500">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            ชำระขั้นต่ำไม่พอดอกเบี้ย — ควรเพิ่มยอดชำระ
          </div>
        )}

        {/* Payment input */}
        <div className="mt-3">
          <button onClick={() => setShowPay(!showPay)}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
            {showPay ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            บันทึกการชำระ
          </button>
          {showPay && (
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                value={payInput}
                onChange={e => setPayInput(e.target.value)}
                placeholder="จำนวนเงิน"
                className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] outline-none focus:border-violet-400 num"
                onKeyDown={e => e.key === 'Enter' && submitPay()}
              />
              <Button size="sm" onClick={submitPay} className="bg-violet-600 hover:bg-violet-500 text-white px-3">
                ชำระ
              </Button>
            </div>
          )}
        </div>
      </div>
    </PressCard>
  )
}

/* ── Debt Payoff Planner ───────────────────────────────────── */

type Strategy = 'avalanche' | 'snowball'

interface SimResult {
  months: number
  totalInterest: number
  timeline: { month: number; total: number }[]
  payoffOrder: { id: string; name: string; color: string; month: number }[]
}

function simulateStrategy(debts: Debt[], strategy: Strategy, extra: number): SimResult {
  if (debts.length === 0) return { months: 0, totalInterest: 0, timeline: [], payoffOrder: [] }

  const sorted = [...debts].sort((a, b) =>
    strategy === 'avalanche'
      ? b.interestRate - a.interestRate
      : a.currentBalance - b.currentBalance
  )

  const balances = sorted.map(d => d.currentBalance)
  const paid = new Array(sorted.length).fill(false)
  const payoffOrder: { id: string; name: string; color: string; month: number }[] = []
  const timeline: { month: number; total: number }[] = []
  let totalInterest = 0
  let month = 0
  const MAX_MONTHS = 360

  // Record starting total
  timeline.push({ month: 0, total: sorted.reduce((s, _, i) => s + balances[i], 0) })

  while (balances.some(b => b > 0) && month < MAX_MONTHS) {
    month++
    // Find priority index (first unpaid)
    const priorityIdx = balances.findIndex((b, i) => b > 0 && !paid[i])
    let extraPool = extra

    // Apply interest + minimum payment to all, extra to priority
    for (let i = 0; i < sorted.length; i++) {
      if (paid[i] || balances[i] <= 0) continue
      const r = sorted[i].interestRate / 100 / 12
      const interest = balances[i] * r
      totalInterest += interest
      balances[i] += interest

      let pay = sorted[i].minPayment
      if (i === priorityIdx) {
        pay += extraPool
        extraPool = 0
      }
      balances[i] = Math.max(0, balances[i] - pay)

      if (balances[i] === 0 && !paid[i]) {
        paid[i] = true
        payoffOrder.push({ id: sorted[i].id, name: sorted[i].name, color: sorted[i].color, month })
        // cascade freed minimum to extra pool
        extraPool += sorted[i].minPayment
      }
    }

    timeline.push({ month, total: Math.max(0, balances.reduce((s, b) => s + b, 0)) })
  }

  return {
    months: month >= MAX_MONTHS && balances.some(b => b > 0) ? Infinity : month,
    totalInterest,
    timeline,
    payoffOrder,
  }
}

function payoffMonthLabel(month: number): string {
  if (!isFinite(month)) return 'ไม่มีกำหนด'
  const d = new Date()
  d.setMonth(d.getMonth() + month)
  return `เดือนที่ ${month} — ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function payoffDateStr(month: number): string {
  if (!isFinite(month)) return 'ไม่มีกำหนด'
  const d = new Date()
  d.setMonth(d.getMonth() + month)
  return `${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function DebtPayoffPlanner({ debts }: { debts: Debt[] }) {
  const [extra, setExtra] = useState(0)
  const [selected, setSelected] = useState<Strategy>('avalanche')

  const avalanche = useMemo(() => simulateStrategy(debts, 'avalanche', extra), [debts, extra])
  const snowball  = useMemo(() => simulateStrategy(debts, 'snowball',  extra), [debts, extra])

  if (debts.length === 0) return null

  const avalancheBetter = isFinite(avalanche.totalInterest) && isFinite(snowball.totalInterest)
    ? avalanche.totalInterest <= snowball.totalInterest
    : true
  const saving = Math.abs(avalanche.totalInterest - snowball.totalInterest)

  const maxMonths = Math.max(
    isFinite(avalanche.months) ? avalanche.months : 0,
    isFinite(snowball.months)  ? snowball.months  : 0,
  )

  // Merge timelines for chart
  const chartData = useMemo(() => {
    const pts: { month: number; avalanche: number; snowball: number }[] = []
    for (let m = 0; m <= maxMonths; m++) {
      const av = avalanche.timeline.find(t => t.month === m)
      const sn = snowball.timeline.find(t => t.month === m)
      pts.push({
        month: m,
        avalanche: av?.total ?? 0,
        snowball:  sn?.total ?? 0,
      })
    }
    return pts
  }, [avalanche.timeline, snowball.timeline, maxMonths])

  const selectedResult = selected === 'avalanche' ? avalanche : snowball

  const avalancheCardClass = cn(
    'flex-1 rounded-xl border p-4 cursor-pointer transition-all',
    selected === 'avalanche'
      ? 'border-violet-400 bg-violet-50'
      : 'border-gray-200 bg-white hover:border-gray-300'
  )

  const snowballCardClass = cn(
    'flex-1 rounded-xl border p-4 cursor-pointer transition-all',
    selected === 'snowball'
      ? 'border-blue-400 bg-blue-50'
      : 'border-gray-200 bg-white hover:border-gray-300'
  )

  return (
    <PressCard
      shadow="0 4px 0 0 #d1d5db"
      shadowHover="0 2px 0 0 #d1d5db"
      className="border-gray-200 bg-white p-5 space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">แผนปลดหนี้</h3>
          <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">เปรียบเทียบกลยุทธ์ Avalanche vs Snowball</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-400 dark:text-white/35 whitespace-nowrap">ชำระพิเศษ/เดือน</label>
          <input
            type="number"
            value={extra || ''}
            onChange={e => setExtra(Math.max(0, Number(e.target.value) || 0))}
            placeholder="0"
            className="w-28 text-sm font-bold text-gray-700 dark:text-white/70 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 outline-none focus:border-violet-400 num"
          />
        </div>
      </div>

      {/* Side-by-side cards */}
      <div className="flex gap-3">
        {/* Avalanche */}
        <div
          className={avalancheCardClass}
          style={selected === 'avalanche' ? { boxShadow: '0 3px 0 0 #4c1d95' } : { boxShadow: '0 3px 0 0 #d1d5db' }}
          onClick={() => setSelected('avalanche')}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-violet-600 dark:text-violet-400">⚡ Avalanche</p>
            {avalancheBetter && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 font-semibold">
                ประหยัดกว่า {formatCurrency(saving)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-white/35 mb-0.5">เวลาปลดหนี้</p>
          <p className="text-xl font-bold num text-violet-600 dark:text-violet-400 mb-2">
            {isFinite(avalanche.months) ? `${avalanche.months} เดือน` : 'ไม่มีกำหนด'}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-white/35 mb-0.5">ดอกเบี้ยรวม</p>
          <p className="text-sm font-semibold num text-red-500 mb-2">{formatCurrency(avalanche.totalInterest)}</p>
          <p className="text-[10px] text-gray-400 dark:text-white/35 mb-0.5">วันปลดหนี้</p>
          <p className="text-xs font-medium text-gray-700 dark:text-white/70">{payoffDateStr(avalanche.months)}</p>
        </div>

        {/* Snowball */}
        <div
          className={snowballCardClass}
          style={selected === 'snowball' ? { boxShadow: '0 3px 0 0 #1d4ed8' } : { boxShadow: '0 3px 0 0 #d1d5db' }}
          onClick={() => setSelected('snowball')}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">❄️ Snowball</p>
            {!avalancheBetter && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 font-semibold">
                ประหยัดกว่า {formatCurrency(saving)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-white/35 mb-0.5">เวลาปลดหนี้</p>
          <p className="text-xl font-bold num text-blue-600 dark:text-blue-400 mb-2">
            {isFinite(snowball.months) ? `${snowball.months} เดือน` : 'ไม่มีกำหนด'}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-white/35 mb-0.5">ดอกเบี้ยรวม</p>
          <p className="text-sm font-semibold num text-red-500 mb-2">{formatCurrency(snowball.totalInterest)}</p>
          <p className="text-[10px] text-gray-400 dark:text-white/35 mb-0.5">วันปลดหนี้</p>
          <p className="text-xs font-medium text-gray-700 dark:text-white/70">{payoffDateStr(snowball.months)}</p>
        </div>
      </div>

      {/* Timeline chart */}
      {chartData.length > 1 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 dark:text-white/35 uppercase tracking-wider mb-3">ยอดหนี้คงเหลือตามเวลา</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgb(156,163,175)' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}ด.`} interval={Math.max(1, Math.floor(maxMonths / 6))} />
              <YAxis tick={{ fontSize: 10, fill: 'rgb(156,163,175)' }} axisLine={false} tickLine={false} width={70}
                tickFormatter={v => `฿${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value)), name === 'avalanche' ? '⚡ Avalanche' : '❄️ Snowball']}
                labelFormatter={label => `เดือนที่ ${label}`}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}
              />
              <Line type="monotone" dataKey="avalanche" stroke="#7c3aed" strokeWidth={2} dot={false} name="avalanche" />
              <Line type="monotone" dataKey="snowball" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 3" dot={false} name="snowball" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payoff order for selected strategy */}
      {selectedResult.payoffOrder.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 dark:text-white/35 uppercase tracking-wider mb-3">
            ลำดับปลดหนี้ ({selected === 'avalanche' ? '⚡ Avalanche' : '❄️ Snowball'})
          </p>
          <div className="space-y-2">
            {selectedResult.payoffOrder.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                <span className="text-xs font-bold text-gray-400 dark:text-white/30 w-5 text-right">{idx + 1}</span>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <p className="text-sm font-medium text-gray-700 dark:text-white/70 flex-1 truncate">{item.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-white/40 num whitespace-nowrap">{payoffMonthLabel(item.month)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PressCard>
  )
}

/* ── Page ──────────────────────────────────────────────────── */

export default function DebtPage() {
  const { debts, deleteDebt, makePayment } = useDebtStore()
  const [formOpen,     setFormOpen]     = useState(false)
  const [editingDebt,  setEditingDebt]  = useState<Debt | null>(null)
  const [confirmId,    setConfirmId]    = useState<string | null>(null)

  const totalBalance  = debts.reduce((s, d) => s + d.currentBalance, 0)
  const totalMin      = debts.reduce((s, d) => s + d.minPayment, 0)
  const avgRate       = debts.length > 0
    ? debts.reduce((s, d) => s + d.interestRate * d.currentBalance, 0) / totalBalance
    : 0

  function handleEdit(debt: Debt) { setEditingDebt(debt); setFormOpen(true) }
  function handleAdd()             { setEditingDebt(null); setFormOpen(true) }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Debt Tracker</h2>
          <p className="text-sm text-gray-400 dark:text-white/40">ติดตามและวางแผนชำระหนี้ทุกประเภท</p>
        </div>
        <Button onClick={handleAdd} className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white h-9">
          <Plus className="w-4 h-4" />เพิ่มหนี้
        </Button>
      </div>

      {/* Summary */}
      {debts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* หนี้รวมทั้งหมด — rose */}
          <PressCard shadow="0 5px 0 0 #9f1239" shadowHover="0 3px 0 0 #9f1239" className="border-rose-400 bg-rose-500 p-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">หนี้รวมทั้งหมด</p>
            <p className="text-white font-black text-xl leading-none num">{formatCurrency(totalBalance)}</p>
          </PressCard>

          {/* ชำระขั้นต่ำรวม/เดือน — violet */}
          <PressCard shadow="0 5px 0 0 #4c1d95" shadowHover="0 3px 0 0 #4c1d95" className="border-violet-400 bg-violet-500 p-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">ชำระขั้นต่ำรวม/เดือน</p>
            <p className="text-white font-black text-xl leading-none num">{formatCurrency(totalMin)}</p>
          </PressCard>

          {/* ดอกเบี้ยเฉลี่ย — blue */}
          <PressCard shadow="0 5px 0 0 #1d4ed8" shadowHover="0 3px 0 0 #1d4ed8" className="border-blue-400 bg-blue-500 p-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">ดอกเบี้ยเฉลี่ย (weighted)</p>
            <p className="text-white font-black text-xl leading-none num">{avgRate.toFixed(1)}%</p>
          </PressCard>
        </div>
      )}

      {/* Empty state */}
      {debts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center">
            <CreditCard className="w-7 h-7 text-gray-300 dark:text-white/20" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-white/40">ยังไม่มีหนี้ที่บันทึกไว้</p>
          <p className="text-xs text-gray-400 dark:text-white/30">เพิ่มหนี้เพื่อเริ่มวางแผนการชำระ</p>
          <Button onClick={handleAdd} className="mt-2 gap-1.5 bg-violet-600 hover:bg-violet-500 text-white">
            <Plus className="w-4 h-4" />เพิ่มหนี้แรก
          </Button>
        </div>
      )}

      {/* Debt cards */}
      {debts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {debts.map(debt => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onEdit={() => handleEdit(debt)}
              onPay={(amount) => makePayment(debt.id, amount)}
              onDelete={() => setConfirmId(debt.id)}
            />
          ))}
        </div>
      )}

      {/* Debt Payoff Planner */}
      <DebtPayoffPlanner debts={debts} />

      {/* Confirm delete */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmId(null)} />
          <div className="relative bg-white dark:bg-[oklch(0.105_0.024_270)] rounded-2xl p-6 shadow-xl max-w-sm w-full border border-gray-200 dark:border-white/[0.08]">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">ลบหนี้นี้?</h3>
            <p className="text-xs text-gray-500 dark:text-white/40 mb-4">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmId(null)}>ยกเลิก</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={() => { deleteDebt(confirmId); setConfirmId(null) }}>ลบ</Button>
            </div>
          </div>
        </div>
      )}

      <DebtForm open={formOpen} onOpenChange={setFormOpen} editingDebt={editingDebt} />
    </div>
  )
}
