'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { SyncButton } from '@/components/shared/SyncButton'
import { useSearchStore } from '@/store/useSearchStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'

const pageTitles: Record<string, string> = {
  '/dashboard': 'แดชบอร์ด',
  '/transactions': 'รายการธุรกรรม',
  '/budgets': 'งบประมาณ',
  '/reports': 'รายงาน',
  '/categories': 'หมวดหมู่',
  '/goals': 'เป้าหมายการออม',
  '/cycle': 'รอบเดือน',
  '/bill-split': 'แบ่งบิล',
  '/settings': 'ตั้งค่า',
  '/investments': 'พอร์ตลงทุน',
  '/import': 'นำเข้าข้อมูล',
}

export function Topbar() {
  const pathname = usePathname() ?? ''
  const title = pageTitles[pathname] ?? 'FinanceMe'
  const { setOpen } = useSearchStore()
  const displayName = useSettingsStore((state) => state.displayName)
  const avatarEmoji = useSettingsStore((state) => state.avatarEmoji)
  const user = useAuthStore((state) => state.user)

  const profileName = displayName.trim() || user?.email?.split('@')[0] || 'Quest Explorer'
  const profileSubtitle = user ? 'Cloud Member' : 'Money Quest'

  return (
    <header
      className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b-2 border-[#becbb1] bg-[#faf9f9]/80 px-4 backdrop-blur-md md:px-6 dark:border-[#3b4630] dark:bg-[#161b11]/80 quest-topbar flex-shrink-0"
    >
      {/* Mobile branding logo */}
      <div className="flex items-center gap-1.5 lg:hidden">
        <span className="text-xl">🦉</span>
        <span className="text-[11px] font-black uppercase leading-none tracking-wider text-[var(--quest-primary-container)]">
          FinanceMe
        </span>
      </div>

      {/* Desktop page title */}
      <div className="hidden items-center gap-2.5 lg:flex">
        <h1 className="text-sm font-black uppercase tracking-tight text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]">
          {title}
        </h1>
        {pathname === '/dashboard' && (
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--quest-primary-container)]/20 bg-[var(--quest-primary-container)]/10 px-2 py-0.5 dark:border-[var(--quest-primary-container)]/10 dark:bg-[var(--quest-primary-container)]/15">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--quest-primary-container)]" />
            <span className="text-[9px] font-black uppercase tracking-wider text-[var(--quest-primary-container)]">Live</span>
          </span>
        )}
      </div>

      {/* Mobile centered page title */}
      <div className="flex-1 text-center lg:hidden">
        <h1 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
          {title}
        </h1>
      </div>

      {/* Right utility buttons */}
      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        <button
          onClick={() => setOpen(true)}
          aria-label="ค้นหาข้อมูล"
          className="flex items-center gap-2 rounded-full border-2 border-[#becbb1] bg-white px-3 py-1.5 text-[#6f7b64] hover:bg-[#f4f3f3] hover:text-[var(--quest-primary)] dark:border-[#3b4630] dark:bg-[#1c2117] dark:text-[#c2cfb4] dark:hover:bg-[#22281c] dark:hover:text-[var(--quest-primary-container)] transition-all cursor-pointer"
        >
          <Search className="h-4 w-4 stroke-[2.5px]" />
          <span className="hidden items-center gap-1 text-[10px] font-black text-[#6f7b64] dark:text-[#c2cfb4] md:flex">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-900">
              ⌘K
            </kbd>
          </span>
        </button>
        <SyncButton />
      </div>
    </header>
  )
}
