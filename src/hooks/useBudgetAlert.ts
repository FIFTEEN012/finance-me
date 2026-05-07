'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency } from '@/lib/utils'

const STORAGE_KEY = 'finance-budget-alerts'

function getShownAlerts(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveShownAlerts(keys: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]))
  } catch {}
}

export function useBudgetAlert() {
  const { getBudgetsByMonth } = useBudgetStore()
  const { transactions } = useTransactionStore()
  const { getCategoryById } = useCategoryStore()

  useEffect(() => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const budgets = getBudgetsByMonth(month, year)
    if (budgets.length === 0) return

    const shown = getShownAlerts()
    let changed = false

    for (const budget of budgets) {
      const cat = getCategoryById(budget.categoryId)
      const catName = cat?.name ?? 'ไม่ทราบหมวดหมู่'

      const catSpent = transactions
        .filter((t) => {
          if (t.categoryId !== budget.categoryId || t.type !== 'EXPENSE') return false
          const d = new Date(t.date)
          return d.getMonth() + 1 === month && d.getFullYear() === year
        })
        .reduce((sum, t) => sum + t.amount, 0)

      const catPct = budget.amount > 0 ? (catSpent / budget.amount) * 100 : 0

      const dangerKey = `${budget.id}-${year}-${month}-danger`
      const warnKey = `${budget.id}-${year}-${month}-warning`

      if (catPct >= 100 && !shown.has(dangerKey)) {
        toast.error(`เกินงบประมาณ! "${catName}"`, {
          description: `ใช้ไป ${formatCurrency(catSpent)} จาก ${formatCurrency(budget.amount)} (${Math.round(catPct)}%)`,
          duration: 6000,
        })
        shown.add(dangerKey)
        shown.add(warnKey)
        changed = true
      } else if (catPct >= 80 && !shown.has(warnKey)) {
        toast.warning(`ใกล้ถึงงบประมาณ "${catName}"`, {
          description: `ใช้ไป ${formatCurrency(catSpent)} จาก ${formatCurrency(budget.amount)} (${Math.round(catPct)}%)`,
          duration: 5000,
        })
        shown.add(warnKey)
        changed = true
      }
    }

    if (changed) saveShownAlerts(shown)
  }, [transactions, getBudgetsByMonth, getCategoryById])
}
