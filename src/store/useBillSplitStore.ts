'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BillSplit, BillParticipant } from '@/types'

interface BillSplitStore {
  splits: BillSplit[]

  addSplit:        (s: Omit<BillSplit, 'id' | 'createdAt'>) => void
  updateSplit:     (id: string, patch: Partial<Omit<BillSplit, 'id' | 'createdAt'>>) => void
  deleteSplit:     (id: string) => void
  markPaid:        (splitId: string, participantId: string, paid: boolean) => void

  /** ยอดรวมที่คนอื่นเป็นหนี้เรา (paidBy === "ฉัน") */
  getTotalOwedToMe:   () => number
  /** ยอดรวมที่เราเป็นหนี้คนอื่น (เราเป็น participant, ยัง paid: false) */
  getTotalIOwe:       () => number
  /** จำนวน split ที่ยังค้างชำระ */
  getPendingCount:    () => number
}

export const useBillSplitStore = create<BillSplitStore>()(
  persist(
    (set, get) => ({
      splits: [],

      addSplit: (s) =>
        set((st) => ({
          splits: [
            { ...s, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
            ...st.splits,
          ],
        })),

      updateSplit: (id, patch) =>
        set((st) => ({
          splits: st.splits.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),

      deleteSplit: (id) =>
        set((st) => ({ splits: st.splits.filter((s) => s.id !== id) })),

      markPaid: (splitId, participantId, paid) =>
        set((st) => ({
          splits: st.splits.map((s) =>
            s.id === splitId
              ? {
                  ...s,
                  participants: s.participants.map((p) =>
                    p.id === participantId ? { ...p, paid } : p
                  ),
                }
              : s
          ),
        })),

      getTotalOwedToMe: () => {
        const { splits } = get()
        return splits
          .filter((s) => s.paidBy === 'ฉัน')
          .flatMap((s) => s.participants)
          .filter((p) => !p.paid && p.name !== 'ฉัน')
          .reduce((sum, p) => sum + p.share, 0)
      },

      getTotalIOwe: () => {
        const { splits } = get()
        return splits
          .filter((s) => s.paidBy !== 'ฉัน')
          .flatMap((s) => s.participants)
          .filter((p) => p.name === 'ฉัน' && !p.paid)
          .reduce((sum, p) => sum + p.share, 0)
      },

      getPendingCount: () => {
        const { splits } = get()
        return splits.filter((s) =>
          s.participants.some((p) => !p.paid && p.name !== s.paidBy)
        ).length
      },
    }),
    { name: 'finance-bill-splits' }
  )
)
