'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  BarChart3,
  Wallet,
  Tags,
  Target,
  TrendingUp,
  Settings,
  SplitSquareHorizontal,
  FileUp,
  Dumbbell,
  Flame,
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
    ]
  },
  {
    title: 'Investments',
    items: [
      { href: '/investments', label: 'พอร์ตลงทุน', icon: TrendingUp },
      { href: '/bill-split', label: 'แบ่งบิล', icon: SplitSquareHorizontal },
    ]
  },
  {
    title: 'Health & Workout',
    items: [
      { href: '/workouts', label: 'ออกกำลังกาย', icon: Dumbbell },
      { href: '/routines', label: 'แผนออกกำลังกาย', icon: Flame },
    ]
  },
  {
    title: 'System',
    items: [
      { href: '/categories', label: 'หมวดหมู่', icon: Tags },
      { href: '/import', label: 'นำเข้าข้อมูล', icon: FileUp },
      { href: '/settings', label: 'ตั้งค่า', icon: Settings },
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname() ?? ''

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col overflow-hidden',
        'bg-white border-2 border-slate-200 rounded-3xl',
        'dark:bg-slate-900/90 dark:border-slate-800',
        'shadow-[0_8px_0_0_#e5e5e5] dark:shadow-[0_8px_0_0_#020617]'
      )}
    >
      {/* Sidebar Header */}
      <div className="p-5 flex flex-col gap-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#58cc02] border-2 border-[#2b6c00] shadow-[0_3px_0_0_#2b6c00] text-white">
            <span className="text-xl">🦉</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-slate-800 dark:text-white leading-none">FinanceMe</h1>
            <p className="text-[10px] font-black text-[#58cc02] dark:text-[#58cc02] uppercase tracking-wider mt-1">Money & Health Quest</p>
          </div>
        </div>
      </div>

      <div className="mx-5 h-0.5 bg-slate-100 dark:bg-slate-800/80" />

      {/* Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar">
        {groupedNav.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <p className="px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest opacity-80">{group.title}</p>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-bold transition-all duration-100 select-none border-2',
                      isActive
                        ? 'bg-[#58cc02] text-white border-[#2b6c00] border-b-4 shadow-[0_3px_0_0_#2b6c00] transform active:translate-y-[2px] active:border-b-2 hover:bg-[#58cc02]'
                        : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
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

      {/* Profile / System Control Panel at the bottom */}
      <div className="p-4 border-t-2 border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0 space-y-3">
        {/* User Badge */}
        <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/80">
          <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 dark:bg-slate-700 dark:border-slate-600 flex items-center justify-center shrink-0 text-base">
            👤
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-xs text-slate-800 dark:text-white truncate">Quest Explorer</p>
            <p className="text-[9px] text-[#58cc02] dark:text-[#58cc02] uppercase font-black tracking-wide leading-none mt-0.5">Lv. 5 Pioneer</p>
          </div>
        </div>

        {/* System Settings & Actions */}
        <div className="flex items-center justify-between gap-2 px-1">
          <DataManager />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
