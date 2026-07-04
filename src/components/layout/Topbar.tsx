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
        'sticky top-0 z-10 flex h-14 items-center gap-3 px-4 md:px-6',
        'bg-white/80 border-b-2 border-slate-200 backdrop-blur-md',
        'dark:bg-slate-950/80 dark:border-b-2 dark:border-slate-800/80'
      )}
    >
      {/* Mobile Mascot & App Name */}
      <div className="flex items-center gap-1.5 lg:hidden">
        <span className="text-xl">🦉</span>
        <span className="text-[11px] font-black tracking-wider text-[#58cc02] dark:text-[#58cc02] uppercase leading-none">
          FinanceMe
        </span>
      </div>

      {/* Screen Title (Desktop & Safe center on Mobile) */}
      <div className="hidden lg:flex items-center gap-2.5">
        <h1 className="text-sm font-black tracking-tight text-slate-800 dark:text-white uppercase">
          {title}
        </h1>
        {pathname === '/dashboard' && (
          <span className="flex items-center gap-1.5 rounded-full border border-[#58cc02]/20 bg-[#58cc02]/10 px-2 py-0.5 dark:border-[#58cc02]/10 dark:bg-[#58cc02]/15">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#58cc02]" />
            <span className="text-[9px] font-black uppercase text-[#58cc02] tracking-wider">Live Quest</span>
          </span>
        )}
      </div>

      <div className="flex-1 text-center lg:hidden">
        <h1 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{title}</h1>
      </div>

      {/* Action Area */}
      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        <button
          onClick={() => setOpen(true)}
          aria-label="ค้นหาข้อมูล"
          className={cn(
            'flex items-center gap-2 rounded-xl px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all'
          )}
        >
          <Search className="h-4 w-4 stroke-[2.5px]" />
          <span className="hidden items-center gap-1 text-[10px] font-black md:flex text-slate-400">
            <kbd className="rounded bg-slate-100 border border-slate-200 px-1 py-0.5 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-850">
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
