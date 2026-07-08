'use client'

import { usePathname } from 'next/navigation'
import { BriefcaseBusiness, ReceiptText, Search } from 'lucide-react'
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
  '/health': 'สุขภาพ',
  '/bill-split': 'แบ่งบิล',
  '/settings': 'ตั้งค่า',
  '/investments': 'พอร์ตลงทุน',
  '/import': 'นำเข้าข้อมูล',
}

export function Topbar() {
  const pathname = usePathname() ?? ''
  const isQuestPage =
    pathname === '/investments' ||
    pathname.startsWith('/investments/') ||
    pathname === '/bill-split' ||
    pathname.startsWith('/bill-split/')
  const title = pageTitles[pathname] ?? 'FinanceMe'
  const { setOpen } = useSearchStore()

  const questConfig =
    pathname === '/bill-split' || pathname.startsWith('/bill-split/')
      ? { subtitle: 'Bill Split Quest', Icon: ReceiptText }
      : { subtitle: 'Investment Mission Board', Icon: BriefcaseBusiness }

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-14 items-center gap-3 border-b-2 border-slate-200 bg-white/80 px-4 backdrop-blur-md md:px-6',
        'dark:border-slate-800/80 dark:bg-slate-950/80',
        isQuestPage && 'quest-topbar'
      )}
    >
      {isQuestPage ? (
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-2 border-[#2b6c00] bg-[#58cc02] text-[#1e5000] shadow-[0_3px_0_0_#1e5000]">
            <questConfig.Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-quest-heading text-sm font-black tracking-tight text-[#2b6c00] dark:text-[#87fe45]">
              Finance Quest
            </p>
            <p className="hidden truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[#6f7b64] sm:block dark:text-[#c2cfb4]">
              {questConfig.subtitle}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 lg:hidden">
            <span className="text-xl">🦉</span>
            <span className="text-[11px] font-black uppercase leading-none tracking-wider text-[#58cc02]">
              FinanceMe
            </span>
          </div>

          <div className="hidden items-center gap-2.5 lg:flex">
            <h1 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">{title}</h1>
            {pathname === '/dashboard' && (
              <span className="flex items-center gap-1.5 rounded-full border border-[#58cc02]/20 bg-[#58cc02]/10 px-2 py-0.5 dark:border-[#58cc02]/10 dark:bg-[#58cc02]/15">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#58cc02]" />
                <span className="text-[9px] font-black uppercase tracking-wider text-[#58cc02]">Live</span>
              </span>
            )}
          </div>

          <div className="flex-1 text-center lg:hidden">
            <h1 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">{title}</h1>
          </div>
        </>
      )}

      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        <button
          onClick={() => setOpen(true)}
          aria-label="ค้นหาข้อมูล"
          className={cn(
            'flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-2.5 py-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600',
            'dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300',
            isQuestPage &&
              'rounded-full border-2 border-[#becbb1] bg-white px-3 text-[#6f7b64] hover:bg-[#f4f3f3] hover:text-[#2b6c00] dark:border-[#3b4630] dark:bg-[#1c2117] dark:text-[#c2cfb4] dark:hover:bg-[#22281c] dark:hover:text-[#87fe45]'
          )}
        >
          <Search className="h-4 w-4 stroke-[2.5px]" />
          <span
            className={cn(
              'hidden items-center gap-1 text-[10px] font-black text-slate-400 md:flex',
              isQuestPage && 'text-[#6f7b64] dark:text-[#c2cfb4]'
            )}
          >
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-900">
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
