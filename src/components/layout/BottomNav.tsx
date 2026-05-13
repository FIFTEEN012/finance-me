'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, BarChart3,
  PiggyBank, Tags, RefreshCw, Target, Scale, TrendingUp,
  MoreHorizontal, Plus, X, Calculator, CreditCard, Settings, Repeat2, Building2, SplitSquareHorizontal, FileUp,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataManager } from '@/components/shared/DataManager'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useQuickAddStore } from '@/store/useQuickAddStore'
import { cn } from '@/lib/utils'

/* ── Primary tabs (4 slots around the center +) ── */
const PRIMARY = [
  { href: '/dashboard',    label: 'หน้าแรก',  icon: LayoutDashboard },
  { href: '/transactions', label: 'ธุรกรรม',   icon: ArrowLeftRight  },
  null, // center slot
  { href: '/reports',      label: 'รายงาน',    icon: BarChart3       },
  { href: '/budgets',      label: 'งบประมาณ',  icon: PiggyBank       },
]

/* ── Secondary items (inside "More" sheet) ── */
const SECONDARY = [
  { href: '/categories', label: 'หมวดหมู่',      icon: Tags     },
  { href: '/recurring',  label: 'รายการประจำ',   icon: RefreshCw },
  { href: '/goals',        label: 'เป้าหมายออม',   icon: Target      },
  { href: '/accounts',    label: 'บัญชีธนาคาร',    icon: Building2   },
  { href: '/net-worth',   label: 'Net Worth',      icon: Scale       },
  { href: '/investments', label: 'พอร์ตลงทุน',     icon: TrendingUp  },
  { href: '/debt',          label: 'หนี้สิน',        icon: CreditCard  },
  { href: '/subscriptions', label: 'Subscriptions',  icon: Repeat2                 },
  { href: '/bill-split',    label: 'แบ่งบิล',         icon: SplitSquareHorizontal  },
  { href: '/calculators',   label: 'คิดเลข',         icon: Calculator  },
  { href: '/import',        label: 'นำเข้าข้อมูล',   icon: FileUp      },
  { href: '/settings',      label: 'ตั้งค่า',         icon: Settings    },
]

export function BottomNav() {
  const pathname    = usePathname()
  const { setOpen } = useQuickAddStore()
  const [moreOpen, setMoreOpen] = useState(false)

  const isSecondaryActive = SECONDARY.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      {/* ── Bar ── */}
      <nav className={cn(
        'fixed bottom-0 inset-x-0 z-40 md:hidden',
        'flex items-end h-16 pb-safe',
        // Light
        'bg-white/90 border-t border-[oklch(0.905_0.010_270)]',
        // Dark glass
        'dark:bg-[rgba(8,5,18,0.88)] dark:backdrop-blur-2xl dark:border-t dark:border-white/[0.06]',
        // Smooth shadow on top
        'shadow-[0_-1px_0_rgba(0,0,0,0.04),0_-4px_16px_rgba(0,0,0,0.06)]',
        'dark:shadow-[0_-1px_0_rgba(255,255,255,0.04),0_-4px_24px_rgba(0,0,0,0.4)]',
      )}>
        <div className="flex items-center justify-around w-full px-2 h-full">
          {PRIMARY.map((item, idx) => {
            /* Center + button */
            if (item === null) {
              return (
                <button
                  key="add"
                  onClick={() => setOpen(true)}
                  className={cn(
                    'relative -top-4 flex items-center justify-center',
                    'w-14 h-14 rounded-full',
                    'bg-primary shadow-lg',
                    'active:scale-95 transition-transform duration-150',
                  )}
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
              )
            }

            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-0"
              >
                <item.icon className={cn(
                  'w-5 h-5 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-gray-400 dark:text-white/35',
                )} />
                <span className={cn(
                  'text-[10px] font-medium transition-colors truncate',
                  isActive
                    ? 'text-primary'
                    : 'text-gray-400 dark:text-white/30',
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 w-5 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-0"
          >
            <MoreHorizontal className={cn(
              'w-5 h-5 transition-colors',
              isSecondaryActive
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-400 dark:text-white/35',
            )} />
            <span className={cn(
              'text-[10px] font-medium',
              isSecondaryActive
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-400 dark:text-white/30',
            )}>
              เพิ่มเติม
            </span>
          </button>
        </div>
      </nav>

      {/* ── "More" sheet ── */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className={cn(
            'rounded-t-2xl px-0 pb-safe',
            'bg-white dark:bg-[rgba(8,5,18,0.96)] dark:backdrop-blur-2xl',
            'border-t border-[oklch(0.905_0.010_270)] dark:border-white/[0.06]',
          )}
        >
          <SheetHeader className="px-5 pt-1 pb-3 border-b border-gray-100 dark:border-white/[0.05]">
            <SheetTitle className="text-sm font-semibold text-gray-800 dark:text-white/80">เมนูเพิ่มเติม</SheetTitle>
          </SheetHeader>

          <nav className="px-3 py-3 grid grid-cols-2 gap-1">
            {SECONDARY.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.04]',
                  )}
                >
                  <Icon className={cn(
                    'w-4 h-4 flex-shrink-0',
                    isActive ? 'text-primary' : 'text-gray-400 dark:text-white/30',
                  )} />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="mx-5 my-1 h-px bg-gray-100 dark:bg-white/[0.05]" />

          <div className="flex items-center gap-3 px-5 py-3">
            <DataManager />
            <ThemeToggle />
            <button
              onClick={() => setMoreOpen(false)}
              className="ml-auto p-2 rounded-xl text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
