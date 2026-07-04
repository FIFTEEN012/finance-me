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
          'fixed bottom-4 inset-x-0 z-40 flex h-18 w-[92%] max-w-lg mx-auto items-center px-2',
          'bg-white/95 border-2 border-slate-200 rounded-3xl',
          'dark:bg-slate-900/95 dark:border-slate-800',
          'shadow-[0_8px_20px_-4px_rgba(0,0,0,0.15),0_6px_0_0_#e5e5e5] dark:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4),0_6px_0_0_#020617]',
          'lg:hidden transition-all duration-300'
        )}
      >
        <div className="flex w-full items-center justify-around">
          {/* First two items */}
          {PRIMARY.filter(Boolean).slice(0, 2).map((item) => {
            const it = item!
            const isActive = pathname === it.href || pathname.startsWith(it.href + '/')
            return (
              <Link
                key={it.href}
                href={it.href}
                className="flex flex-col items-center justify-center flex-1 py-1.5 transition-transform active:scale-95"
              >
                <it.icon
                  className={cn(
                    'h-[22px] w-[22px] transition-colors',
                    isActive ? 'text-[#58cc02] scale-110' : 'text-slate-400 dark:text-slate-500'
                  )}
                />
                <span
                  className={cn(
                    'truncate text-[10px] font-black tracking-wide mt-1 transition-colors',
                    isActive ? 'text-[#58cc02]' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {it.label}
                </span>
              </Link>
            )
          })}

          {/* Centered Plus Action Button */}
          <button
            onClick={() => setOpen(true)}
            aria-label="บันทึกด่วน"
            className={cn(
              'relative -top-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#58cc02] text-white border-2 border-[#2b6c00] border-b-4 shadow-[0_3px_0_0_#2b6c00]',
              'active:translate-y-[2px] active:border-b-2 transition-all duration-100 select-none'
            )}
          >
            <Plus className="h-6 w-6 stroke-[3px]" />
          </button>

          {/* Last two items + More button */}
          {PRIMARY.filter(Boolean).slice(2).map((item) => {
            const it = item!
            const isActive = pathname === it.href || pathname.startsWith(it.href + '/')
            return (
              <Link
                key={it.href}
                href={it.href}
                className="flex flex-col items-center justify-center flex-1 py-1.5 transition-transform active:scale-95"
              >
                <it.icon
                  className={cn(
                    'h-[22px] w-[22px] transition-colors',
                    isActive ? 'text-[#58cc02] scale-110' : 'text-slate-400 dark:text-slate-500'
                  )}
                />
                <span
                  className={cn(
                    'truncate text-[10px] font-black tracking-wide mt-1 transition-colors',
                    isActive ? 'text-[#58cc02]' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {it.label}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setMoreOpen(true)}
            aria-label="เมนูเพิ่มเติม"
            className="flex flex-col items-center justify-center flex-1 py-1.5 transition-transform active:scale-95"
          >
            <MoreHorizontal
              className={cn(
                'h-[22px] w-[22px] transition-colors',
                isSecondaryActive ? 'text-[#58cc02] scale-110' : 'text-slate-400 dark:text-slate-500'
              )}
            />
            <span
              className={cn(
                'text-[10px] font-black tracking-wide mt-1',
                isSecondaryActive ? 'text-[#58cc02]' : 'text-slate-400 dark:text-slate-500'
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
            'rounded-t-[32px] border-t-2 border-x-2 border-slate-200 px-0 pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.08),0_-6px_0_0_#e5e5e5]',
            'bg-white dark:bg-slate-900 dark:border-slate-800 dark:shadow-[0_-8px_24px_rgba(0,0,0,0.3),0_-6px_0_0_#020617]'
          )}
        >
          <SheetHeader className="border-b-2 border-slate-100 px-5 pb-3 pt-1 dark:border-slate-800">
            <SheetTitle className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              ✨ ภารกิจและเมนูเพิ่มเติม
            </SheetTitle>
          </SheetHeader>

          <nav className="grid grid-cols-2 gap-2.5 px-4 py-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {SECONDARY.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-[13px] font-bold border-2 transition-all select-none',
                    isActive
                      ? 'bg-[#58cc02] text-white border-[#2b6c00] border-b-4 shadow-[0_2px_0_0_#2b6c00] hover:bg-[#58cc02]'
                      : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4.5 w-4.5 flex-shrink-0',
                      isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mx-5 my-1 h-0.5 bg-slate-100 dark:bg-slate-800" />

          <div className="flex items-center gap-3 px-5 py-3.5">
            <DataManager />
            <ThemeToggle />
            <button
              onClick={() => setMoreOpen(false)}
              aria-label="ปิดเมนู"
              className={cn(
                'ml-auto rounded-xl p-2 text-slate-400 border border-slate-200 hover:bg-slate-100',
                'dark:text-slate-500 dark:border-slate-700 dark:hover:bg-slate-800/60 transition-colors'
              )}
            >
              <X className="h-4 w-4 stroke-[2.5px]" />
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
