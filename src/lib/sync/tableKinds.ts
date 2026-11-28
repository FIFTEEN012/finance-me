import 'server-only'

import { financeBudgets, financeCategories, financeDebts, financeGoals, financeTransactions } from '@/db/schema'
import { foodFlagFrom } from '@/lib/foodCategory'
import { normalizeDebt } from '@/lib/debtRecord'
import type { OwnTableKind } from './contract'

/**
 * Record kinds kept in a table of their own (ADR-0003), served by the same
 * sync contract as `user_records` kinds: `serverRecords.ts` pulls and pushes
 * them with the same last-edit-wins and tombstone rules. Each entry only says
 * how a client record maps to a row and back.
 *
 * A table used here needs `owner_id`, `id`, `updated_at` (server receive
 * time, the pull cursor) and the `syncColumns` from `src/db/schema.ts`
 * (`edited_at`, `deleted_at`), with PK (owner_id, id).
 */

export type ClientRecord = Record<string, unknown>

/** Column values keyed by the drizzle field name (not the SQL name). */
export type RowValues = Record<string, unknown>

export type SyncedTable =
  | typeof financeCategories
  | typeof financeBudgets
  | typeof financeGoals
  | typeof financeDebts
  | typeof financeTransactions

export type TableKind = {
  table: SyncedTable
  /**
   * The row values for a record the device sent (no owner, id or sync
   * columns). `null` when the record is unusable (the change is refused).
   */
  toRow(data: ClientRecord): RowValues | null
  /** The record a device gets back for a stored row. */
  toRecord(row: Record<string, unknown>): ClientRecord
  /**
   * Values for the NOT NULL columns when a delete arrives for a record the
   * server never had: the tombstone still has to be stored.
   */
  emptyRow: RowValues
  /**
   * Values written only when the row is first created (e.g. where it came
   * from); an edit from a device never replaces them.
   */
  insertOnly?: RowValues
  /** Whether the table can hold a record with this id (default: any). */
  acceptsId?(id: string): boolean
}

const text = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const nonEmpty = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const amount = (v: unknown): string | null => {
  const n = typeof v === 'string' && v.trim() ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? String(n) : null
}
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null)
const time = (v: unknown): Date | undefined => {
  if (typeof v !== 'string') return undefined
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d
}
const iso = (v: unknown): string => (v instanceof Date ? v : new Date(String(v))).toISOString()
/** Drops undefined/null fields so optional client fields stay absent. */
const compact = (record: ClientRecord): ClientRecord =>
  Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined && v !== null))

const category: TableKind = {
  table: financeCategories,
  toRow(d) {
    const name = nonEmpty(d.name)
    const type = nonEmpty(d.type)
    if (!name || !type) return null
    return {
      name,
      type,
      icon: nonEmpty(d.icon) ?? 'Folder',
      color: nonEmpty(d.color) ?? '#7c3aed',
      isDefault: d.isDefault === true,
      isFood: foodFlagFrom(d.isFood),
    }
  },
  toRecord: (r) =>
    compact({ id: r.id, name: r.name, type: r.type, icon: r.icon, color: r.color, isDefault: r.isDefault, isFood: r.isFood }),
  emptyRow: { name: '', type: '', icon: '', color: '' },
}

const budget: TableKind = {
  table: financeBudgets,
  toRow(d) {
    const categoryId = nonEmpty(d.categoryId)
    const value = amount(d.amount)
    const month = int(d.month)
    const year = int(d.year)
    if (!categoryId || value === null || month === null || year === null) return null
    return { categoryId, amount: value, month, year, allowRollover: d.allowRollover === true }
  },
  toRecord: (r) => ({
    id: r.id,
    categoryId: r.categoryId,
    amount: Number(r.amount),
    month: r.month,
    year: r.year,
    allowRollover: r.allowRollover,
  }),
  emptyRow: { categoryId: '', amount: '0', month: 0, year: 0 },
}

const goal: TableKind = {
  table: financeGoals,
  toRow(d) {
    const name = nonEmpty(d.name)
    const target = amount(d.targetAmount)
    if (!name || target === null) return null
    return {
      name,
      targetAmount: target,
      savedAmount: amount(d.savedAmount) ?? '0',
      targetDate: text(d.targetDate) ?? '',
      description: text(d.description),
      icon: nonEmpty(d.icon) ?? 'Target',
      color: nonEmpty(d.color) ?? '#10b981',
      milestonesCelebrated: Array.isArray(d.milestonesCelebrated) ? d.milestonesCelebrated : null,
      linkedPortfolio: typeof d.linkedPortfolio === 'boolean' ? d.linkedPortfolio : null,
      createdAt: time(d.createdAt) ?? new Date(),
    }
  },
  toRecord: (r) =>
    compact({
      id: r.id,
      name: r.name,
      targetAmount: Number(r.targetAmount),
      savedAmount: Number(r.savedAmount),
      targetDate: r.targetDate,
      description: r.description,
      icon: r.icon,
      color: r.color,
      createdAt: iso(r.createdAt),
      milestonesCelebrated: r.milestonesCelebrated,
      linkedPortfolio: r.linkedPortfolio,
    }),
  emptyRow: { name: '', targetAmount: '0', targetDate: '', icon: '', color: '' },
}

const debt: TableKind = {
  table: financeDebts,
  toRow(d) {
    const person = nonEmpty(d.personName)
    const total = amount(d.totalAmount)
    if (!person || total === null) return null
    const paid = Number(amount(d.paidAmount) ?? 0)
    return {
      person,
      type: d.type === 'OWED_TO_ME' ? 'OWED_TO_ME' : 'I_OWE',
      originalAmount: total,
      remainingAmount: String(Math.max(0, Number(total) - paid)),
      dueDate: text(d.dueDate),
      note: text(d.note),
      status: d.isSettled === true ? 'SETTLED' : 'ACTIVE',
      payments: Array.isArray(d.payments) ? d.payments : [],
      category: text(d.category),
      color: text(d.color),
      startDate: text(d.startDate),
      initialTransactionId: text(d.initialTransactionId),
      createdAt: time(d.createdAt) ?? new Date(),
    }
  },
  toRecord: (r) =>
    compact({
      ...normalizeDebt({
        ...r,
        createdAt: iso(r.createdAt),
        // The debt's own "last changed" is its last edit, not the server receive time.
        updatedAt: iso(r.editedAt),
      }),
    }),
  emptyRow: { person: '', type: 'I_OWE', originalAmount: '0', remainingAmount: '0' },
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TRANSACTION_TYPES = new Set(['INCOME', 'EXPENSE', 'TRANSFER'])
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
/** App dates are Thai local days; a row without one (from the bot) takes the day it happened in Bangkok. */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000
const bangkokDay = (v: unknown): string =>
  new Date(new Date(String(v instanceof Date ? v.toISOString() : v)).getTime() + BANGKOK_OFFSET_MS)
    .toISOString()
    .slice(0, 10)

const transaction: TableKind = {
  table: financeTransactions,
  // The id column is uuid: any other id would fail the whole push.
  acceptsId: (id) => UUID.test(id),
  toRow(d) {
    const type = typeof d.type === 'string' && TRANSACTION_TYPES.has(d.type) ? d.type : null
    const value = typeof d.amount === 'number' && Number.isFinite(d.amount) ? d.amount : NaN
    const date = typeof d.date === 'string' && DATE_KEY.test(d.date) ? d.date : null
    const categoryId = nonEmpty(d.categoryId)
    // The table only holds positive amounts (CHECK amount > 0, two decimals).
    if (!type || !(Math.round(value * 100) > 0) || !date || !categoryId || typeof d.description !== 'string') return null
    return {
      transactionType: type,
      amount: value.toFixed(2),
      description: d.description,
      categoryId,
      date,
      occurredAt: new Date(`${date}T12:00:00Z`),
      note: text(d.note),
      tags: Array.isArray(d.tags) ? d.tags.filter((t): t is string => typeof t === 'string') : null,
      transferKind: text(d.transferKind),
      linkedInvestmentOrderId: text(d.linkedInvestmentOrderId),
      createdAt: time(d.createdAt) ?? new Date(),
    }
  },
  toRecord: (r) =>
    compact({
      id: r.id,
      categoryId: r.categoryId ?? 'uncategorized',
      type: r.transactionType,
      amount: Number(r.amount),
      description: r.description,
      note: r.note,
      tags: r.tags,
      linkedInvestmentOrderId: r.linkedInvestmentOrderId,
      transferKind: r.transferKind,
      date: r.date ?? bangkokDay(r.occurredAt),
      createdAt: iso(r.createdAt),
    }),
  emptyRow: { transactionType: 'EXPENSE', amount: '0.01', description: '' },
  // Rows from the bot keep their source and message id when edited in the app.
  insertOnly: { source: 'app', sourceMessageId: 'sync' },
}

/** Every own-table kind. */
export const TABLE_KINDS: Record<OwnTableKind, TableKind> = { category, budget, goal, debt, transaction }
