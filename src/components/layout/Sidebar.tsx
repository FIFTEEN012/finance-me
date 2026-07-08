'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  BarChart3,
  Tags,
  Target,
  TrendingUp,
  Settings,
  SplitSquareHorizontal,
  FileUp,
  HeartPulse,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataManager } from '@/components/shared/DataManager'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

const groupedNav = [
  {
    title: 'Finance',
    items: [
      { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
      { href: '/transactions', label: 'ธุรกรรม', icon: ArrowLeftRight },
      { href: '/budgets', label: 'งบประมาณ', icon: PiggyBank },
      { href: '/reports', label: 'รายงาน', icon: BarChart3 },
      { href: '/goals', label: 'เป้าหมาย', icon: Target },
    ],
  },
  {
    title: 'Portfolio',
    items: [
      { href: '/investments', label: 'พอร์ตลงทุน', icon: TrendingUp },
      { href: '/bill-split', label: 'แบ่งบิล', icon: SplitSquareHorizontal },
    ],
  },
  {
    title: 'Wellness',
    items: [
      { href: '/health', label: 'สุขภาพ', icon: HeartPulse },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/categories', label: 'หมวดหมู่', icon: Tags },
      { href: '/import', label: 'นำเข้าข้อมูล', icon: FileUp },
      { href: '/settings', label: 'ตั้งค่า', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname() ?? ''

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col overflow-hidden rounded-3xl border-2 border-slate-200 bg-white',
        'shadow-[0_8px_0_0_#e5e5e5] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_8px_0_0_#020617]'
      )}
    >
      <div className="flex-shrink-0 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[#2b6c00] bg-[#58cc02] text-white shadow-[0_3px_0_0_#2b6c00]">
            <span className="text-xl">🦉</span>
          </div>
          <div className="min-w-0">
            <h1 className="leading-none text-base font-black tracking-tight text-slate-800 dark:text-white">FinanceMe</h1>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#58cc02]">Money Quest</p>
          </div>
        </div>
      </div>

      <div className="mx-5 h-0.5 bg-slate-100 dark:bg-slate-800/80" />

      <nav className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {groupedNav.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-80 dark:text-slate-500">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group flex select-none items-center gap-3 rounded-2xl border-2 px-3.5 py-2.5 text-[13px] font-bold transition-all duration-100',
                      isActive
                        ? 'border-[#2b6c00] border-b-4 bg-[#58cc02] text-white shadow-[0_3px_0_0_#2b6c00]'
                        : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex-shrink-0 space-y-3 border-t-2 border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-150 bg-white p-1.5 dark:border-slate-700/80 dark:bg-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 text-base dark:border-slate-600 dark:bg-slate-700">
            👤
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-xs font-bold text-slate-800 dark:text-white">Quest Explorer</p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-wide text-[#58cc02]">Lv. 5 Pioneer</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-1">
          <DataManager />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
