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

const navItems = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/transactions', label: 'ธุรกรรม', icon: ArrowLeftRight },
  { href: '/budgets', label: 'งบประมาณ', icon: PiggyBank },
  { href: '/reports', label: 'รายงาน', icon: BarChart3 },
  { href: '/workouts', label: 'ออกกำลังกาย', icon: Dumbbell },
  { href: '/routines', label: 'แผนออกกำลังกาย', icon: Flame },
  { href: '/categories', label: 'หมวดหมู่', icon: Tags },
  { href: '/goals', label: 'เป้าหมาย', icon: Target },
  { href: '/investments', label: 'พอร์ตลงทุน', icon: TrendingUp },
  { href: '/bill-split', label: 'แบ่งบิล', icon: SplitSquareHorizontal },
  { href: '/import', label: 'นำเข้าข้อมูล', icon: FileUp },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname() ?? ''

  return (
    <aside
      className={cn(
        'flex h-screen w-56 flex-col overflow-y-auto',
        'bg-white border-r border-[oklch(0.905_0.010_270)]',
        'dark:bg-[rgba(8,5,18,0.88)] dark:backdrop-blur-2xl dark:border-r dark:border-white/[0.05]'
      )}
    >
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className={cn('relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary shadow-lg')}>
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold tracking-tight text-gray-900 dark:text-white">FinanceMe</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="live-dot h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
              <p className="truncate text-[10px] text-gray-400 dark:text-white/35">การเงินส่วนตัว</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-gray-100 dark:bg-white/[0.05]" />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                isActive
                  ? ['bg-primary/10 text-primary', 'dark:nav-active dark:text-primary']
                  : ['text-gray-500 hover:bg-gray-50 hover:text-gray-800', 'dark:text-white/45 dark:hover:bg-white/[0.04] dark:hover:text-white/75']
              )}
            >
              {isActive && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />}

              <Icon
                className={cn(
                  'h-[15px] w-[15px] flex-shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/55'
                )}
              />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-100 px-2.5 pb-4 pt-2 dark:border-white/[0.05]">
        <div className="flex items-center gap-2 px-1 py-1">
          <DataManager />
          <div className="flex-1" />
          <ThemeToggle />
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-300 dark:text-white/20">v2.0 Violet Pro</p>
      </div>
    </aside>
  )
}
