'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DebtItem, DebtPayment, DebtType, DebtCategory } from '@/types/debt'
import { useTransactionStore } from './useTransactionStore'
import { useCategoryStore } from './useCategoryStore'

export interface CreateDebtInput {
  personName: string
  type: DebtType
  category: DebtCategory
  totalAmount: number
  startDate: string
  dueDate?: string
  note?: string
  color?: string
}

export interface AddPaymentInput {
  amount: number
  date: string
  note?: string
  createTransaction?: boolean
  categoryId?: string
}

interface DebtStore {
  debts: DebtItem[]
  addDebt: (
    input: CreateDebtInput,
    initialTx?: { create: boolean; categoryId?: string }
  ) => DebtItem
  updateDebt: (id: string, updates: Partial<Omit<DebtItem, 'id' | 'payments' | 'createdAt'>>) => void
  deleteDebt: (id: string) => void
  addPayment: (debtId: string, input: AddPaymentInput) => void
  deletePayment: (debtId: string, paymentId: string) => void
  getDebtById: (id: string) => DebtItem | undefined
  getTotalIOwe: () => number
  getTotalOwedToMe: () => number
  getNetDebt: () => number
  getTotalCleared: () => number
}

const DEFAULT_DEBT_COLORS: Record<DebtCategory, string> = {
  person: '#3b82f6',
  credit_card: '#ec4899',
  loan: '#8b5cf6',
  family: '#10b981',
  other: '#f59e0b',
}

export const useDebtStore = create<DebtStore>()(
  persist(
    (set, get) => ({
      debts: [],

      addDebt: (input, initialTx) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const color = input.color || DEFAULT_DEBT_COLORS[input.category] || '#3b82f6'

        let initialTransactionId: string | undefined = undefined

        if (initialTx?.create) {
          const categoryStore = useCategoryStore.getState()
          const txStore = useTransactionStore.getState()

          const isIOwe = input.type === 'I_OWE'
          const txType = isIOwe ? 'INCOME' : 'EXPENSE'
          const fallbackCat = categoryStore.getCategoriesByType(txType)[0]?.id || ''
          const catId = initialTx.categoryId || fallbackCat

          const desc = isIOwe
            ? `ยืมเงินจาก: ${input.personName}`
            : `ให้ยืมเงิน: ${input.personName}`

          txStore.addTransaction({
            type: txType,
            amount: input.totalAmount,
            categoryId: catId,
            date: input.startDate,
            description: desc,
            note: input.note ? `[หนี้สิน/ยืม-คืน] ${input.note}` : '[หนี้สิน/ยืม-คืน]',
            tags: ['หนี้สิน', input.personName],
          })

          const createdTx = txStore.transactions[0]
          if (createdTx) {
            initialTransactionId = createdTx.id
          }
        }

        const newDebt: DebtItem = {
          id,
          personName: input.personName.trim(),
          type: input.type,
          category: input.category,
          totalAmount: Math.max(0, input.totalAmount),
          paidAmount: 0,
          startDate: input.startDate,
          dueDate: input.dueDate || undefined,
          note: input.note?.trim() || undefined,
          color,
          isSettled: false,
          payments: [],
          initialTransactionId,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          debts: [newDebt, ...state.debts],
        }))

        return newDebt
      },

      updateDebt: (id, updates) => {
        const now = new Date().toISOString()
        set((state) => ({
          debts: state.debts.map((d) => {
            if (d.id !== id) return d
            const nextTotal = updates.totalAmount !== undefined ? Math.max(0, updates.totalAmount) : d.totalAmount
            const nextPaid = d.paidAmount
            return {
              ...d,
              ...updates,
              totalAmount: nextTotal,
              isSettled: nextPaid >= nextTotal,
              updatedAt: now,
            }
          }),
        }))
      },

      deleteDebt: (id) => {
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
        }))
      },

      addPayment: (debtId, input) => {
        const debt = get().debts.find((d) => d.id === debtId)
        if (!debt) return

        const paymentId = crypto.randomUUID()
        const now = new Date().toISOString()
        const payAmount = Math.max(0, input.amount)
        if (payAmount <= 0) return

        let transactionId: string | undefined = undefined

        if (input.createTransaction) {
          const categoryStore = useCategoryStore.getState()
          const txStore = useTransactionStore.getState()

          const isIOwe = debt.type === 'I_OWE'
          const txType = isIOwe ? 'EXPENSE' : 'INCOME'
          const fallbackCat = categoryStore.getCategoriesByType(txType)[0]?.id || ''
          const catId = input.categoryId || fallbackCat

          const desc = isIOwe
            ? `ชำระหนี้คืน: ${debt.personName}${input.note ? ` (${input.note})` : ''}`
            : `รับคืนเงินจาก: ${debt.personName}${input.note ? ` (${input.note})` : ''}`

          txStore.addTransaction({
            type: txType,
            amount: payAmount,
            categoryId: catId,
            date: input.date,
            description: desc,
            note: `[ชำระหนี้/ยืม-คืน] ${debt.personName}`,
            tags: ['ชำระหนี้', debt.personName],
          })

          const createdTx = txStore.transactions[0]
          if (createdTx) {
            transactionId = createdTx.id
          }
        }

        const newPayment: DebtPayment = {
          id: paymentId,
          debtId,
          amount: payAmount,
          date: input.date,
          note: input.note?.trim() || undefined,
          transactionId,
          createdAt: now,
        }

        set((state) => ({
          debts: state.debts.map((d) => {
            if (d.id !== debtId) return d
            const nextPayments = [...d.payments, newPayment]
            const nextPaid = nextPayments.reduce((sum, p) => sum + p.amount, 0)
            return {
              ...d,
              paidAmount: nextPaid,
              isSettled: nextPaid >= d.totalAmount,
              payments: nextPayments,
              updatedAt: now,
            }
          }),
        }))
      },

      deletePayment: (debtId, paymentId) => {
        const now = new Date().toISOString()
        set((state) => ({
          debts: state.debts.map((d) => {
            if (d.id !== debtId) return d
            const nextPayments = d.payments.filter((p) => p.id !== paymentId)
            const nextPaid = nextPayments.reduce((sum, p) => sum + p.amount, 0)
            return {
              ...d,
              paidAmount: nextPaid,
              isSettled: nextPaid >= d.totalAmount,
              payments: nextPayments,
              updatedAt: now,
            }
          }),
        }))
      },

      getDebtById: (id) => get().debts.find((d) => d.id === id),

      getTotalIOwe: () =>
        get()
          .debts.filter((d) => d.type === 'I_OWE' && !d.isSettled)
          .reduce((sum, d) => sum + Math.max(0, d.totalAmount - d.paidAmount), 0),

      getTotalOwedToMe: () =>
        get()
          .debts.filter((d) => d.type === 'OWED_TO_ME' && !d.isSettled)
          .reduce((sum, d) => sum + Math.max(0, d.totalAmount - d.paidAmount), 0),

      getNetDebt: () => get().getTotalOwedToMe() - get().getTotalIOwe(),

      getTotalCleared: () =>
        get()
          .debts.filter((d) => d.isSettled)
          .reduce((sum, d) => sum + d.totalAmount, 0),
    }),
    {
      name: 'finance-debts',
    }
  )
)
