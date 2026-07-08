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
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataManager } from '@/components/shared/DataManager'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'

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
      { href: '/reading', label: 'อ่านหนังสือ', icon: BookOpen },
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
  const displayName = useSettingsStore((state) => state.displayName)
  const avatarEmoji = useSettingsStore((state) => state.avatarEmoji)
  const user = useAuthStore((state) => state.user)

  const profileName = displayName.trim() || user?.email?.split('@')[0] || 'Quest Explorer'

  return (
    <aside
      className="flex h-full w-64 flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border-2 border-[#becbb1] dark:border-slate-800 shadow-[0_8px_0_0_#e5e5e5] dark:shadow-[0_8px_0_0_#020617]"
    >
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 flex-shrink-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[#2b6c00] bg-[#58cc02] text-white shadow-[0_3px_0_0_#2b6c00]">
          <span className="text-xl">🦉</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-quest-heading text-lg font-black tracking-tight text-[#58cc02] dark:text-[#87fe45] leading-tight">
            FinanceMe
          </h1>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#6f7b64] dark:text-[#c2cfb4] leading-none mt-0.5">
            Money Quest
          </p>
        </div>
      </div>

      <div className="mx-5 h-0.5 bg-slate-100 dark:bg-slate-800/80 flex-shrink-0" />

      {/* Navigation Links */}
      <nav className="quest-scrollbar flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {groupedNav.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="px-4 text-[10px] font-black text-[#3f4a36] uppercase tracking-widest opacity-60 dark:text-[#c2cfb4]">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all select-none',
                      isActive
                        ? 'bg-[#58cc02] text-white border-b-4 border-[#2b6c00] shadow-sm transform active:translate-y-[2px] active:border-b-0'
                        : 'hover:bg-[#f4f3f3] dark:hover:bg-slate-800 text-[#3f4a36] dark:text-[#c2cfb4] hover:text-[#2b6c00] dark:hover:text-[#87fe45]'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-[#6f7b64] dark:text-slate-500'
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

      {/* Footer Profile Pin & Utilities */}
      <div className="flex-shrink-0 border-t-2 border-[#becbb1] dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 space-y-3">
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full border-2 border-[#58cc02] overflow-hidden shrink-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-lg">
            {avatarEmoji}
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-sm truncate text-slate-800 dark:text-white">{profileName}</p>
            <p className="text-[10px] text-[#3f4a36] dark:text-[#c2cfb4] uppercase font-black opacity-60">
              Level 5 Pioneer
            </p>
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
