'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
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
import { clearRemovedFeatureStorage } from '@/lib/cloudSync'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  useBudgetAlert()
  useSupabaseSync()

  useEffect(() => {
    clearRemovedFeatureStorage()
  }, [])

  const fetchRates = useExchangeRateStore((state) => state.fetchRates)
  const isStale = useExchangeRateStore((state) => state.isStale)

  useEffect(() => {
    if (isStale()) fetchRates()
  }, [fetchRates, isStale])

  const getRate = useExchangeRateStore((state) => state.getRate)
  const holdings = useInvestmentStore((state) => state.holdings)
  const portfolioValue = holdings.reduce(
    (sum, holding) => sum + holding.units * holding.currentPricePerUnit * getRate(holding.currency ?? 'THB'),
    0
  )

  void portfolioValue
  usePortfolioSnapshot()

  const hydrated = useHydrated()
  const onboardingCompleted = useOnboardingStore((state) => state.completed)

  return (
    <div
      className="app-bg flex h-screen overflow-hidden bg-gradient-to-b from-green-50/30 via-slate-50/50 to-white dark:bg-slate-950 dark:from-slate-950 dark:via-slate-900/40 dark:to-slate-950/70 quest-shell"
    >
      <div className="hidden p-4 pr-0 lg:flex lg:shrink-0 xl:p-6 xl:pr-0">
        <Sidebar />
      </div>

      <div
        className="app-content flex min-w-0 flex-1 flex-col overflow-hidden quest-page"
      >
        <Topbar />
        <main
          className="flex-1 overflow-y-auto px-4 py-6 pb-28 lg:px-8 lg:py-8 lg:pb-8"
        >
          <div
            className="mx-auto w-full max-w-6xl"
          >
            {hydrated ? (
              children
            ) : (
              <div className="space-y-6 animate-pulse">
                <div className="h-8 w-48 rounded-xl bg-gray-200 dark:bg-white/[0.04]" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {[1, 2, 3].map((key) => (
                    <div key={key} className="h-28 rounded-2xl bg-gray-200 dark:bg-white/[0.04]" />
                  ))}
                </div>
                <div className="h-56 rounded-2xl bg-gray-200 dark:bg-white/[0.04]" />
                <div className="h-56 rounded-2xl bg-gray-200 dark:bg-white/[0.04]" />
              </div>
            )}
          </div>
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
