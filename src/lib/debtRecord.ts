import type { DebtItem, DebtPayment, DebtCategory } from '@/types/debt'

type DebtRecord = Record<string, unknown>

const colors: Record<DebtCategory, string> = {
  person: '#3b82f6', family: '#10b981', credit_card: '#ec4899',
  loan: '#8b5cf6', other: '#f59e0b',
}

const finiteAmount = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

const dateString = (value: unknown): string | undefined => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  return typeof value === 'string' && value.trim() && !Number.isNaN(new Date(value).getTime())
    ? value : undefined
}

const validCategory = (value: unknown): value is DebtCategory =>
  typeof value === 'string' && value in colors

export function normalizeDebt(record: DebtRecord, local?: DebtRecord): DebtItem {
  const totalAmount = finiteAmount(record.totalAmount ?? record.originalAmount)
    ?? finiteAmount(local?.totalAmount ?? local?.originalAmount)
    ?? 0
  const serverPayments = Array.isArray(record.payments) ? record.payments as DebtPayment[] : []
  const localPayments = Array.isArray(local?.payments) ? local.payments as DebtPayment[] : []
  const serverUpdated = new Date(dateString(record.updatedAt) ?? 0).getTime()
  const localUpdated = new Date(dateString(local?.updatedAt) ?? 0).getTime()
  // Older app versions saved repayments only in the browser. Recover those when
  // the local copy is newer than the database copy.
  const payments = localUpdated > serverUpdated && localPayments.length > serverPayments.length
    ? localPayments : serverPayments
  const recoveredLocalPayments = payments === localPayments
  const paidFromPayments = payments.reduce((sum, payment) => sum + (finiteAmount(payment.amount) ?? 0), 0)
  const remaining = finiteAmount(record.remainingAmount)
  const paidAmount = payments.length > 0
    ? paidFromPayments
    : finiteAmount(record.paidAmount) ?? (remaining === undefined ? 0 : Math.max(0, totalAmount - remaining))
  const category = validCategory(local?.category) ? local.category
    : validCategory(record.category) ? record.category : 'other'
  const createdAt = dateString(record.createdAt)
    ?? dateString(local?.createdAt) ?? new Date().toISOString()
  const startDate = dateString(local?.startDate)
    ?? dateString(record.startDate) ?? createdAt.slice(0, 10)

  return {
    id: String(record.id),
    personName: String(record.personName ?? record.person ?? local?.personName ?? ''),
    type: record.type === 'OWED_TO_ME' ? 'OWED_TO_ME' : 'I_OWE',
    category,
    totalAmount,
    paidAmount,
    startDate,
    dueDate: dateString(record.dueDate),
    note: typeof record.note === 'string' ? record.note : undefined,
    color: typeof local?.color === 'string' && local.color ? local.color
      : typeof record.color === 'string' && record.color ? record.color : colors[category],
    isSettled: paidAmount >= totalAmount || record.status === 'SETTLED',
    payments,
    initialTransactionId: typeof local?.initialTransactionId === 'string' ? local.initialTransactionId : undefined,
    createdAt,
    updatedAt: recoveredLocalPayments
      ? dateString(local?.updatedAt) ?? createdAt
      : dateString(record.updatedAt) ?? createdAt,
  }
}

export function debtToDatabasePayload(debt: DebtItem) {
  return {
    person: debt.personName,
    type: debt.type,
    originalAmount: debt.totalAmount,
    remainingAmount: Math.max(0, debt.totalAmount - debt.paidAmount),
    dueDate: debt.dueDate ?? null,
    note: debt.note ?? null,
    status: debt.isSettled ? 'SETTLED' : 'ACTIVE',
    payments: debt.payments,
  }
}
