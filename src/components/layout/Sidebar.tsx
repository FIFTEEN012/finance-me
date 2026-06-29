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
  { href: '/dashboard',    label: 'แดชบอร์ด',       icon: LayoutDashboard },
  { href: '/transactions', label: 'ธุรกรรม',          icon: ArrowLeftRight  },
  { href: '/budgets',      label: 'งบประมาณ',         icon: PiggyBank       },
  { href: '/reports',      label: 'รายงาน',           icon: BarChart3       },
  { href: '/workouts',     label: 'ออกกำลังกาย',       icon: Dumbbell        },
  { href: '/routines',     label: 'แผนออกกำลังกาย',    icon: Flame           },
  { href: '/categories',   label: 'หมวดหมู่',         icon: Tags            },
  { href: '/goals',        label: 'เป้าหมาย',         icon: Target          },
  { href: '/investments', label: 'พอร์ตลงทุน',        icon: TrendingUp      },
  { href: '/bill-split',    label: 'แบ่งบิล',           icon: SplitSquareHorizontal      },
  { href: '/import',        label: 'นำเข้าข้อมูล',     icon: FileUp          },
  { href: '/settings',      label: 'ตั้งค่า',           icon: Settings        },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className={cn(
      'flex flex-col w-56 h-screen overflow-y-auto',
      // Light
      'bg-white border-r border-[oklch(0.905_0.010_270)]',
      // Dark — glass
      'dark:bg-[rgba(8,5,18,0.88)] dark:backdrop-blur-2xl dark:border-r dark:border-white/[0.05]',
    )}>

      {/* ── Logo ── */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          {/* Icon with gradient */}
          <div className={cn(
            'relative flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0',
            'bg-primary shadow-lg',
          )}>
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-gray-900 dark:text-white tracking-tight">FinanceMe</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary live-dot flex-shrink-0" />
              <p className="text-[10px] text-gray-400 dark:text-white/35 truncate">การเงินส่วนตัว</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 h-px bg-gray-100 dark:bg-white/[0.05]" />

      {/* ── Nav ── */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium',
                'transition-all duration-150',
                isActive
                  ? [
                    // Light active
                    'bg-primary/10 text-primary',
                    // Dark active
                    'dark:nav-active dark:text-primary',
                  ]
                  : [
                    // Light inactive
                    'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                    // Dark inactive
                    'dark:text-white/45 dark:hover:bg-white/[0.04] dark:hover:text-white/75',
                  ]
              )}
            >
              {/* Left accent bar (active only) */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-primary" />
              )}

              <Icon className={cn(
                'w-[15px] h-[15px] flex-shrink-0 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/55'
              )} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="px-2.5 pb-4 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
        <div className="flex items-center gap-2 py-1 px-1">
          <DataManager />
          <div className="flex-1" />
          <ThemeToggle />
        </div>
        <p className="text-[10px] text-gray-300 dark:text-white/20 text-center mt-1.5">v2.0 Violet Pro</p>
      </div>
    </aside>
  )
}
