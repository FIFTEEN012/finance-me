'use client'

import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomNav } from './BottomNav'
import { QuickAddTransaction } from '@/components/shared/QuickAddTransaction'
import { ReceiptScanner } from '@/components/shared/ReceiptScanner'
import { GlobalSearch } from '@/components/shared/GlobalSearch'
import { OnboardingWizard } from '@/components/shared/OnboardingWizard'
import { PwaRegister } from '@/components/shared/PwaRegister'
import { ThemeApplier } from '@/components/shared/ThemeApplier'
import { useBudgetAlert } from '@/hooks/useBudgetAlert'
import { useSupabaseSync } from '@/hooks/useSupabaseSync'
import { useHydrated } from '@/hooks/useHydrated'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useInvestmentStore } from '@/store/useInvestmentStore'
import { usePortfolioSnapshot } from '@/hooks/usePortfolioSnapshot'
import { useExchangeRateStore } from '@/store/useExchangeRateStore'

export function AppShell({ children }: { children: React.ReactNode }) {
  useBudgetAlert()
  useSupabaseSync()

  const fetchRates = useExchangeRateStore((s) => s.fetchRates)
  const isStale = useExchangeRateStore((s) => s.isStale)
  useEffect(() => {
    if (isStale()) fetchRates()
  }, [fetchRates, isStale])

  const getRate = useExchangeRateStore((s) => s.getRate)
  const holdings = useInvestmentStore((s) => s.holdings)
  const portfolioValue = holdings.reduce(
    (sum, holding) => sum + holding.units * holding.currentPricePerUnit * getRate(holding.currency ?? 'THB'),
    0
  )
  void portfolioValue
  usePortfolioSnapshot()
  const hydrated = useHydrated()
  const onboardingCompleted = useOnboardingStore((s) => s.completed)

  return (
    <div className="flex h-screen overflow-hidden bg-[oklch(0.972_0.007_275)] dark:bg-[oklch(0.065_0.028_272)] app-bg">
      <div className="hidden dark:block grid-overlay" />

      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden app-content">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {hydrated ? children : (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 w-48 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((key) => (
                  <div key={key} className="h-28 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
                ))}
              </div>
              <div className="h-56 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
              <div className="h-56 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
            </div>
          )}
        </main>
      </div>

      <BottomNav />

      <QuickAddTransaction />
      <ReceiptScanner />
      <GlobalSearch />
      {hydrated && !onboardingCompleted && <OnboardingWizard />}
      <PwaRegister />
      <ThemeApplier />
    </div>
  )
}
