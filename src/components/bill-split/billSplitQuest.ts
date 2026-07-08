'use client'

import { BillSplit } from '@/types'

export type BillQuestFilter = 'all' | 'pending' | 'settled'

export function isBillSplitSettled(split: BillSplit) {
  return split.participants.every((participant) => participant.paid || participant.name === split.paidBy)
}

export function formatBillSplitAmount(amount: number, currency = 'THB') {
  if (!Number.isFinite(amount)) return currency === 'THB' ? '฿0.00' : `${currency} 0.00`

  try {
    return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
}

export function formatBillSplitDate(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date

  return parsed.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getBillSplitInitials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return '?'

  const parts = trimmed.split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}

export function getBillSplitPendingAge(split: BillSplit) {
  const parsed = new Date(split.date)
  if (Number.isNaN(parsed.getTime())) return 0

  const diff = Date.now() - parsed.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function getBillSplitPendingParticipants(split: BillSplit) {
  return split.participants.filter((participant) => participant.name !== split.paidBy && !participant.paid)
}
