import { Transaction } from '@/types'

export interface DailySummary {
  income: number
  expense: number
  remaining: number // income - expense ของวันนั้น
}

/** Convert any date string (UTC ISO or YYYY-MM-DD) to local "YYYY-MM-DD" key */
export function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

export function summarizeByDay(transactions: Transaction[]): Map<string, DailySummary> {
  const summaries = new Map<string, DailySummary>()

  for (const tx of transactions) {
    const key = toLocalDateKey(tx.date)
    const current = summaries.get(key) ?? { income: 0, expense: 0, remaining: 0 }
    const income = roundMoney(current.income + (tx.type === 'INCOME' ? tx.amount : 0))
    const expense = roundMoney(current.expense + (tx.type === 'EXPENSE' ? tx.amount : 0))
    summaries.set(key, { income, expense, remaining: roundMoney(income - expense) })
  }

  return summaries
}
