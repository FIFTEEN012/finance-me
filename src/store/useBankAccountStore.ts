'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BankAccount } from '@/types'

interface BankAccountStore {
  accounts: BankAccount[]

  addAccount:    (a: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateAccount: (id: string, patch: Partial<Omit<BankAccount, 'id' | 'createdAt'>>) => void
  deleteAccount: (id: string) => void
  updateBalance: (id: string, balance: number) => void
  toggleActive:  (id: string) => void

  /** ยอดรวมทุกบัญชีที่ active (กรอง currency ถ้าระบุ) */
  getTotalBalance: (currency?: string) => number

  /** รายการสกุลเงินที่มีในบัญชี */
  getCurrencies: () => string[]
}

export const useBankAccountStore = create<BankAccountStore>()(
  persist(
    (set, get) => ({
      accounts: [],

      addAccount: (a) =>
        set((s) => ({
          accounts: [
            ...s.accounts,
            {
              ...a,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateAccount: (id, patch) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
          ),
        })),

      deleteAccount: (id) =>
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      updateBalance: (id, balance) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === id ? { ...a, balance, updatedAt: new Date().toISOString() } : a
          ),
        })),

      toggleActive: (id) =>
        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === id
              ? { ...a, isActive: !a.isActive, updatedAt: new Date().toISOString() }
              : a
          ),
        })),

      getTotalBalance: (currency) => {
        const { accounts } = get()
        return accounts
          .filter((a) => a.isActive && (!currency || a.currency === currency))
          .reduce((sum, a) => sum + a.balance, 0)
      },

      getCurrencies: () => {
        const { accounts } = get()
        return [...new Set(accounts.filter((a) => a.isActive).map((a) => a.currency))]
      },
    }),
    { name: 'finance-bank-accounts' }
  )
)
