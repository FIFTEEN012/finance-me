'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Sparkles } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { MonthlyBarChart } from '@/components/reports/MonthlyBarChart'
import { YearlyLineChart } from '@/components/reports/YearlyLineChart'
import { CategoryBreakdown } from '@/components/reports/CategoryBreakdown'
import { BudgetVsActual } from '@/components/reports/BudgetVsActual'
import { SpendingTrend } from '@/components/reports/SpendingTrend'
import { SpendingIntensity } from '@/components/reports/SpendingIntensity'
import { PrintableReport } from '@/components/reports/PrintableReport'
import { IncomeBreakdown } from '@/components/reports/IncomeBreakdown'
import { SavingsRateTracker } from '@/components/reports/SavingsRateTracker'
import { CashFlowForecast } from '@/components/dashboard/CashFlowForecast'
import { SpendingInsights } from '@/components/dashboard/SpendingInsights'
import { PressCard } from '@/components/ui/PressCard'
import { THAI_MONTHS } from '@/lib/utils'

export default function ReportsPage() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | null>(null)
  const [printOpen, setPrintOpen] = useState(false)

  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()]

  return (
    <div className="space-y-5">
      {/* Header + Filters */}
      <PressCard shadow="0 4px 0 0 #d1d5db" shadowHover="0 2px 0 0 #d1d5db" className="border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">รายงาน</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">วิเคราะห์รายรับ-รายจ่ายของคุณ</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/reports/wrapped')}
            className="gap-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300 hover:from-violet-100 hover:to-indigo-100"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Year in Review
          </Button>
          <Select
            value={month === null ? 'ALL' : String(month)}
            onValueChange={(v) => setMonth(!v || v === 'ALL' ? null : Number(v))}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="เลือกเดือน" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ทุกเดือน</SelectItem>
              {THAI_MONTHS.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(year)} onValueChange={(v) => setYear(Number(v ?? year))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y + 543}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => setPrintOpen(true)}
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงาน
          </Button>
        </div>
      </div>
      </PressCard>

      <PrintableReport open={printOpen} onOpenChange={setPrintOpen} year={year} month={month} />

      <SpendingInsights />
      <CashFlowForecast />
      <MonthlyBarChart year={year} />
      <IncomeBreakdown year={year} month={month} />
      <SpendingTrend />
      <YearlyLineChart year={year} />
      <SavingsRateTracker year={year} month={month} />
      <BudgetVsActual year={year} month={month} />
      <SpendingIntensity year={year} month={month} />
      <CategoryBreakdown year={year} month={month} />
    </div>
  )
}
