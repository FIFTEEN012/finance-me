'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useTransactionStore } from '@/store/useTransactionStore'

/**
 * Runs once on mount. For each active recurring template, generates
 * all missing transactions from startDate up to today.
 * Shows a summary toast if any transactions were generated.
 */
export function useRecurringGenerator() {
  const { recurrings, setLastGeneratedDate } = useRecurringStore()
  const { addTransaction, transactions: existingTxns } = useTransactionStore()

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build a dedup key set from existing transactions for O(1) lookup
    const existingKeys = new Set(
      existingTxns.map((t) => `${t.date}|${t.categoryId}|${t.amount}|${t.description}`)
    )

    const allGenerated: { description: string; amount: number; type: string; date: string }[] = []

    for (const r of recurrings) {
      if (!r.isActive) continue

      const startDate = new Date(r.startDate)
      startDate.setHours(0, 0, 0, 0)

      // cursor = month after last generated, or startDate month
      let cursor: Date
      if (r.lastGeneratedDate) {
        const last = new Date(r.lastGeneratedDate)
        cursor = new Date(last.getFullYear(), last.getMonth() + 1, 1)
      } else {
        cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
      }

      const generated: string[] = []

      while (cursor <= today) {
        const year = cursor.getFullYear()
        const month = cursor.getMonth() // 0-indexed

        // Clamp day to last day of month (e.g. day 31 in Feb → 28/29)
        const maxDay = new Date(year, month + 1, 0).getDate()
        const day = Math.min(r.dayOfMonth, maxDay)

        const txDate = new Date(year, month, day)
        txDate.setHours(0, 0, 0, 0)
        const dateStr = txDate.toISOString().slice(0, 10)
        const dedupKey = `${dateStr}|${r.categoryId}|${r.amount}|${r.description}`

        // Only generate if txDate is >= startDate and <= today
        if (txDate >= startDate && txDate <= today) {
          const shouldGenerate =
            !existingKeys.has(dedupKey) &&
            (r.frequency === 'monthly' ||
              (r.frequency === 'yearly' && month === startDate.getMonth()))

          if (shouldGenerate) {
            addTransaction({
              categoryId: r.categoryId,
              type: r.type,
              amount: r.amount,
              description: r.description,
              note: r.note,
              date: dateStr,
            })
            existingKeys.add(dedupKey) // prevent double-add within same run
            generated.push(dateStr)
            allGenerated.push({ description: r.description, amount: r.amount, type: r.type, date: dateStr })
          }
        }

        // Advance cursor by 1 month
        cursor = new Date(year, month + 1, 1)
      }

      if (generated.length > 0) {
        setLastGeneratedDate(r.id, generated[generated.length - 1])
      }
    }

    if (allGenerated.length > 0) {
      const incomeCount = allGenerated.filter(g => g.type === 'INCOME').length
      const expenseCount = allGenerated.filter(g => g.type === 'EXPENSE').length

      let desc = `สร้าง ${allGenerated.length} รายการอัตโนมัติ`
      if (incomeCount > 0 && expenseCount > 0) {
        desc += ` (รายรับ ${incomeCount}, รายจ่าย ${expenseCount})`
      } else if (incomeCount > 0) {
        desc += ` (รายรับ ${incomeCount} รายการ)`
      } else {
        desc += ` (รายจ่าย ${expenseCount} รายการ)`
      }

      const names = [...new Set(allGenerated.map(g => g.description))].slice(0, 3)
      const namesStr = names.join(', ') + (allGenerated.length > 3 ? ` และอีก ${allGenerated.length - 3}` : '')

      toast.success(desc, {
        description: namesStr,
        duration: 5000,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount only
}
