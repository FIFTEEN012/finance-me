'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CurrencyCode = 'THB' | 'USD' | 'EUR' | 'JPY' | 'SGD' | 'GBP'
export type FirstDayOfWeek = 'monday' | 'sunday'
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type NumberFormat = 'thai' | 'international'
export type AccentColor = 'violet' | 'rose' | 'blue' | 'emerald' | 'amber' | 'indigo'

export interface AppSettings {
  displayName:    string
  avatarEmoji:    string
  currency:       CurrencyCode
  firstDayOfWeek: FirstDayOfWeek
  dateFormat:     DateFormat
  numberFormat:   NumberFormat
  compactNumbers: boolean
  accentColor:    AccentColor
}

const DEFAULT_SETTINGS: AppSettings = {
  displayName:    '',
  avatarEmoji:    '💰',
  currency:       'THB',
  firstDayOfWeek: 'monday',
  dateFormat:     'DD/MM/YYYY',
  numberFormat:   'thai',
  compactNumbers: false,
  accentColor:    'violet',
}

interface SettingsStore extends AppSettings {
  paydayDate:    number   // day of month 1–31 when salary arrives
  reportCoverImage: string | null
  update:        (patch: Partial<AppSettings>) => void
  setPaydayDate: (day: number) => void
  setReportCoverImage: (image: string | null) => void
  reset:         () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      paydayDate:    25,
      reportCoverImage: null,
      update:        (patch) => set((s) => ({ ...s, ...patch })),
      setPaydayDate: (day)   => set({ paydayDate: Math.max(1, Math.min(31, day)) }),
      setReportCoverImage: (image) => set({ reportCoverImage: image }),
      reset:         () => set({ ...DEFAULT_SETTINGS, paydayDate: 25, reportCoverImage: null }),
    }),
    { name: 'finance-settings' }
  )
)
