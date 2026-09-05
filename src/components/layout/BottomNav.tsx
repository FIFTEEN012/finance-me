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
  HeartPulse,
  BookOpen,
  Droplets,
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
  { href: '/cycle', label: 'รอบเดือน', icon: Droplets },
  { href: '/health', label: 'สุขภาพ', icon: HeartPulse },
  { href: '/reading', label: 'อ่านหนังสือ', icon: BookOpen },
  { href: '/categories', label: 'หมวดหมู่', icon: Tags },
  { href: '/goals', label: 'เป้าหมายออม', icon: Target },
  { href: '/investments', label: 'พอร์ตลงทุน', icon: TrendingUp },
  { href: '/bill-split', label: 'แบ่งบิล', icon: SplitSquareHorizontal },
  { href: '/import', label: 'นำเข้าข้อมูล', icon: FileUp },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname() ?? ''
  const isForestDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const isQuestPage =
    isForestDashboard ||
    pathname === '/categories' ||
    pathname.startsWith('/categories/') ||
    pathname === '/investments' ||
    pathname.startsWith('/investments/') ||
    pathname === '/bill-split' ||
    pathname.startsWith('/bill-split/')

  const { setOpen } = useQuickAddStore()
  const [moreOpen, setMoreOpen] = useState(false)

  const isSecondaryActive = SECONDARY.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 z-40 flex h-18 items-center px-2',
          isForestDashboard ? 'bottom-0 md:hidden' : 'lg:hidden',
          isForestDashboard
            ? 'h-20 border-x-0 border-b-0 border-t-2 border-[var(--forest-outline-variant)] bg-[var(--forest-surface)] shadow-[0_-2px_0_0_#becbb1]'
            : isQuestPage
              ? 'bottom-0 mx-0 h-20 w-full max-w-none rounded-none border-x-0 border-b-0 border-t-2 border-[#becbb1] bg-[#faf9f9] shadow-none dark:border-[#3b4630] dark:bg-[#161b11]'
              : 'bottom-4 mx-auto w-[92%] max-w-lg rounded-3xl border-2 border-slate-200 bg-white/95 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.15),0_6px_0_0_#e5e5e5] dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4),0_6px_0_0_#020617]'
        )}
      >
        <div className="flex w-full items-center justify-around">
          {PRIMARY.filter(Boolean)
            .slice(0, 2)
            .map((item) => {
              const navItem = item!
              const isActive = pathname === navItem.href || pathname.startsWith(`${navItem.href}/`)
              return (
                <Link
                  key={navItem.href}
                  href={navItem.href}
                  className="flex flex-1 flex-col items-center justify-center py-1.5 transition-transform active:scale-95"
                >
                  <navItem.icon
                    className={cn(
                      'h-[22px] w-[22px] transition-colors',
                      isActive
                        ? isForestDashboard
                          ? 'scale-110 text-[var(--forest-primary)]'
                          : 'scale-110 text-[#58cc02]'
                        : isForestDashboard
                          ? 'text-[var(--forest-muted)]'
                          : isQuestPage
                            ? 'text-[#6f7b64] dark:text-[#c2cfb4]'
                            : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span
                    className={cn(
                      'mt-1 truncate text-[10px] font-black tracking-wide',
                      isActive
                        ? isForestDashboard
                          ? 'text-[var(--forest-primary)]'
                          : 'text-[#58cc02]'
                        : isForestDashboard
                          ? 'text-[var(--forest-muted)]'
                          : isQuestPage
                            ? 'text-[#6f7b64] dark:text-[#c2cfb4]'
                            : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {navItem.label}
                  </span>
                </Link>
              )
            })}

          <button
            onClick={() => setOpen(true)}
            aria-label="บันทึกด่วน"
            className={cn(
              'relative flex flex-shrink-0 items-center justify-center select-none transition-all duration-100 active:translate-y-[2px]',
              isForestDashboard
                ? 'top-0 h-11 w-11 rounded-xl border-2 border-[var(--forest-primary)] bg-[var(--forest-primary-container)] text-[var(--forest-primary)] shadow-[0_4px_0_0_#1b4300]'
                : isQuestPage
                  ? 'top-0 h-11 w-11 rounded-xl border-2 border-[#2b6c00] bg-[#58cc02] text-[#1e5000] shadow-[0_4px_0_0_#1e5000]'
                  : '-top-4 h-12 w-12 rounded-2xl border-2 border-b-4 border-[#2b6c00] bg-[#58cc02] text-white shadow-[0_3px_0_0_#2b6c00] active:border-b-2'
            )}
          >
            <Plus className="h-6 w-6 stroke-[3px]" />
          </button>

          {PRIMARY.filter(Boolean)
            .slice(2)
            .map((item) => {
              const navItem = item!
              const isActive = pathname === navItem.href || pathname.startsWith(`${navItem.href}/`)
              return (
                <Link
                  key={navItem.href}
                  href={navItem.href}
                  className="flex flex-1 flex-col items-center justify-center py-1.5 transition-transform active:scale-95"
                >
                  <navItem.icon
                    className={cn(
                      'h-[22px] w-[22px] transition-colors',
                      isActive
                        ? isForestDashboard
                          ? 'scale-110 text-[var(--forest-primary)]'
                          : 'scale-110 text-[#58cc02]'
                        : isForestDashboard
                          ? 'text-[var(--forest-muted)]'
                          : isQuestPage
                            ? 'text-[#6f7b64] dark:text-[#c2cfb4]'
                            : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span
                    className={cn(
                      'mt-1 truncate text-[10px] font-black tracking-wide',
                      isActive
                        ? isForestDashboard
                          ? 'text-[var(--forest-primary)]'
                          : 'text-[#58cc02]'
                        : isForestDashboard
                          ? 'text-[var(--forest-muted)]'
                          : isQuestPage
                            ? 'text-[#6f7b64] dark:text-[#c2cfb4]'
                            : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {navItem.label}
                  </span>
                </Link>
              )
            })}

          <button
            onClick={() => setMoreOpen(true)}
            aria-label="เมนูเพิ่มเติม"
            className="flex flex-1 flex-col items-center justify-center py-1.5 transition-transform active:scale-95"
          >
            <MoreHorizontal
              className={cn(
                'h-[22px] w-[22px] transition-colors',
                isSecondaryActive
                  ? isForestDashboard
                    ? 'scale-110 text-[var(--forest-primary)]'
                    : 'scale-110 text-[#58cc02]'
                  : isForestDashboard
                    ? 'text-[var(--forest-muted)]'
                    : isQuestPage
                      ? 'text-[#6f7b64] dark:text-[#c2cfb4]'
                      : 'text-slate-400 dark:text-slate-500'
              )}
            />
            <span
              className={cn(
                'mt-1 text-[10px] font-black tracking-wide',
                isSecondaryActive
                  ? isForestDashboard
                    ? 'text-[var(--forest-primary)]'
                    : 'text-[#58cc02]'
                  : isForestDashboard
                    ? 'text-[var(--forest-muted)]'
                    : isQuestPage
                      ? 'text-[#6f7b64] dark:text-[#c2cfb4]'
                      : 'text-slate-400 dark:text-slate-500'
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
            'rounded-t-[32px] border-x-2 border-t-2 border-slate-200 bg-white px-0 pb-safe',
            'shadow-[0_-8px_24px_rgba(0,0,0,0.08),0_-6px_0_0_#e5e5e5]',
            'dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_-8px_24px_rgba(0,0,0,0.3),0_-6px_0_0_#020617]',
            isForestDashboard &&
              'border-[var(--forest-outline-variant)] bg-[var(--forest-surface)] shadow-[0_-6px_0_0_#becbb1]',
            !isForestDashboard &&
              isQuestPage &&
              'border-[#becbb1] bg-[#faf9f9] shadow-[0_-6px_0_0_#becbb1] dark:border-[#3b4630] dark:bg-[#161b11] dark:shadow-[0_-6px_0_0_#0f130c]'
          )}
        >
          <SheetHeader className="border-b-2 border-slate-100 px-5 pb-3 pt-1 dark:border-slate-800">
            <SheetTitle className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
              เมนูเพิ่มเติม
            </SheetTitle>
          </SheetHeader>

          <nav className="custom-scrollbar grid max-h-[60vh] grid-cols-2 gap-2.5 overflow-y-auto px-4 py-4">
            {SECONDARY.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex select-none items-center gap-3 rounded-2xl border-2 px-4 py-3 text-[13px] font-bold transition-all',
                    isActive
                      ? isForestDashboard
                        ? 'border-[var(--forest-primary)] border-b-4 bg-[var(--forest-primary)] text-white shadow-[0_2px_0_0_#0a1b00]'
                        : 'border-[#2b6c00] border-b-4 bg-[#58cc02] text-white shadow-[0_2px_0_0_#2b6c00]'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
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
                'ml-auto rounded-xl border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-100',
                'dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-800/60'
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
