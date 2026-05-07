'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// Thai personal income tax brackets 2024
const TAX_BRACKETS = [
  { min: 0,         max: 150_000,     rate: 0   },
  { min: 150_000,   max: 300_000,     rate: 0.05 },
  { min: 300_000,   max: 500_000,     rate: 0.10 },
  { min: 500_000,   max: 750_000,     rate: 0.15 },
  { min: 750_000,   max: 1_000_000,   rate: 0.20 },
  { min: 1_000_000, max: 2_000_000,   rate: 0.25 },
  { min: 2_000_000, max: 5_000_000,   rate: 0.30 },
  { min: 5_000_000, max: Infinity,    rate: 0.35 },
]

function calcTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  let tax = 0
  for (const b of TAX_BRACKETS) {
    if (taxableIncome <= b.min) break
    const slice = Math.min(taxableIncome, b.max) - b.min
    tax += slice * b.rate
  }
  return tax
}

function marginalRate(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    if (taxableIncome > TAX_BRACKETS[i].min) return TAX_BRACKETS[i].rate
  }
  return 0
}

const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const num = (v: string) => { const n = parseFloat(v.replace(/,/g, '')); return isNaN(n) ? 0 : n }

function NumberInput({ label, value, onChange, hint, max }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; max?: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm text-gray-700 dark:text-white/70">{label}</Label>
        {hint && <span className="text-[10px] text-gray-400 dark:text-white/30">{hint}</span>}
      </div>
      <Input
        type="number"
        min={0}
        max={max}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="text-right"
      />
    </div>
  )
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
    </div>
  )
}

export function TaxCalc() {
  // Income
  const [incomeType, setIncomeType] = useState<'401' | '402'>('401')
  const [grossIncome, setGrossIncome]   = useState('')

  // Allowances
  const [hasSpouse,    setHasSpouse]    = useState(false)
  const [children,     setChildren]     = useState('0')
  const [parents,      setParents]      = useState('0')    // ทั้งสองฝ่าย max 4
  const [disabled,     setDisabled]     = useState('0')    // คนพิการ 60,000 each

  // Insurance & fund deductions
  const [socialSec,    setSocialSec]    = useState('')   // ประกันสังคม max 9,000
  const [lifeIns,      setLifeIns]      = useState('')   // ประกันชีวิต max 100,000
  const [healthIns,    setHealthIns]    = useState('')   // ประกันสุขภาพตนเอง max 25,000
  const [parentHealth, setParentHealth] = useState('')   // ประกันสุขภาพพ่อแม่ max 15,000
  const [rmf,          setRmf]          = useState('')   // RMF 30% income max 500,000
  const [ssf,          setSsf]          = useState('')   // SSF 30% income max 200,000
  const [thaiesg,      setThaiesg]      = useState('')   // Thai ESG 30% income max 300,000
  const [homeLoan,     setHomeLoan]     = useState('')   // ดอกเบี้ยบ้าน max 100,000
  const [donation,     setDonation]     = useState('')   // บริจาคทั่วไป max 10% net income

  const income = num(grossIncome)

  const result = useMemo(() => {
    if (income <= 0) return null

    // 1. Expense deduction (ค่าใช้จ่าย)
    const expenseDeduction = incomeType === '401'
      ? Math.min(income * 0.5, 100_000)
      : Math.min(income * 0.5, 100_000)

    // 2. Personal & family allowances
    const personalAllowance  = 60_000
    const spouseAllowance    = hasSpouse ? 60_000 : 0
    const childAllowance     = Math.min(parseInt(children) || 0, 3) * 30_000
    const parentAllowance    = Math.min(parseInt(parents)  || 0, 4) * 30_000
    const disabledAllowance  = (parseInt(disabled) || 0) * 60_000

    // 3. Insurance / fund deductions (capped)
    const socialSecDed   = Math.min(num(socialSec),    9_000)
    const lifeInsDed     = Math.min(num(lifeIns),    100_000)
    const healthInsDed   = Math.min(num(healthIns),   25_000)
    const parentHealthDed = Math.min(num(parentHealth), 15_000)

    const incomeForFund  = income
    const rmfDed   = Math.min(num(rmf),    incomeForFund * 0.30, 500_000)
    const ssfDed   = Math.min(num(ssf),    incomeForFund * 0.30, 200_000)
    const thaiesgDed = Math.min(num(thaiesg), incomeForFund * 0.30, 300_000)
    // SSF + Thai ESG combined cap 500,000 (but counted separately by RD as of 2024)
    const fundDeductionTotal = rmfDed + ssfDed + thaiesgDed

    const homeLoanDed = Math.min(num(homeLoan), 100_000)

    const totalDeductions =
      expenseDeduction +
      personalAllowance + spouseAllowance + childAllowance + parentAllowance + disabledAllowance +
      socialSecDed + lifeInsDed + healthInsDed + parentHealthDed +
      fundDeductionTotal + homeLoanDed

    // 4. Net income before donation
    const netBeforeDonation = Math.max(income - totalDeductions, 0)

    // 5. Donation (general): max 10% of net income before donation
    const donationDed = Math.min(num(donation), netBeforeDonation * 0.10)

    const taxableIncome = Math.max(netBeforeDonation - donationDed, 0)
    const tax = calcTax(taxableIncome)
    const effectiveRate = income > 0 ? (tax / income) * 100 : 0
    const marginal = marginalRate(taxableIncome) * 100

    return {
      expenseDeduction,
      personalAllowance,
      spouseAllowance,
      childAllowance,
      parentAllowance,
      disabledAllowance,
      socialSecDed,
      lifeInsDed,
      healthInsDed,
      parentHealthDed,
      fundDeductionTotal,
      rmfDed, ssfDed, thaiesgDed,
      homeLoanDed,
      donationDed,
      totalDeductions: totalDeductions + donationDed,
      taxableIncome,
      tax,
      effectiveRate,
      marginal,
    }
  }, [income, incomeType, hasSpouse, children, parents, disabled,
      socialSec, lifeIns, healthIns, parentHealth, rmf, ssf, thaiesg, homeLoan, donation])

  return (
    <div className="space-y-5">
      {/* Income section */}
      <Section title="รายได้" defaultOpen>
        <div>
          <Label className="text-sm mb-2 block">ประเภทรายได้ (มาตรา)</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: '401', label: 'ม.40(1)', desc: 'เงินเดือน/ค่าจ้าง' },
              { id: '402', label: 'ม.40(2)', desc: 'ฟรีแลนซ์/วิชาชีพอิสระ' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setIncomeType(t.id as '401' | '402')}
                className={cn(
                  'flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                  incomeType === t.id
                    ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                )}
              >
                <span className={cn('text-xs font-bold', incomeType === t.id ? 'text-violet-600 dark:text-violet-400' : 'text-gray-600 dark:text-white/60')}>{t.label}</span>
                <span className="text-[11px] text-gray-400 dark:text-white/30">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <NumberInput
          label="รายได้รวมทั้งปี (บาท)"
          value={grossIncome}
          onChange={setGrossIncome}
          hint="ก่อนหักภาษี ณ ที่จ่าย"
        />
        {income > 0 && (
          <p className="text-xs text-gray-400 dark:text-white/30">
            ค่าใช้จ่ายหักได้ (50%, สูงสุด ฿100,000) = ฿{fmt(Math.min(income * 0.5, 100_000))}
          </p>
        )}
      </Section>

      {/* Allowances */}
      <Section title="ค่าลดหย่อนส่วนตัวและครอบครัว">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-white/[0.03]">
            <span className="text-sm text-gray-700 dark:text-white/70">ลดหย่อนส่วนตัว</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">฿60,000</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-white/70">มีคู่สมรส (ไม่มีรายได้)</span>
            <button
              type="button"
              onClick={() => setHasSpouse((v) => !v)}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative',
                hasSpouse ? 'bg-violet-500' : 'bg-gray-200 dark:bg-white/10'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                hasSpouse ? 'translate-x-6' : 'translate-x-0.5'
              )} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumberInput label="บุตร (คน)" value={children} onChange={setChildren} hint="max 3 · ฿30K/คน" />
            <NumberInput label="พ่อแม่ (คน)" value={parents} onChange={setParents} hint="max 4 · ฿30K/คน" />
            <NumberInput label="คนพิการ (คน)" value={disabled} onChange={setDisabled} hint="฿60K/คน" />
          </div>
        </div>
      </Section>

      {/* Insurance */}
      <Section title="ประกันและกองทุน">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="ประกันสังคม" value={socialSec} onChange={setSocialSec} hint="max ฿9,000" max={9000} />
          <NumberInput label="ประกันชีวิต" value={lifeIns} onChange={setLifeIns} hint="max ฿100,000" max={100000} />
          <NumberInput label="ประกันสุขภาพ (ตนเอง)" value={healthIns} onChange={setHealthIns} hint="max ฿25,000" max={25000} />
          <NumberInput label="ประกันสุขภาพ (พ่อแม่)" value={parentHealth} onChange={setParentHealth} hint="max ฿15,000" max={15000} />
        </div>
      </Section>

      {/* Investment funds */}
      <Section title="กองทุนเพื่อการลงทุน (ลดหย่อนภาษี)">
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2 mb-2">
          รวม RMF + SSF + Thai ESG ต้องไม่เกิน 500,000 บาท และแต่ละกองทุนไม่เกิน 30% ของเงินได้
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumberInput label="RMF" value={rmf} onChange={setRmf} hint="30% · max ฿500K" />
          <NumberInput label="SSF" value={ssf} onChange={setSsf} hint="30% · max ฿200K" />
          <NumberInput label="Thai ESG" value={thaiesg} onChange={setThaiesg} hint="30% · max ฿300K" />
        </div>
      </Section>

      {/* Other deductions */}
      <Section title="ค่าลดหย่อนอื่นๆ">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="ดอกเบี้ยบ้าน" value={homeLoan} onChange={setHomeLoan} hint="max ฿100,000" max={100000} />
          <NumberInput label="บริจาคทั่วไป" value={donation} onChange={setDonation} hint="max 10% รายได้สุทธิ" />
        </div>
      </Section>

      {/* Result */}
      {result && income > 0 && (
        <div className="rounded-2xl border border-violet-100 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/10 p-5 space-y-4">
          <p className="text-sm font-bold text-violet-700 dark:text-violet-300">ผลการคำนวณ</p>

          {/* Breakdown */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-white/60">
              <span>รายได้รวม</span>
              <span className="font-medium">฿{fmt(income)}</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-white/40 text-xs">
              <span>ค่าลดหย่อนรวม</span>
              <span>- ฿{fmt(result.totalDeductions)}</span>
            </div>
            <div className="border-t border-violet-200 dark:border-violet-500/20 pt-1.5 flex justify-between font-semibold text-gray-700 dark:text-white/70">
              <span>รายได้สุทธิ (เสียภาษี)</span>
              <span>฿{fmt(result.taxableIncome)}</span>
            </div>
          </div>

          {/* Tax result */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-white/[0.05] rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 dark:text-white/30 mb-1">ภาษีที่ต้องจ่าย</p>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">฿{fmt(result.tax)}</p>
            </div>
            <div className="bg-white dark:bg-white/[0.05] rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 dark:text-white/30 mb-1">อัตราภาษีจริง</p>
              <p className="text-lg font-bold text-gray-700 dark:text-white/70">{result.effectiveRate.toFixed(2)}%</p>
            </div>
            <div className="bg-white dark:bg-white/[0.05] rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 dark:text-white/30 mb-1">อัตราขั้นสูงสุด</p>
              <p className="text-lg font-bold text-gray-700 dark:text-white/70">{result.marginal.toFixed(0)}%</p>
            </div>
          </div>

          {/* Tax bracket breakdown */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500 dark:text-white/40 mb-2">ขั้นภาษีที่เสีย</p>
            {TAX_BRACKETS.filter((b) => result.taxableIncome > b.min && b.rate > 0).map((b) => {
              const slice = Math.min(result.taxableIncome, b.max) - b.min
              const tax = slice * b.rate
              return (
                <div key={b.min} className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/40">
                  <span className="w-28 shrink-0">฿{fmt(b.min + 1)} – {b.max === Infinity ? 'ขึ้นไป' : `฿${fmt(b.max)}`}</span>
                  <span className="w-8 shrink-0 text-right">{(b.rate * 100).toFixed(0)}%</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-violet-400 dark:bg-violet-500"
                      style={{ width: `${Math.min(100, (tax / result.tax) * 100)}%` }}
                    />
                  </div>
                  <span className="w-20 text-right shrink-0 font-medium text-gray-600 dark:text-white/50">฿{fmt(tax)}</span>
                </div>
              )
            })}
          </div>

          {/* Tip */}
          {result.marginal > 0 && result.fundDeductionTotal < income * 0.30 * 3 && (
            <div className="flex gap-2 bg-white/70 dark:bg-white/[0.04] rounded-xl p-3">
              <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 dark:text-white/50">
                อัตราภาษีขั้นสูงสุดของคุณคือ <strong>{result.marginal.toFixed(0)}%</strong> — การลงทุน RMF/SSF/Thai ESG เพิ่มเติมจะช่วยลดภาษีได้โดยตรงในอัตรานี้
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-center text-gray-300 dark:text-white/20">
        คำนวณตามอัตราภาษีปี 2567 · เป็นการประมาณการเท่านั้น โปรดปรึกษาผู้เชี่ยวชาญด้านภาษีเพื่อความแม่นยำ
      </p>
    </div>
  )
}
