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

// 4 Primary navigation slots around the center (+) button
const PRIMARY_LEFT = [
  { href: '/dashboard', label: 'หน้าแรก', icon: LayoutDashboard },
  { href: '/transactions', label: 'ธุรกรรม', icon: ArrowLeftRight },
]

const PRIMARY_RIGHT = [
  { href: '/budgets', label: 'งบประมาณ', icon: PiggyBank },
]

// All sub-features accessible via "More" (เพิ่มเติม) sheet
const SECONDARY = [
  { href: '/reports', label: 'รายงาน', icon: BarChart3, desc: 'สรุปภาพรวมรายรับ-จ่าย' },
  { href: '/cycle', label: 'รอบเดือน', icon: Droplets, desc: 'ติดตามวงล้อรอบเดือน' },
  { href: '/health', label: 'สุขภาพ', icon: HeartPulse, desc: 'บันทึกการออกกำลังกาย' },
  { href: '/reading', label: 'อ่านหนังสือ', icon: BookOpen, desc: 'บันทึกหน้าและทบทวน' },
  { href: '/goals', label: 'เป้าหมายออม', icon: Target, desc: 'ตั้งเป้าหมายการเงิน' },
  { href: '/investments', label: 'พอร์ตลงทุน', icon: TrendingUp, desc: 'สินทรัพย์และราคาตลาด' },
  { href: '/bill-split', label: 'แบ่งบิล', icon: SplitSquareHorizontal, desc: 'หารค่าใช้จ่ายกับเพื่อน' },
  { href: '/categories', label: 'หมวดหมู่', icon: Tags, desc: 'จัดการหมวดหมู่รายรับจ่าย' },
  { href: '/import', label: 'นำเข้าข้อมูล', icon: FileUp, desc: 'นำเข้าไฟล์ Statement' },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings, desc: 'โปรไฟล์ สกุลเงิน ธีม' },
]

export function BottomNav() {
  const pathname = usePathname() ?? ''
  const { setOpen } = useQuickAddStore()
  const [moreOpen, setMoreOpen] = useState(false)

  const isSecondaryActive = SECONDARY.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )

  return (
    <>
      {/* Unified Symmetrical Floating Capsule BottomNav (Mobile Only) */}
      <nav
        className={cn(
          'fixed bottom-4 inset-x-0 mx-auto w-[92%] max-w-lg z-40 lg:hidden',
          'h-18 rounded-3xl border-2 border-slate-200 dark:border-slate-800',
          'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md',
          'shadow-[0_8px_20px_-4px_rgba(0,0,0,0.15),0_6px_0_0_#e5e5e5] dark:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4),0_6px_0_0_#020617]',
          'px-2 flex items-center'
        )}
      >
        <div className="grid grid-cols-5 w-full items-center">
          {/* Left Slot 1 & 2 */}
          {PRIMARY_LEFT.map((navItem) => {
            const isActive = pathname === navItem.href || pathname.startsWith(`${navItem.href}/`)
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                className="flex flex-col items-center justify-center py-1 transition-transform active:scale-95"
              >
                <navItem.icon
                  className={cn(
                    'h-[22px] w-[22px] transition-colors',
                    isActive ? 'scale-110 text-[#58cc02]' : 'text-slate-400 dark:text-slate-500'
                  )}
                />
                <span
                  className={cn(
                    'mt-1 truncate text-[10px] font-black tracking-wide',
                    isActive ? 'text-[#58cc02]' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {navItem.label}
                </span>
              </Link>
            )
          })}

          {/* Center Slot 3: Elevated Centered Plus Button (+) */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setOpen(true)}
              aria-label="บันทึกด่วน"
              className="relative -top-4.5 h-13 w-13 rounded-2xl border-2 border-b-4 border-[#2b6c00] bg-[#58cc02] text-white shadow-[0_4px_0_0_#1e5000] active:translate-y-[2px] active:border-b-2 flex items-center justify-center transition-transform hover:scale-105 select-none"
            >
              <Plus className="h-7 w-7 stroke-[3.2px]" />
            </button>
          </div>

          {/* Right Slot 4: Budgets */}
          {PRIMARY_RIGHT.map((navItem) => {
            const isActive = pathname === navItem.href || pathname.startsWith(`${navItem.href}/`)
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                className="flex flex-col items-center justify-center py-1 transition-transform active:scale-95"
              >
                <navItem.icon
                  className={cn(
                    'h-[22px] w-[22px] transition-colors',
                    isActive ? 'scale-110 text-[#58cc02]' : 'text-slate-400 dark:text-slate-500'
                  )}
                />
                <span
                  className={cn(
                    'mt-1 truncate text-[10px] font-black tracking-wide',
                    isActive ? 'text-[#58cc02]' : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {navItem.label}
                </span>
              </Link>
            )
          })}

          {/* Right Slot 5: More (เพิ่มเติม) */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="เมนูเพิ่มเติม"
            className="flex flex-col items-center justify-center py-1 transition-transform active:scale-95"
          >
            <MoreHorizontal
              className={cn(
                'h-[22px] w-[22px] transition-colors',
                isSecondaryActive ? 'scale-110 text-[#58cc02]' : 'text-slate-400 dark:text-slate-500'
              )}
            />
            <span
              className={cn(
                'mt-1 truncate text-[10px] font-black tracking-wide',
                isSecondaryActive ? 'text-[#58cc02]' : 'text-slate-400 dark:text-slate-500'
              )}
            >
              เพิ่มเติม
            </span>
          </button>
        </div>
      </nav>

      {/* More Menu Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className={cn(
            'rounded-t-[32px] border-x-2 border-t-2 border-slate-200 bg-white px-0 pb-safe',
            'shadow-[0_-8px_24px_rgba(0,0,0,0.08),0_-6px_0_0_#e5e5e5]',
            'dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_-8px_24px_rgba(0,0,0,0.3),0_-6px_0_0_#020617]'
          )}
        >
          <SheetHeader className="border-b-2 border-slate-100 px-5 pb-3 pt-1 dark:border-slate-800">
            <SheetTitle className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
              เมนูเพิ่มเติม
            </SheetTitle>
          </SheetHeader>

          <nav className="custom-scrollbar grid max-h-[60vh] grid-cols-2 gap-2.5 overflow-y-auto px-4 py-4">
            {SECONDARY.map(({ href, label, icon: Icon, desc }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex select-none items-center gap-3 rounded-2xl border-2 px-3.5 py-3 transition-all',
                    isActive
                      ? 'border-[#2b6c00] border-b-4 bg-[#58cc02] text-white shadow-[0_3px_0_0_#2b6c00]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <p className="truncate text-xs font-black leading-tight">{label}</p>
                    {desc && (
                      <p
                        className={cn(
                          'truncate text-[10px] font-medium mt-0.5',
                          isActive ? 'text-white/80' : 'text-slate-400'
                        )}
                      >
                        {desc}
                      </p>
                    )}
                  </div>
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
