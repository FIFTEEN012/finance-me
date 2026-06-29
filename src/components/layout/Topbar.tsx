'use client'

import { usePathname } from 'next/navigation'
import { Wallet, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { CurrencyConverterWidget } from '@/components/shared/CurrencyConverterWidget'
import { SyncButton } from '@/components/shared/SyncButton'
import { useSearchStore } from '@/store/useSearchStore'

const pageTitles: Record<string, string> = {
  '/dashboard':    'แดชบอร์ด',
  '/transactions': 'รายการธุรกรรม',
  '/budgets':      'งบประมาณ',
  '/reports':      'รายงาน',
  '/categories':   'หมวดหมู่',
  '/goals':        'เป้าหมายการออม',
  '/bill-split':    'แบ่งบิล',
  '/settings':      'ตั้งค่า',
  '/workouts':     'ออกกำลังกาย',
  '/routines':     'แผนออกกำลังกาย',
}

export function Topbar() {
  const pathname        = usePathname()
  const title           = pageTitles[pathname] ?? 'FinanceMe'
  const { setOpen }     = useSearchStore()

  return (
    <header className={cn(
      'sticky top-0 z-10 flex items-center h-13 px-4 gap-3',
      // Light
      'bg-white/80 border-b border-[oklch(0.905_0.010_270)] backdrop-blur-lg',
      // Dark glass
      'dark:bg-[rgba(8,5,18,0.70)] dark:backdrop-blur-2xl dark:border-b dark:border-white/[0.05]',
    )}>
      {/* Mobile brand (no hamburger — BottomNav handles navigation) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600">
          <Wallet className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">FinanceMe</span>
      </div>

      {/* Desktop page title */}
      <div className="hidden md:flex items-center gap-2.5">
        <h1 className="text-[15px] font-semibold text-gray-900 dark:text-white/90 tracking-tight">{title}</h1>
        {pathname === '/dashboard' && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 live-dot" />
            <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">Live</span>
          </span>
        )}
      </div>

      {/* Mobile page title (centered) */}
      <div className="flex-1 md:hidden text-center">
        <h1 className="text-[14px] font-semibold text-gray-900 dark:text-white/90">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Search button — desktop shows shortcut hint, mobile shows icon */}
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors',
            'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60',
            'hover:bg-gray-100 dark:hover:bg-white/[0.05]',
          )}
        >
          <Search className="w-4 h-4" />
          <span className="hidden md:flex items-center gap-1 text-[11px]">
            <kbd className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 font-mono text-[10px] bg-gray-50 dark:bg-white/[0.03]">⌘K</kbd>
          </span>
        </button>
        <CurrencyConverterWidget />
        <SyncButton />
        <ThemeToggle />
      </div>
    </header>
  )
}
