'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Subscription, SubscriptionBillingCycle } from '@/types'

/** Convert any billing cycle to monthly equivalent cost (in the subscription's own currency) */
export function toMonthlyAmount(amount: number, cycle: SubscriptionBillingCycle): number {
  switch (cycle) {
    case 'weekly':    return amount * 52 / 12
    case 'monthly':   return amount
    case 'quarterly': return amount / 3
    case 'yearly':    return amount / 12
  }
}

/** Compute the next billing date after today given a cycle */
export function nextBillingDate(from: string, cycle: SubscriptionBillingCycle): string {
  const d = new Date(from)
  const today = new Date()
  // Advance until it's in the future
  while (d <= today) {
    switch (cycle) {
      case 'weekly':    d.setDate(d.getDate() + 7);   break
      case 'monthly':   d.setMonth(d.getMonth() + 1); break
      case 'quarterly': d.setMonth(d.getMonth() + 3); break
      case 'yearly':    d.setFullYear(d.getFullYear() + 1); break
    }
  }
  return d.toISOString().slice(0, 10)
}

interface SubscriptionStore {
  subscriptions: Subscription[]

  addSubscription:    (s: Omit<Subscription, 'id' | 'createdAt'>) => void
  updateSubscription: (id: string, patch: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => void
  deleteSubscription: (id: string) => void
  toggleActive:       (id: string) => void

  /** Monthly total (THB only — for mixed-currency we return raw sum, page can convert) */
  getTotalMonthly:  () => number
  getTotalYearly:   () => number
  getUpcoming:      (days: number) => Subscription[]
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscriptions: [],

      addSubscription: (s) =>
        set((st) => ({
          subscriptions: [
            ...st.subscriptions,
            { ...s, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),

      updateSubscription: (id, patch) =>
        set((st) => ({
          subscriptions: st.subscriptions.map((s) =>
            s.id === id ? { ...s, ...patch } : s
          ),
        })),

      deleteSubscription: (id) =>
        set((st) => ({
          subscriptions: st.subscriptions.filter((s) => s.id !== id),
        })),

      toggleActive: (id) =>
        set((st) => ({
          subscriptions: st.subscriptions.map((s) =>
            s.id === id ? { ...s, active: !s.active } : s
          ),
        })),

      getTotalMonthly: () => {
        const { subscriptions } = get()
        return subscriptions
          .filter((s) => s.active)
          .reduce((sum, s) => sum + toMonthlyAmount(s.amount, s.billingCycle), 0)
      },

      getTotalYearly: () => {
        const { subscriptions } = get()
        return subscriptions
          .filter((s) => s.active)
          .reduce((sum, s) => sum + toMonthlyAmount(s.amount, s.billingCycle) * 12, 0)
      },

      getUpcoming: (days) => {
        const { subscriptions } = get()
        const now = new Date()
        const limit = new Date()
        limit.setDate(limit.getDate() + days)
        return subscriptions
          .filter((s) => {
            if (!s.active) return false
            const d = new Date(s.nextBillingDate)
            return d >= now && d <= limit
          })
          .sort((a, b) =>
            new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
          )
      },
    }),
    { name: 'finance-subscriptions' }
  )
)
