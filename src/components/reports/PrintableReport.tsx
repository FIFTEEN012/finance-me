'use client'

import { useMemo, useRef } from 'react'
import { Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useGoalStore } from '@/store/useGoalStore'
import { formatCurrency, calcRollover, THAI_MONTHS, THAI_MONTHS_SHORT } from '@/lib/utils'

interface PrintableReportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: number
  month: number | null
}

export function PrintableReport({ open, onOpenChange, year, month }: PrintableReportProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const { transactions, getSumByTypeAndMonth } = useTransactionStore()
  const { getCategoryById } = useCategoryStore()
  const { getBudgetsByMonth } = useBudgetStore()
  const { goals } = useGoalStore()

  const now = new Date()
  const generatedAt = now.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const periodLabel = month !== null
    ? `${THAI_MONTHS[month - 1]} ${year + 543}`
    : `ปี ${year + 543}`

  /* ── Monthly summary (all 12 months for year) ─────────────── */
  const monthlyRows = useMemo(() =>
    THAI_MONTHS_SHORT.map((name, i) => {
      const m = i + 1
      const income = getSumByTypeAndMonth('INCOME', m, year)
      const expense = getSumByTypeAndMonth('EXPENSE', m, year)
      return { name, income, expense, net: income - expense }
    }),
  [getSumByTypeAndMonth, year])

  const yearTotals = useMemo(() => ({
    income: monthlyRows.reduce((s, r) => s + r.income, 0),
    expense: monthlyRows.reduce((s, r) => s + r.expense, 0),
    net: monthlyRows.reduce((s, r) => s + r.net, 0),
  }), [monthlyRows])

  /* ── Period filter ─────────────────────────────────────────── */
  const periodTxns = useMemo(() =>
    transactions.filter((t) => {
      const d = new Date(t.date)
      const sameYear = d.getFullYear() === year
      const sameMonth = month === null || d.getMonth() + 1 === month
      return sameYear && sameMonth
    }),
  [transactions, year, month])

  const periodIncome = periodTxns.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const periodExpense = periodTxns.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const periodNet = periodIncome - periodExpense
  const savingsRate = periodIncome > 0 ? (periodNet / periodIncome) * 100 : 0

  /* ── Category breakdown ────────────────────────────────────── */
  function buildCategoryRows(type: 'INCOME' | 'EXPENSE') {
    const map: Record<string, { name: string; color: string; amount: number }> = {}
    periodTxns.filter((t) => t.type === type).forEach((t) => {
      const cat = getCategoryById(t.categoryId)
      if (!cat) return
      if (!map[cat.id]) map[cat.id] = { name: cat.name, color: cat.color, amount: 0 }
      map[cat.id].amount += t.amount
    })
    const total = Object.values(map).reduce((s, v) => s + v.amount, 0)
    return Object.values(map)
      .sort((a, b) => b.amount - a.amount)
      .map((r) => ({ ...r, pct: total > 0 ? (r.amount / total) * 100 : 0 }))
  }

  const expenseRows = useMemo(() => buildCategoryRows('EXPENSE'), [periodTxns, getCategoryById])
  const incomeRows = useMemo(() => buildCategoryRows('INCOME'), [periodTxns, getCategoryById])

  /* ── Budget vs Actual (for month) ──────────────────────────── */
  const targetMonth = month ?? now.getMonth() + 1
  const targetYear = month !== null ? year : now.getFullYear()
  const budgetRows = useMemo(() => {
    const budgets = getBudgetsByMonth(targetMonth, targetYear)
    return budgets.map((b) => {
      const cat = getCategoryById(b.categoryId)
      const rollover = calcRollover(b, transactions, getBudgetsByMonth)
      const effective = b.amount + rollover
      const spent = transactions
        .filter((t) => {
          const d = new Date(t.date)
          return t.categoryId === b.categoryId && t.type === 'EXPENSE'
            && d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear
        })
        .reduce((s, t) => s + t.amount, 0)
      return {
        name: cat?.name ?? 'ไม่ทราบ',
        budget: b.amount,
        rollover,
        effective,
        spent,
        remaining: effective - spent,
        pct: effective > 0 ? (spent / effective) * 100 : 0,
        isOver: spent > effective,
      }
    }).sort((a, b) => b.pct - a.pct)
  }, [getBudgetsByMonth, getCategoryById, transactions, targetMonth, targetYear])


  /* ── Goals ─────────────────────────────────────────────────── */
  const activeGoals = goals.filter((g) => g.savedAmount < g.targetAmount)

  function handlePrint() {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-0 gap-0 print:max-w-none print:max-h-none print:overflow-visible print:border-0 print:shadow-none print:rounded-none">
        {/* Toolbar — hidden during print */}
        <div className="no-print sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ตัวอย่างก่อนพิมพ์ — {periodLabel}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" />
              พิมพ์ / บันทึก PDF
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Report Content ────────────────────────────────── */}
        <div ref={contentRef} className="print-report-content bg-white text-gray-900 p-8 print:p-6">
          {/* Header */}
          <div className="mb-8 pb-5 border-b-2 border-gray-900">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">FinanceMe</h1>
                <p className="text-sm text-gray-500 mt-0.5">ระบบบริหารจัดการการเงินส่วนบุคคล</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">รายงานสรุปการเงิน</p>
                <p className="text-sm text-gray-600">ช่วงเวลา: <span className="font-medium">{periodLabel}</span></p>
                <p className="text-xs text-gray-400 mt-0.5">สร้างเมื่อ {generatedAt}</p>
              </div>
            </div>
          </div>

          {/* Section 1: ภาพรวม */}
          <section className="mb-7">
            <h2 className="text-base font-bold mb-3 text-gray-800 uppercase tracking-wide">
              ภาพรวม{month !== null ? ` — ${periodLabel}` : ''}
            </h2>
            <div className="grid grid-cols-4 gap-0 border border-gray-300 rounded-lg overflow-hidden">
              {[
                { label: 'รายรับรวม', value: periodIncome, color: '#16a34a' },
                { label: 'รายจ่ายรวม', value: periodExpense, color: '#dc2626' },
                { label: 'ยอดสุทธิ', value: periodNet, color: periodNet >= 0 ? '#2563eb' : '#ea580c' },
                { label: 'อัตราออม', value: null, display: `${savingsRate.toFixed(1)}%`, color: savingsRate >= 20 ? '#16a34a' : savingsRate >= 0 ? '#2563eb' : '#dc2626' },
              ].map((item, i) => (
                <div key={i} className="p-4 text-center border-r border-gray-200 last:border-r-0">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className="text-base font-bold" style={{ color: item.color }}>
                    {item.value !== null ? formatCurrency(item.value) : item.display}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Monthly table */}
          <section className="mb-7">
            <h2 className="text-base font-bold mb-3 text-gray-800 uppercase tracking-wide">
              รายรับ-รายจ่ายรายเดือน — ปี {year + 543}
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">เดือน</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-green-700">รายรับ</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-red-600">รายจ่าย</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-blue-700">ยอดสุทธิ</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row, i) => (
                  <tr
                    key={i}
                    className={[
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                      month !== null && i + 1 === month ? 'ring-1 ring-inset ring-blue-400' : '',
                    ].join(' ')}
                  >
                    <td className="border border-gray-200 px-3 py-1.5 font-medium">
                      {THAI_MONTHS[i]}
                      {month !== null && i + 1 === month && (
                        <span className="ml-1 text-xs text-blue-600 font-normal">(เดือนที่เลือก)</span>
                      )}
                    </td>
                    <td className="border border-gray-200 px-3 py-1.5 text-right text-green-700">
                      {row.income > 0 ? formatCurrency(row.income) : '—'}
                    </td>
                    <td className="border border-gray-200 px-3 py-1.5 text-right text-red-600">
                      {row.expense > 0 ? formatCurrency(row.expense) : '—'}
                    </td>
                    <td className={`border border-gray-200 px-3 py-1.5 text-right font-medium ${row.net >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                      {row.income > 0 || row.expense > 0 ? formatCurrency(row.net) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-900 text-white font-semibold">
                  <td className="border border-gray-700 px-3 py-2">รวมทั้งปี</td>
                  <td className="border border-gray-700 px-3 py-2 text-right text-green-300">{formatCurrency(yearTotals.income)}</td>
                  <td className="border border-gray-700 px-3 py-2 text-right text-red-300">{formatCurrency(yearTotals.expense)}</td>
                  <td className={`border border-gray-700 px-3 py-2 text-right ${yearTotals.net >= 0 ? 'text-blue-300' : 'text-orange-300'}`}>
                    {formatCurrency(yearTotals.net)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Section 3 & 4: Category breakdown — side by side */}
          <div className="grid grid-cols-2 gap-6 mb-7 print:break-inside-avoid">
            {/* Expense categories */}
            <section>
              <h2 className="text-base font-bold mb-3 text-gray-800 uppercase tracking-wide">
                รายจ่ายตามหมวดหมู่
              </h2>
              {expenseRows.length === 0 ? (
                <p className="text-sm text-gray-400">ไม่มีข้อมูล</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">หมวดหมู่</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">จำนวน</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseRows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-2 py-1.5">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block" style={{ backgroundColor: row.color }} />
                            {row.name}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-right text-red-600 font-medium">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-right text-gray-500">
                          {row.pct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border border-gray-300 px-2 py-1.5">รวม</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-red-700">
                        {formatCurrency(expenseRows.reduce((s, r) => s + r.amount, 0))}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </section>

            {/* Income categories */}
            <section>
              <h2 className="text-base font-bold mb-3 text-gray-800 uppercase tracking-wide">
                รายรับตามหมวดหมู่
              </h2>
              {incomeRows.length === 0 ? (
                <p className="text-sm text-gray-400">ไม่มีข้อมูล</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">หมวดหมู่</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">จำนวน</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeRows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-2 py-1.5">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block" style={{ backgroundColor: row.color }} />
                            {row.name}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-right text-green-700 font-medium">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1.5 text-right text-gray-500">
                          {row.pct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border border-gray-300 px-2 py-1.5">รวม</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-green-800">
                        {formatCurrency(incomeRows.reduce((s, r) => s + r.amount, 0))}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </section>
          </div>

          {/* Section 5: Budget vs Actual */}
          {budgetRows.length > 0 && (
            <section className="mb-7 print:break-inside-avoid">
              <h2 className="text-base font-bold mb-3 text-gray-800 uppercase tracking-wide">
                งบประมาณ vs จริง — {`${THAI_MONTHS[targetMonth - 1]} ${targetYear + 543}`}
              </h2>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">หมวดหมู่</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-semibold">งบที่ตั้ง</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-semibold">ใช้จ่ายจริง</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-semibold">คงเหลือ</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-semibold">%</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetRows.map((row, i) => (
                    <tr key={i} className={[
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                      row.isOver ? 'bg-red-50' : '',
                    ].join(' ')}>
                      <td className="border border-gray-200 px-3 py-1.5 font-medium">{row.name}</td>
                      <td className="border border-gray-200 px-3 py-1.5 text-right">
                        {formatCurrency(row.effective)}
                        {row.rollover > 0 && (
                          <span className="text-xs text-blue-500 ml-1">(+{formatCurrency(row.rollover)})</span>
                        )}
                      </td>
                      <td className={`border border-gray-200 px-3 py-1.5 text-right font-medium ${row.isOver ? 'text-red-600' : ''}`}>
                        {formatCurrency(row.spent)}
                      </td>
                      <td className={`border border-gray-200 px-3 py-1.5 text-right ${row.remaining < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {row.remaining < 0 ? '-' : ''}{formatCurrency(Math.abs(row.remaining))}
                      </td>
                      <td className={`border border-gray-200 px-3 py-1.5 text-right ${row.isOver ? 'text-red-600 font-semibold' : row.pct >= 80 ? 'text-yellow-600' : 'text-green-700'}`}>
                        {row.pct.toFixed(1)}%
                      </td>
                      <td className="border border-gray-200 px-3 py-1.5 text-center text-xs">
                        {row.isOver ? '🔴 เกิน' : row.pct >= 80 ? '🟡 ใกล้เต็ม' : '🟢 ปกติ'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-900 text-white font-semibold">
                    <td className="border border-gray-700 px-3 py-2">รวม</td>
                    <td className="border border-gray-700 px-3 py-2 text-right">{formatCurrency(budgetRows.reduce((s, r) => s + r.effective, 0))}</td>
                    <td className="border border-gray-700 px-3 py-2 text-right">{formatCurrency(budgetRows.reduce((s, r) => s + r.spent, 0))}</td>
                    <td className="border border-gray-700 px-3 py-2 text-right">
                      {(() => {
                        const rem = budgetRows.reduce((s, r) => s + r.remaining, 0)
                        return `${rem < 0 ? '-' : ''}${formatCurrency(Math.abs(rem))}`
                      })()}
                    </td>
                    <td className="border border-gray-700 px-3 py-2 text-right">
                      {(() => {
                        const totalBudget = budgetRows.reduce((s, r) => s + r.effective, 0)
                        const totalSpent = budgetRows.reduce((s, r) => s + r.spent, 0)
                        return totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}%` : '—'
                      })()}
                    </td>
                    <td className="border border-gray-700 px-3 py-2" />
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* Section 6: Goals */}
          <div className="print:break-inside-avoid mt-6">
            <section>
              <h2 className="text-base font-bold mb-3 text-gray-800 uppercase tracking-wide">
                เป้าหมายการออม
              </h2>
              {activeGoals.length === 0 ? (
                <p className="text-sm text-gray-400">
                  {goals.length === 0 ? 'ยังไม่มีเป้าหมาย' : 'บรรลุเป้าหมายทั้งหมดแล้ว'}
                </p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">เป้าหมาย</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">ออมแล้ว</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">เป้า</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGoals.map((goal, i) => {
                      const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0
                      return (
                        <tr key={goal.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-200 px-2 py-1.5 font-medium">{goal.name}</td>
                          <td className="border border-gray-200 px-2 py-1.5 text-right text-blue-700 font-medium">
                            {formatCurrency(goal.savedAmount)}
                          </td>
                          <td className="border border-gray-200 px-2 py-1.5 text-right text-gray-600">
                            {formatCurrency(goal.targetAmount)}
                          </td>
                          <td className="border border-gray-200 px-2 py-1.5 text-right font-medium">
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-4 border-t border-gray-300 flex items-center justify-between text-xs text-gray-400">
            <span>FinanceMe — ข้อมูลส่วนตัว โปรดเก็บรักษาเป็นความลับ</span>
            <span>สร้างโดยระบบ FinanceMe อัตโนมัติ</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
