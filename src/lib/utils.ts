import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_LOCALES: Record<string, string> = {
  THB: 'th-TH',
  USD: 'en-US',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  SGD: 'en-SG',
  GBP: 'en-GB',
}

export function formatCurrency(amount: number, currency?: string): string {
  // lazy-import to avoid circular deps; falls back to THB if store not ready
  let curr = currency
  if (!curr) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useSettingsStore } = require('@/store/useSettingsStore')
      curr = useSettingsStore.getState().currency as string
    } catch {
      curr = 'THB'
    }
  }
  const locale = CURRENCY_LOCALES[curr] ?? 'th-TH'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: curr === 'JPY' ? 0 : 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr))
}

export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

export const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

/** คำนวณยอดงบเหลือจากเดือนก่อนสำหรับ rollover */
export function calcRollover(
  budget: { categoryId: string; month: number; year: number; amount: number; allowRollover?: boolean },
  transactions: Array<{ categoryId: string; type: string; amount: number; date: string }>,
  getBudgetsByMonth: (month: number, year: number) => Array<{ categoryId: string; amount: number }>
): number {
  if (!budget.allowRollover) return 0

  const prevMonth = budget.month === 1 ? 12 : budget.month - 1
  const prevYear = budget.month === 1 ? budget.year - 1 : budget.year

  const prevBudgets = getBudgetsByMonth(prevMonth, prevYear)
  const prevBudget = prevBudgets.find((b) => b.categoryId === budget.categoryId)
  if (!prevBudget) return 0

  const prevSpent = transactions
    .filter((t) => {
      const d = new Date(t.date)
      return (
        t.categoryId === budget.categoryId &&
        t.type === 'EXPENSE' &&
        d.getMonth() + 1 === prevMonth &&
        d.getFullYear() === prevYear
      )
    })
    .reduce((sum, t) => sum + t.amount, 0)

  return Math.max(0, prevBudget.amount - prevSpent)
}

export const THAI_MONTHS_SHORT = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
]
