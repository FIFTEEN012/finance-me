'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingStore {
  completed:  boolean
  step:       number
  setStep:    (step: number) => void
  complete:   () => void
  reset:      () => void
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      completed: false,
      step:      0,
      setStep:   (step) => set({ step }),
      complete:  () => set({ completed: true, step: 0 }),
      reset:     () => set({ completed: false, step: 0 }),
    }),
    { name: 'finance-onboarding' }
  )
)
