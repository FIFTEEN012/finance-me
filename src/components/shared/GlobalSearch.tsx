'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, LayoutDashboard, ArrowLeftRight, PiggyBank,
  BarChart3, Tags, Target, Plus, TrendingUp, TrendingDown, ArrowRight,
  Wallet, Zap, Dumbbell,
} from 'lucide-react'
import { useSearchStore } from '@/store/useSearchStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useGoalStore } from '@/store/useGoalStore'
import { useQuickAddStore } from '@/store/useQuickAddStore'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'

/* ── Types ──────────────────────────────────────────────── */

type ResultType = 'action' | 'page' | 'transaction' | 'goal' | 'category'

interface Result {
  id:        string
  type:      ResultType
  title:     string
  subtitle?: string
  meta?:     string
  icon:      React.ElementType
  iconColor: string
  href?:     string
  action?:   () => void
}

/* ── Static data ─────────────────────────────────────────── */

const PAGES: Result[] = [
  { id: 'p-dashboard',    type: 'page', title: 'แดชบอร์ด',          subtitle: 'ภาพรวมการเงิน',             icon: LayoutDashboard, iconColor: 'text-violet-500', href: '/dashboard'    },
  { id: 'p-transactions', type: 'page', title: 'รายการธุรกรรม',      subtitle: 'บันทึกรายรับ-รายจ่าย',      icon: ArrowLeftRight,  iconColor: 'text-blue-500',   href: '/transactions' },
  { id: 'p-budgets',      type: 'page', title: 'งบประมาณ',            subtitle: 'ตั้งและติดตามงบ',            icon: PiggyBank,       iconColor: 'text-violet-500', href: '/budgets'      },
  { id: 'p-reports',      type: 'page', title: 'รายงาน',              subtitle: 'วิเคราะห์การเงิน',           icon: BarChart3,       iconColor: 'text-indigo-500', href: '/reports'      },
  { id: 'p-workouts',     type: 'page', title: 'ออกกำลังกาย',          subtitle: 'คลังท่าและประวัติการออกกำลังกาย', icon: Dumbbell,       iconColor: 'text-violet-500', href: '/workouts'     },
  { id: 'p-routines',     type: 'page', title: 'แผนออกกำลังกาย',       subtitle: 'ตารางฝึกและ Routine',       icon: Zap,            iconColor: 'text-amber-500',  href: '/routines'     },
  { id: 'p-categories',   type: 'page', title: 'หมวดหมู่',            subtitle: 'จัดการหมวดหมู่',             icon: Tags,            iconColor: 'text-pink-500',   href: '/categories'   },
  { id: 'p-goals',        type: 'page', title: 'เป้าหมายการออม',      subtitle: 'ติดตามเป้าหมาย',             icon: Target,          iconColor: 'text-amber-500',  href: '/goals'        },
]

const GROUP_LABEL: Record<ResultType, string> = {
  action:      'การดำเนินการ',
  page:        'หน้าต่างๆ',
  transaction: 'ธุรกรรม',
  goal:        'เป้าหมาย',
  category:    'หมวดหมู่',
}

const GROUP_ORDER: ResultType[] = ['action', 'page', 'transaction', 'goal', 'category']

/* ── Helpers ─────────────────────────────────────────────── */

function match(text: string, q: string) {
  return text.toLowerCase().includes(q.toLowerCase())
}

/* ── Component ───────────────────────────────────────────── */

export function GlobalSearch() {
  const { open, setOpen } = useSearchStore()
  const { setOpen: setQuickAdd } = useQuickAddStore()
  const router = useRouter()

  const [query,   setQuery]   = useState('')
  const [active,  setActive]  = useState(0)
  const inputRef              = useRef<HTMLInputElement>(null)
  const listRef               = useRef<HTMLDivElement>(null)

  const { transactions }   = useTransactionStore()
  const { categories }     = useCategoryStore()
  const { goals }          = useGoalStore()

  /* ── Keyboard shortcut: Cmd+K / Ctrl+K ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  /* Focus input when opened */
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  /* ── Build result list ── */
  const results = useMemo((): Result[] => {
    const q = query.trim()

    /* ── Empty query: show quick actions + top pages ── */
    if (!q) {
      const actions: Result[] = [
        {
          id: 'a-add-tx', type: 'action',
          title: 'เพิ่มรายการด่วน', subtitle: 'บันทึกรายรับหรือรายจ่ายใหม่',
          icon: Plus, iconColor: 'text-violet-600',
          action: () => { setOpen(false); setQuickAdd(true) },
        },
        {
          id: 'a-go-tx', type: 'action',
          title: 'ดูรายการธุรกรรมทั้งหมด', subtitle: 'ไปหน้า Transactions',
          icon: ArrowRight, iconColor: 'text-gray-400',
          href: '/transactions',
        },
      ]
      return [...actions, ...PAGES.slice(0, 6)]
    }

    const list: Result[] = []

    /* Actions */
    if (match('เพิ่มรายการ', q) || match('add', q) || match('บันทึก', q)) {
      list.push({
        id: 'a-add-tx', type: 'action',
        title: 'เพิ่มรายการด่วน', subtitle: 'บันทึกรายรับหรือรายจ่ายใหม่',
        icon: Plus, iconColor: 'text-violet-600',
        action: () => { setOpen(false); setQuickAdd(true) },
      })
    }

    /* Pages */
    PAGES.forEach(p => {
      if (match(p.title, q) || match(p.subtitle ?? '', q)) list.push(p)
    })

    /* Transactions (latest 200, max 5 results) */
    const txResults = transactions
      .filter(t => match(t.description, q) || match(String(t.amount), q))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
      .map(t => ({
        id:        `tx-${t.id}`,
        type:      'transaction' as ResultType,
        title:     t.description,
        subtitle:  formatDateShort(t.date),
        meta:      formatCurrency(t.amount),
        icon:      t.type === 'INCOME' ? TrendingUp : TrendingDown,
        iconColor: t.type === 'INCOME' ? 'text-violet-500' : 'text-red-500',
        href:      '/transactions',
      }))
    list.push(...txResults)

    /* Goals */
    goals
      .filter(g => match(g.name, q))
      .slice(0, 3)
      .forEach(g => list.push({
        id:        `goal-${g.id}`,
        type:      'goal',
        title:     g.name,
        subtitle:  `${formatCurrency(g.savedAmount)} / ${formatCurrency(g.targetAmount)}`,
        meta:      `${Math.round((g.savedAmount / g.targetAmount) * 100)}%`,
        icon:      Target,
        iconColor: 'text-amber-500',
        href:      '/goals',
      }))

    /* Categories */
    categories
      .filter(c => match(c.name, q))
      .slice(0, 4)
      .forEach(c => list.push({
        id:        `cat-${c.id}`,
        type:      'category',
        title:     c.name,
        subtitle:  c.type === 'INCOME' ? 'รายรับ' : 'รายจ่าย',
        icon:      Tags,
        iconColor: 'text-pink-500',
        href:      '/categories',
      }))

    return list
  }, [query, transactions, goals, categories, setOpen, setQuickAdd])

  /* Group results */
  const grouped = useMemo(() => {
    const map = new Map<ResultType, Result[]>()
    results.forEach(r => {
      if (!map.has(r.type)) map.set(r.type, [])
      map.get(r.type)!.push(r)
    })
    return GROUP_ORDER.filter(g => map.has(g)).map(g => ({ type: g, items: map.get(g)! }))
  }, [results])

  const flat = useMemo(() => grouped.flatMap(g => g.items), [grouped])

  /* Keyboard nav */
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && flat[active]) {
      const r = flat[active]
      if (r.action) r.action()
      else if (r.href) { router.push(r.href); setOpen(false) }
    }
  }, [flat, active, router, setOpen])

  /* Scroll active item into view */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function select(r: Result) {
    if (r.action) r.action()
    else if (r.href) { router.push(r.href); setOpen(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className={cn(
        'relative w-full max-w-2xl rounded-2xl overflow-hidden',
        'bg-white dark:bg-[oklch(0.105_0.024_270)]',
        'border border-gray-200 dark:border-white/[0.08]',
        'shadow-[0_24px_80px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.6)]',
      )}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
          <Search className="w-4 h-4 text-gray-400 dark:text-white/30 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={handleKey}
            placeholder="ค้นหาธุรกรรม, หน้า, เป้าหมาย..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 text-[10px] font-mono text-gray-400 dark:text-white/30">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <Search className="w-8 h-8 text-gray-200 dark:text-white/10" />
              <p className="text-sm text-gray-400 dark:text-white/30">ไม่พบผลลัพธ์สำหรับ "{query}"</p>
            </div>
          ) : (
            grouped.map(group => {
              const offset = flat.indexOf(group.items[0])
              return (
                <div key={group.type}>
                  <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25">
                    {GROUP_LABEL[group.type]}
                  </p>
                  {group.items.map((r, i) => {
                    const idx = offset + i
                    const isActive = idx === active
                    return (
                      <button
                        key={r.id}
                        data-idx={idx}
                        onClick={() => select(r)}
                        onMouseEnter={() => setActive(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isActive
                            ? 'bg-violet-50 dark:bg-violet-500/10'
                            : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]',
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                          isActive ? 'bg-violet-100 dark:bg-violet-500/20' : 'bg-gray-100 dark:bg-white/[0.05]',
                        )}>
                          <r.icon className={cn('w-3.5 h-3.5', r.iconColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white/85 truncate">{r.title}</p>
                          {r.subtitle && <p className="text-xs text-gray-400 dark:text-white/35 truncate">{r.subtitle}</p>}
                        </div>
                        {r.meta && (
                          <span className="text-xs font-semibold num text-gray-500 dark:text-white/40 flex-shrink-0">{r.meta}</span>
                        )}
                        {isActive && <ArrowRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
          {[
            { keys: ['↑', '↓'], label: 'เลื่อน' },
            { keys: ['↵'],      label: 'เลือก'  },
            { keys: ['Esc'],    label: 'ปิด'    },
          ].map(({ keys, label }) => (
            <span key={label} className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-white/25">
              {keys.map(k => (
                <kbd key={k} className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-white/10 font-mono bg-white dark:bg-white/[0.03]">
                  {k}
                </kbd>
              ))}
              {label}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 dark:text-white/25">
            <Wallet className="w-3 h-3" /> FinanceMe Search
          </span>
        </div>
      </div>
    </div>
  )
}
