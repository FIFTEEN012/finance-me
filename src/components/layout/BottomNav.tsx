'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  PiggyBank,
  Tags,
  Target,
  TrendingUp,
  MoreHorizontal,
  Plus,
  X,
  Settings,
  SplitSquareHorizontal,
  FileUp,
  Dumbbell,
  Flame,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataManager } from '@/components/shared/DataManager'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useQuickAddStore } from '@/store/useQuickAddStore'
import { cn } from '@/lib/utils'

const PRIMARY = [
  { href: '/dashboard', label: 'หน้าแรก', icon: LayoutDashboard },
  { href: '/transactions', label: 'ธุรกรรม', icon: ArrowLeftRight },
  null,
  { href: '/reports', label: 'รายงาน', icon: BarChart3 },
  { href: '/budgets', label: 'งบประมาณ', icon: PiggyBank },
]

const SECONDARY = [
  { href: '/workouts', label: 'ออกกำลังกาย', icon: Dumbbell },
  { href: '/routines', label: 'แผนออกกำลังกาย', icon: Flame },
  { href: '/categories', label: 'หมวดหมู่', icon: Tags },
  { href: '/goals', label: 'เป้าหมายออม', icon: Target },
  { href: '/investments', label: 'พอร์ตลงทุน', icon: TrendingUp },
  { href: '/bill-split', label: 'แบ่งบิล', icon: SplitSquareHorizontal },
  { href: '/import', label: 'นำเข้าข้อมูล', icon: FileUp },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname() ?? ''
  const { setOpen } = useQuickAddStore()
  const [moreOpen, setMoreOpen] = useState(false)

  const isSecondaryActive = SECONDARY.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      <nav
        className={cn(
          'fixed bottom-0 inset-x-0 z-40 flex h-16 items-end pb-safe md:hidden',
          'bg-white/90 border-t border-[oklch(0.905_0.010_270)]',
          'dark:bg-[rgba(8,5,18,0.88)] dark:backdrop-blur-2xl dark:border-t dark:border-white/[0.06]',
          'shadow-[0_-1px_0_rgba(0,0,0,0.04),0_-4px_16px_rgba(0,0,0,0.06)]',
          'dark:shadow-[0_-1px_0_rgba(255,255,255,0.04),0_-4px_24px_rgba(0,0,0,0.4)]'
        )}
      >
        <div className="flex h-full flex-1 items-center justify-around">
          {PRIMARY.filter(Boolean).slice(0, 2).map((item) => {
            const it = item!
            const isActive = pathname === it.href || pathname.startsWith(it.href + '/')
            return (
              <Link key={it.href} href={it.href} className="relative flex min-w-0 flex-col items-center gap-0.5 px-3 py-1.5">
                <it.icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-primary' : 'text-gray-400 dark:text-white/35')} />
                <span className={cn('truncate text-[10px] font-medium transition-colors', isActive ? 'text-primary' : 'text-gray-400 dark:text-white/30')}>
                  {it.label}
                </span>
                {isActive && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-primary" />}
              </Link>
            )
          })}
        </div>

        <button
          onClick={() => setOpen(true)}
          className={cn(
            'relative -top-4 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary shadow-lg',
            'active:scale-95 transition-transform duration-150'
          )}
        >
          <Plus className="h-6 w-6 text-white" />
        </button>

        <div className="flex h-full flex-1 items-center justify-around">
          {PRIMARY.filter(Boolean).slice(2).map((item) => {
            const it = item!
            const isActive = pathname === it.href || pathname.startsWith(it.href + '/')
            return (
              <Link key={it.href} href={it.href} className="relative flex min-w-0 flex-col items-center gap-0.5 px-3 py-1.5">
                <it.icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-primary' : 'text-gray-400 dark:text-white/35')} />
                <span className={cn('truncate text-[10px] font-medium transition-colors', isActive ? 'text-primary' : 'text-gray-400 dark:text-white/30')}>
                  {it.label}
                </span>
                {isActive && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-primary" />}
              </Link>
            )
          })}

          <button onClick={() => setMoreOpen(true)} className="flex min-w-0 flex-col items-center gap-0.5 px-3 py-1.5">
            <MoreHorizontal
              className={cn(
                'h-5 w-5 transition-colors',
                isSecondaryActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-white/35'
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium',
                isSecondaryActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-white/30'
              )}
            >
              เพิ่มเติม
            </span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className={cn(
            'rounded-t-2xl px-0 pb-safe',
            'bg-white border-t border-[oklch(0.905_0.010_270)]',
            'dark:bg-[rgba(8,5,18,0.96)] dark:backdrop-blur-2xl dark:border-white/[0.06]'
          )}
        >
          <SheetHeader className="border-b border-gray-100 px-5 pb-3 pt-1 dark:border-white/[0.05]">
            <SheetTitle className="text-sm font-semibold text-gray-800 dark:text-white/80">เมนูเพิ่มเติม</SheetTitle>
          </SheetHeader>

          <nav className="grid grid-cols-2 gap-1 px-3 py-3">
            {SECONDARY.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50 dark:text-white/50 dark:hover:bg-white/[0.04]'
                  )}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary' : 'text-gray-400 dark:text-white/30')} />
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
              className="ml-auto rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:text-white/30 dark:hover:bg-white/[0.05]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
