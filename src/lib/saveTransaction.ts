'use client'

import type { Transaction, TransactionType } from '@/types'
import { useNutritionStore, type FoodInput } from '@/store/useNutritionStore'
import { useTransactionStore } from '@/store/useTransactionStore'

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>

const TYPES: TransactionType[] = ['INCOME', 'EXPENSE', 'TRANSFER']
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Throws, in Thai, when the server could not store `input` (it would refuse
 * it on sync and the transaction would exist on this device only).
 */
export function assertSavableTransaction(input: Partial<TransactionInput>): void {
  if (!input.type || !TYPES.includes(input.type)) throw new Error('ประเภทรายการไม่ถูกต้อง')
  const amount = input.amount
  // The server keeps two decimals and only positive amounts.
  if (typeof amount !== 'number' || !Number.isFinite(amount) || Math.round(amount * 100) <= 0) {
    throw new Error('จำนวนเงินต้องมากกว่า 0')
  }
  if (!input.categoryId?.trim()) throw new Error('กรุณาเลือกหมวดหมู่')
  if (!input.date || !DATE_KEY.test(input.date)) throw new Error('วันที่ไม่ถูกต้อง')
  if (typeof input.description !== 'string') throw new Error('กรุณาระบุรายละเอียด')
}

/**
 * Saves a new transaction on this device, with `food` as Food Entries linked
 * to it (a Food Expense). The sync engine uploads them together, in one push,
 * whenever the device is online.
 *
 * All or nothing: when the input cannot be saved it throws before anything is
 * created, so there is never an expense without its Food Entries or the other
 * way round.
 */
export function saveNewTransaction(
  input: TransactionInput,
  food: FoodInput[] = [],
): { id: string; foodIds: string[] } {
  assertSavableTransaction(input)
  const id = useTransactionStore.getState().addTransaction(input)
  const foodIds = food.length > 0 ? useNutritionStore.getState().addFoodForExpense(id, food) : []
  return { id, foodIds }
}

/** Saves an edit of transaction `id` on this device; throws (changing nothing) when it cannot be saved. */
export function saveTransactionEdit(id: string, patch: Partial<TransactionInput>): void {
  const current = useTransactionStore.getState().transactions.find((tx) => tx.id === id)
  if (!current) throw new Error('ไม่พบรายการนี้แล้ว อาจถูกลบจากอุปกรณ์อื่น')
  assertSavableTransaction({ ...current, ...patch })
  useTransactionStore.getState().updateTransaction(id, patch)
}
