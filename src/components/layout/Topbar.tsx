'use client'

import { usePathname } from 'next/navigation'
import { Wallet, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { CurrencyConverterWidget } from '@/components/shared/CurrencyConverterWidget'
import { SyncButton } from '@/components/shared/SyncButton'
import { useSearchStore } from '@/store/useSearchStore'

const pageTitles: Record<string, string> = {
  '/dashboard': 'แดชบอร์ด',
  '/transactions': 'รายการธุรกรรม',
  '/budgets': 'งบประมาณ',
  '/reports': 'รายงาน',
  '/categories': 'หมวดหมู่',
  '/goals': 'เป้าหมายการออม',
  '/bill-split': 'แบ่งบิล',
  '/settings': 'ตั้งค่า',
  '/workouts': 'ออกกำลังกาย',
  '/routines': 'แผนออกกำลังกาย',
}

export function Topbar() {
  const pathname = usePathname() ?? ''
  const title = pageTitles[pathname] ?? 'FinanceMe'
  const { setOpen } = useSearchStore()

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-13 items-center gap-3 px-4',
        'bg-white/80 border-b border-[oklch(0.905_0.010_270)] backdrop-blur-lg',
        'dark:bg-[rgba(8,5,18,0.70)] dark:backdrop-blur-2xl dark:border-b dark:border-white/[0.05]'
      )}
    >
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-indigo-600">
          <Wallet className="h-3 w-3 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">FinanceMe</span>
      </div>

      <div className="hidden items-center gap-2.5 md:flex">
        <h1 className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white/90">{title}</h1>
        {pathname === '/dashboard' && (
          <span className="flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50 px-2 py-0.5 dark:border-violet-500/20 dark:bg-violet-500/10">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-violet-500" />
            <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">Live</span>
          </span>
        )}
      </div>

      <div className="flex-1 text-center md:hidden">
        <h1 className="text-[14px] font-semibold text-gray-900 dark:text-white/90">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors',
            'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            'dark:text-white/30 dark:hover:bg-white/[0.05] dark:hover:text-white/60'
          )}
        >
          <Search className="h-4 w-4" />
          <span className="hidden items-center gap-1 text-[11px] md:flex">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-white/10 dark:bg-white/[0.03]">
              ⌘K
            </kbd>
          </span>
        </button>
        <CurrencyConverterWidget />
        <SyncButton />
        <ThemeToggle />
      </div>
    </header>
  )
}
