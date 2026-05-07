'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet, BarChart3, Target, Shield, ArrowRight,
  Check, ChevronRight, Sparkles, TrendingUp, PiggyBank,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useCategoryStore } from '@/store/useCategoryStore'

const TOTAL_STEPS = 5

/* ── Step components ─────────────────────────────────────────────── */

function StepWelcome({ onNext }: { onNext: () => void }) {
  const features = [
    { icon: BarChart3,  label: 'ติดตามรายรับ-รายจ่าย',   color: 'text-violet-500' },
    { icon: PiggyBank,  label: 'ตั้งงบประมาณรายเดือน',   color: 'text-indigo-500' },
    { icon: Target,     label: 'เป้าหมายการออมเงิน',      color: 'text-pink-500'   },
    { icon: TrendingUp, label: 'รายงานและวิเคราะห์',      color: 'text-emerald-500'},
    { icon: Shield,     label: 'ข้อมูลเก็บในเครื่องคุณ', color: 'text-amber-500'  },
  ]

  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      {/* Logo */}
      <div className={cn(
        'flex items-center justify-center w-20 h-20 rounded-2xl',
        'bg-gradient-to-br from-violet-600 to-indigo-600',
        'shadow-[0_8px_32px_rgba(124,58,237,0.45)]',
      )}>
        <Wallet className="w-10 h-10 text-white" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          ยินดีต้อนรับสู่ <span className="text-gradient-violet">FinanceMe</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-white/45 max-w-xs mx-auto">
          แอปจัดการเงินส่วนตัวที่ออกแบบมาเพื่อให้คุณควบคุมการเงินได้อย่างง่ายดาย
        </p>
      </div>

      {/* Features */}
      <div className="w-full max-w-xs space-y-2.5">
        {features.map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.05]"
          >
            <Icon className={cn('w-4 h-4 flex-shrink-0', color)} />
            <span className="text-sm text-gray-700 dark:text-white/70">{label}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="w-full max-w-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2 h-11"
      >
        เริ่มต้นใช้งาน
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

function StepBudget({ onNext }: { onNext: () => void }) {
  const [amount, setAmount] = useState('')
  const { addBudget, getBudgetsByMonth } = useBudgetStore()
  const { getCategoriesByType } = useCategoryStore()
  const now = new Date()

  function handleNext() {
    const val = parseFloat(amount)
    if (!isNaN(val) && val > 0) {
      // Create a total-expense budget using the first expense category (or skip if none)
      const expCats = getCategoriesByType('EXPENSE')
      if (expCats.length > 0) {
        const existing = getBudgetsByMonth(now.getMonth() + 1, now.getFullYear())
        // Only add if no budget exists for this month yet
        if (existing.length === 0) {
          expCats.slice(0, 1).forEach((cat) => {
            addBudget({
              categoryId: cat.id,
              amount: val,
              month: now.getMonth() + 1,
              year: now.getFullYear(),
            })
          })
        }
      }
    }
    onNext()
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 mb-3">
          <PiggyBank className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">ตั้งงบประมาณรายเดือน</h2>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-white/45">
          กำหนดวงเงินค่าใช้จ่ายต่อเดือนเพื่อควบคุมการใช้จ่าย
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="budget-amount" className="text-sm font-medium text-gray-700 dark:text-white/60">
          งบประมาณต่อเดือน (บาท)
        </Label>
        <Input
          id="budget-amount"
          type="number"
          placeholder="เช่น 20000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-lg h-12 text-center font-semibold"
          min={0}
        />
      </div>

      {/* Suggestions */}
      <div>
        <p className="text-xs text-gray-400 dark:text-white/30 mb-2">แนะนำ</p>
        <div className="grid grid-cols-3 gap-2">
          {[10000, 20000, 30000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className={cn(
                'py-2 rounded-xl text-sm font-medium transition-colors border',
                amount === String(v)
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-white/50 border-gray-200 dark:border-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.08]',
              )}
            >
              ฿{(v / 1000).toFixed(0)}K
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onNext} className="flex-1 h-11">
          ข้ามก่อน
        </Button>
        <Button
          onClick={handleNext}
          className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-11 gap-2"
        >
          ถัดไป
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function StepIncome({ onNext }: { onNext: () => void }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('เงินเดือน')
  const { addRecurring } = useRecurringStore()
  const { getCategoriesByType } = useCategoryStore()

  function handleNext() {
    const val = parseFloat(amount)
    if (!isNaN(val) && val > 0) {
      const incomeCats = getCategoriesByType('INCOME')
      if (incomeCats.length > 0) {
        addRecurring({
          categoryId: incomeCats[0].id,
          type: 'INCOME',
          amount: val,
          description: description || 'เงินเดือน',
          frequency: 'monthly',
          dayOfMonth: 25,
          startDate: new Date().toISOString().split('T')[0],
          isActive: true,
        })
      }
    }
    onNext()
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-500/10 mb-3">
          <TrendingUp className="w-7 h-7 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">รายรับประจำเดือน</h2>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-white/45">
          เพิ่มรายรับประจำ เช่น เงินเดือน เพื่อให้ระบบสร้างรายการอัตโนมัติ
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="income-desc" className="text-sm font-medium text-gray-700 dark:text-white/60">
            ชื่อรายรับ
          </Label>
          <Input
            id="income-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="เช่น เงินเดือน"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="income-amount" className="text-sm font-medium text-gray-700 dark:text-white/60">
            จำนวนเงิน (บาท)
          </Label>
          <Input
            id="income-amount"
            type="number"
            placeholder="เช่น 35000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-lg h-12 text-center font-semibold"
            min={0}
          />
        </div>
      </div>

      <div className="px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
        <p className="text-xs text-violet-700 dark:text-violet-400">
          ระบบจะสร้างรายการรายรับให้อัตโนมัติทุกวันที่ 25 ของเดือน คุณสามารถเปลี่ยนวันได้ในภายหลัง
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onNext} className="flex-1 h-11">
          ข้ามก่อน
        </Button>
        <Button
          onClick={handleNext}
          className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-11 gap-2"
        >
          ถัดไป
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function StepFeatures({ onNext }: { onNext: () => void }) {
  const pages = [
    { emoji: '📊', title: 'แดชบอร์ด',         desc: 'ภาพรวมการเงินและ Forecast'   },
    { emoji: '💳', title: 'ธุรกรรม',            desc: 'บันทึกรายรับ-รายจ่ายทุกรายการ' },
    { emoji: '🎯', title: 'งบประมาณ',           desc: 'ตั้งวงเงินแต่ละหมวดหมู่'       },
    { emoji: '📈', title: 'รายงาน',             desc: 'วิเคราะห์แนวโน้มการใช้จ่าย'    },
    { emoji: '💰', title: 'เป้าหมายการออม',     desc: 'ตั้งเป้าและติดตามความคืบหน้า'  },
    { emoji: '🔄', title: 'รายการประจำ',        desc: 'รายการที่เกิดซ้ำอัตโนมัติ'     },
  ]

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-500/10 mb-3">
          <Sparkles className="w-7 h-7 text-pink-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">ฟีเจอร์ทั้งหมด</h2>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-white/45">
          ทุกสิ่งที่คุณต้องการเพื่อควบคุมการเงิน
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {pages.map(({ emoji, title, desc }) => (
          <div
            key={title}
            className="flex flex-col gap-1 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.05]"
          >
            <span className="text-2xl">{emoji}</span>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/80">{title}</p>
            <p className="text-xs text-gray-500 dark:text-white/35 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-11 gap-2"
      >
        เข้าใจแล้ว!
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

function StepDone({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      {/* Celebration icon */}
      <div className={cn(
        'relative flex items-center justify-center w-20 h-20 rounded-full',
        'bg-gradient-to-br from-violet-500 to-indigo-600',
        'shadow-[0_8px_32px_rgba(124,58,237,0.45)]',
      )}>
        <Check className="w-10 h-10 text-white" strokeWidth={2.5} />
        {/* Glow rings */}
        <div className="absolute inset-0 rounded-full animate-ping bg-violet-500/20" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">พร้อมแล้ว! 🎉</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-white/45 max-w-xs mx-auto">
          คุณตั้งค่าเสร็จสมบูรณ์แล้ว ไปที่แดชบอร์ดเพื่อเริ่มต้นจัดการการเงินได้เลย
        </p>
      </div>

      <div className="w-full space-y-2.5 text-left">
        {[
          'บันทึกรายรับ-รายจ่ายวันนี้',
          'ตั้งงบประมาณแต่ละหมวดหมู่',
          'ดูรายงานการเงินรายเดือน',
        ].map((tip) => (
          <div key={tip} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
            <Check className="w-4 h-4 text-violet-500 flex-shrink-0" />
            <span className="text-sm text-violet-700 dark:text-violet-300">{tip}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={onComplete}
        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white h-12 text-base font-semibold gap-2 shadow-[0_4px_20px_rgba(124,58,237,0.40)]"
      >
        <Sparkles className="w-4 h-4" />
        ไปที่แดชบอร์ด
      </Button>
    </div>
  )
}

/* ── Main Wizard ──────────────────────────────────────────────────── */

export function OnboardingWizard() {
  const { step, setStep, complete } = useOnboardingStore()
  const router = useRouter()

  function next() {
    setStep(step + 1)
  }

  function handleComplete() {
    complete()
    router.push('/dashboard')
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={cn(
        'relative w-full max-w-sm rounded-2xl overflow-hidden',
        'bg-white dark:bg-[oklch(0.08_0.025_272)]',
        'shadow-2xl border border-gray-100 dark:border-white/[0.06]',
      )}>
        {/* Progress bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gray-100 dark:bg-white/[0.06]">
          <div
            className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step counter */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <span className="text-xs text-gray-400 dark:text-white/30">
            ขั้นตอน {step + 1} / {TOTAL_STEPS}
          </span>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === step
                    ? 'w-4 h-1.5 bg-violet-500'
                    : i < step
                    ? 'w-1.5 h-1.5 bg-violet-400'
                    : 'w-1.5 h-1.5 bg-gray-200 dark:bg-white/10',
                )}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-5 pb-5">
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepBudget onNext={next} />}
          {step === 2 && <StepIncome onNext={next} />}
          {step === 3 && <StepFeatures onNext={next} />}
          {step === 4 && <StepDone onComplete={handleComplete} />}
        </div>
      </div>
    </div>
  )
}
