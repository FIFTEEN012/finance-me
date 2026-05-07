'use client'

import { useMemo } from 'react'
import { useRecurringStore } from '@/store/useRecurringStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { RecurringTransaction } from '@/types'
import { Category } from '@/types'

export interface BillItem {
  recurring: RecurringTransaction
  cat: Category | undefined
  dueDate: Date
  daysUntilDue: number
}

export interface BillReminders {
  upcoming: BillItem[]
  overdue: BillItem[]
}

export function useBillReminders(days = 7): BillReminders {
  const { recurrings } = useRecurringStore()
  const { getCategoryById } = useCategoryStore()

  return useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() + days)

    const upcoming: BillItem[] = []
    const overdue: BillItem[] = []

    const active = recurrings.filter((r) => r.isActive && r.frequency === 'monthly')

    for (const r of active) {
      const dueDate = new Date(today.getFullYear(), today.getMonth(), r.dayOfMonth)
      const diffMs = dueDate.getTime() - today.getTime()
      const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24))
      const cat = getCategoryById(r.categoryId)

      if (daysUntilDue >= 0 && dueDate <= cutoff) {
        // Due today or within the next `days` days
        upcoming.push({ recurring: r, cat, dueDate, daysUntilDue })
      } else if (daysUntilDue < 0) {
        // Already passed this month
        overdue.push({ recurring: r, cat, dueDate, daysUntilDue })
      }
    }

    // Sort upcoming by days until due (soonest first)
    upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    // Sort overdue by how recently overdue (most recent first)
    overdue.sort((a, b) => b.daysUntilDue - a.daysUntilDue)

    return { upcoming, overdue }
  }, [recurrings, getCategoryById, days])
}
