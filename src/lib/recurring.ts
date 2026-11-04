import { RecurringFrequency, RecurringTransaction, Transaction } from '@/types'

// A rule with an old start date catches up over several runs instead of one huge sync.
export const MAX_OCCURRENCES_PER_RUN = 200

export const RECURRING_TAG = 'รายการประจำ'

const pad = (n: number) => String(n).padStart(2, '0')

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayKey(now: Date = new Date()): string {
  return formatDate(now)
}

/**
 * The n-th date of a rule, always derived from the start date so a clamped
 * month end does not drift (Jan 31 -> Feb 28 -> Mar 31).
 */
export function occurrenceDate(startDate: string, frequency: RecurringFrequency, n: number): string {
  const [year, month, day] = startDate.split('-').map(Number)

  if (frequency === 'weekly') {
    return formatDate(new Date(year, month - 1, day + 7 * n))
  }

  const monthIndex = month - 1 + (frequency === 'monthly' ? n : 12 * n)
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return formatDate(new Date(year, monthIndex, Math.min(day, lastDay)))
}

/** The first occurrence the rule has not recorded yet. */
export function nextOccurrence(rule: RecurringTransaction): string {
  for (let n = 0; ; n++) {
    const date = occurrenceDate(rule.startDate, rule.frequency, n)
    if (!rule.lastGeneratedDate || date > rule.lastGeneratedDate) return date
  }
}

function fnv1a(input: string, seed: number): string {
  let hash = seed
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Same rule and date always give the same UUID, so a second tab or device that
 * generates the occurrence upserts the same row instead of adding a duplicate.
 */
export function recurringTransactionId(ruleId: string, date: string): string {
  const input = `${ruleId}:${date}`
  const hex = [0x811c9dc5, 0x01234567, 0x89abcdef, 0xdeadbeef].map((seed) => fnv1a(input, seed)).join('')
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20)}`
}

export function computeDueTransactions(
  rules: RecurringTransaction[],
  today: string,
  existingIds: Set<string>,
  nowIso: string,
): { transactions: Transaction[]; cursors: Record<string, string> } {
  const transactions: Transaction[] = []
  const cursors: Record<string, string> = {}

  for (const rule of rules) {
    if (!rule.isActive) continue

    let generated = 0
    for (let n = 0; generated < MAX_OCCURRENCES_PER_RUN; n++) {
      const date = occurrenceDate(rule.startDate, rule.frequency, n)
      if (date > today) break
      if (rule.lastGeneratedDate && date <= rule.lastGeneratedDate) continue

      cursors[rule.id] = date
      generated++

      const id = recurringTransactionId(rule.id, date)
      if (existingIds.has(id)) continue

      transactions.push({
        id,
        categoryId: rule.categoryId,
        type: rule.type,
        amount: rule.amount,
        description: rule.description,
        note: rule.note,
        tags: [RECURRING_TAG],
        date,
        createdAt: nowIso,
      })
    }
  }

  return { transactions, cursors }
}

/** Resuming skips what fell due during the pause but still records today. */
export function resumeCursor(rule: RecurringTransaction, today: string): string {
  const [year, month, day] = today.split('-').map(Number)
  const yesterday = formatDate(new Date(year, month - 1, day - 1))
  return rule.lastGeneratedDate && rule.lastGeneratedDate > yesterday ? rule.lastGeneratedDate : yesterday
}
