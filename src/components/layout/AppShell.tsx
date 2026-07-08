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
  const pathname = usePathname() ?? ''
  const isQuestPage =
    pathname === '/investments' ||
    pathname.startsWith('/investments/') ||
    pathname === '/bill-split' ||
    pathname.startsWith('/bill-split/')

  useEffect(() => {
    clearRemovedFeatureStorage()
  }, [])

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
    <div
      className={cn(
        'flex h-screen overflow-hidden bg-gradient-to-b from-green-50/30 via-slate-50/50 to-white dark:bg-slate-950 dark:from-slate-950 dark:via-slate-900/40 dark:to-slate-950/70 app-bg',
        isQuestPage && 'quest-shell'
      )}
    >
      {!isQuestPage && <div className="hidden dark:block grid-overlay" />}

      {/* Desktop Sidebar Panel */}
      <div className="hidden lg:flex lg:shrink-0 p-4 xl:p-6 pr-0 xl:pr-0">
        <Sidebar />
      </div>

      <div className={cn('flex min-w-0 flex-1 flex-col overflow-hidden app-content', isQuestPage && 'quest-page')}>
        <Topbar />
        <main
          className={cn(
            'flex-1 overflow-y-auto px-4 py-6 pb-28 lg:px-8 lg:py-8 lg:pb-8',
            isQuestPage && 'px-0 py-0 pb-24 lg:px-0 lg:py-0 lg:pb-0'
          )}
        >
          <div className={cn('mx-auto w-full', !isQuestPage && 'max-w-5xl')}>
            {hydrated ? children : (
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
