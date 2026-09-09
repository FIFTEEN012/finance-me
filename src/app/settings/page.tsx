'use client'

import { useState, useRef } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  User, Palette, Database, Sun, Moon, Monitor,
  Download, Upload, Trash2, AlertTriangle, Check,
  Banknote, ChevronUp, ChevronDown, LogOut, Cloud,
  Sparkles, Clock, Coins, ShieldCheck, CheckCircle2,
  FolderOpen, Target, CreditCard, ArrowRight, Loader2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PressCard } from '@/components/ui/PressCard'
import {
  useSettingsStore,
  CurrencyCode,
  DateFormat,
  NumberFormat,
  AccentColor,
} from '@/store/useSettingsStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useGoalStore } from '@/store/useGoalStore'
import { useDebtStore } from '@/store/useDebtStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useAuthStore } from '@/store/useAuthStore'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

/* ── Constants ── */
const EMOJIS = [
  '💰', '🏦', '💳', '🪙', '📊', '🎯', '🌟', '🦁',
  '🦊', '🐻', '🐼', '🐨', '🦄', '⚡', '🔥', '🍀'
]

const ACCENT_OPTIONS: { value: AccentColor; label: string; color: string; gradient: string }[] = [
  { value: 'violet',  label: 'ม่วง (Violet)',         color: '#7c3aed', gradient: 'from-violet-600 to-indigo-600' },
  { value: 'pink',    label: 'ชมพู (Sakura)',         color: '#ec4899', gradient: 'from-pink-500 to-rose-500'     },
  { value: 'rose',    label: 'แดงกุหลาบ (Rose)',      color: '#e11d48', gradient: 'from-rose-600 to-red-600'      },
  { value: 'blue',    label: 'น้ำเงิน (Blue)',         color: '#2563eb', gradient: 'from-blue-600 to-cyan-600'     },
  { value: 'emerald', label: 'เขียวมรกต (Emerald)',   color: '#059669', gradient: 'from-emerald-600 to-teal-600'  },
  { value: 'amber',   label: 'ส้มอำพัน (Amber)',      color: '#d97706', gradient: 'from-amber-500 to-orange-500'  },
  { value: 'indigo',  label: 'ครามเข้ม (Indigo)',      color: '#4338ca', gradient: 'from-indigo-600 to-violet-700' },
]

const CURRENCY_OPTIONS: { value: CurrencyCode; label: string; symbol: string }[] = [
  { value: 'THB', label: 'บาทไทย',         symbol: '฿'  },
  { value: 'USD', label: 'ดอลลาร์สหรัฐ',   symbol: '$'  },
  { value: 'EUR', label: 'ยูโร',            symbol: '€'  },
  { value: 'JPY', label: 'เยนญี่ปุ่น',     symbol: '¥'  },
  { value: 'SGD', label: 'ดอลลาร์สิงคโปร์', symbol: 'S$' },
  { value: 'GBP', label: 'ปอนด์อังกฤษ',    symbol: '£'  },
]

interface BackupData {
  version: number
  exportedAt: string
  transactions: any[]
  budgets: any[]
  categories: any[]
  goals?: any[]
  debts?: any[]
}

type TabKey = 'account' | 'appearance' | 'data'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('account')

  // Stores
  const settings = useSettingsStore()
  const { theme, setTheme } = useTheme()
  const user = useAuthStore((state) => state.user)
  const { data: session } = authClient.useSession()

  const { transactions, replaceTransactions, deleteTransactions } = useTransactionStore()
  const { budgets, replaceBudgets } = useBudgetStore()
  const { categories, replaceCategories } = useCategoryStore()
  const goals = useGoalStore((s) => s.goals)
  const debts = useDebtStore((s) => s.debts)

  // Dialogs & Import state
  const fileRef = useRef<HTMLInputElement>(null)
  const [importData, setImportData] = useState<BackupData | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Instant Auto-Save Helper
  const handleUpdate = (patch: Parameters<typeof settings.update>[0], message?: string) => {
    settings.update(patch)
    if (message) {
      toast.success(message, { duration: 2000 })
    }
  }

  // Days until payday calculation
  const today = new Date().getDate()
  const payday = settings.paydayDate
  const daysUntilPayday = payday >= today ? payday - today : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - today + payday

  /* ── Logout ── */
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await authClient.signOut()
      useAuthStore.getState().setUser(null)
      setLogoutOpen(false)
      toast.success('ออกจากระบบเรียบร้อยแล้ว')
    } catch {
      toast.error('ไม่สามารถออกจากระบบได้')
    } finally {
      setIsLoggingOut(false)
    }
  }

  /* ── Backup Export ── */
  const handleExport = () => {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      transactions,
      budgets,
      categories,
      goals,
      debts,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financeme-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('ส่งออกไฟล์ข้อมูลสำรองสำเร็จ')
  }

  /* ── Backup Import ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        let normalized: BackupData | null = null

        if (raw && typeof raw === 'object' && raw.stores && typeof raw.stores === 'object') {
          const s = raw.stores as Record<string, any>
          normalized = {
            version: raw.version || 2,
            exportedAt: raw.exportedAt || new Date().toISOString(),
            transactions: s['finance-transactions']?.state?.transactions || [],
            budgets: s['finance-budgets']?.state?.budgets || [],
            categories: s['finance-categories']?.state?.categories || [],
            goals: s['finance-goals']?.state?.goals || [],
            debts: s['finance-debts']?.state?.debts || [],
          }
        } else if (raw && typeof raw === 'object' && Array.isArray(raw.transactions)) {
          normalized = {
            version: raw.version || 1,
            exportedAt: raw.exportedAt || new Date().toISOString(),
            transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
            budgets: Array.isArray(raw.budgets) ? raw.budgets : [],
            categories: Array.isArray(raw.categories) ? raw.categories : [],
            goals: Array.isArray(raw.goals) ? raw.goals : [],
            debts: Array.isArray(raw.debts) ? raw.debts : [],
          }
        }

        if (!normalized) {
          toast.error('ไฟล์ไม่ถูกต้อง — ไม่ใช่ไฟล์ backup ของระบบ')
          return
        }
        setImportData(normalized)
      } catch {
        toast.error('ไม่สามารถอ่านไฟล์ได้')
      }
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = async () => {
    if (!importData) return
    setIsImporting(true)
    try {
      if (importData.transactions?.length) {
        replaceTransactions(importData.transactions as Parameters<typeof replaceTransactions>[0])
      }
      if (importData.budgets?.length) {
        replaceBudgets(importData.budgets as Parameters<typeof replaceBudgets>[0])
      }
      if (importData.categories?.length) {
        replaceCategories(importData.categories as Parameters<typeof replaceCategories>[0])
      }

      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: importData.transactions || [],
          budgets: importData.budgets || [],
          categories: importData.categories || [],
          goals: importData.goals || [],
          debts: importData.debts || [],
        }),
      })

      toast.success(`นำเข้าและบันทึกฐานข้อมูลสำเร็จ — ${importData.transactions.length} รายการ`)
      setImportData(null)
    } catch (e) {
      console.error(e)
      toast.success(`นำเข้าสำเร็จ — ${importData.transactions.length} รายการ`)
      setImportData(null)
    } finally {
      setIsImporting(false)
    }
  }

  /* ── Reset Data ── */
  const handleReset = async () => {
    deleteTransactions(transactions.map((t) => t.id))
    replaceBudgets([])
    useOnboardingStore.getState().reset()

    // Delete in database via API
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: [], budgets: [] }),
      })
    } catch {
      // ignore
    }

    setResetOpen(false)
    setResetConfirmText('')
    toast.success('รีเซ็ตข้อมูลทั้งหมดสำเร็จ')
  }

  // Active accent color info
  const activeAccentInfo = ACCENT_OPTIONS.find((a) => a.value === settings.accentColor) || ACCENT_OPTIONS[0]

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-28">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          ตั้งค่า
        </h1>
        <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
          ปรับแต่งระบบ บัญชีผู้ใช้งาน และการจัดการฐานข้อมูลส่วนตัว
        </p>
      </div>

      {/* Tabs Container */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Navigation Tabs (Sidebar on Desktop, Horizontal Segment on Mobile) */}
        <div className="w-full md:w-64 shrink-0 bg-white/70 dark:bg-white/[0.03] backdrop-blur-md p-1.5 rounded-2xl border border-gray-200/80 dark:border-white/[0.08] shadow-sm flex flex-row md:flex-col gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('account')}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap md:w-full text-left',
              activeTab === 'account'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>บัญชี & ความปลอดภัย</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap md:w-full text-left',
              activeTab === 'appearance'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Palette className="w-4 h-4 shrink-0" />
            <span>การแสดงผล & ธีม</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap md:w-full text-left',
              activeTab === 'data'
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>ข้อมูล & ฐานข้อมูลคลาวด์</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 w-full space-y-6">
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: ACCOUNT & SECURITY                                          */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Profile Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[oklch(0.14_0.02_270)] border border-gray-200/80 dark:border-white/[0.08] shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">โปรไฟล์ของคุณ</h2>
                    <p className="text-xs text-gray-500 dark:text-white/40">ปรับแต่งชื่อแสดงผลและไอคอนประจำตัว</p>
                  </div>
                </div>

                {/* Avatar Emoji */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-white/70">
                    อวตาร (เลือก Emoji)
                  </Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => handleUpdate({ avatarEmoji: e }, `เปลี่ยนอวตารเป็น ${e} แล้ว`)}
                        className={cn(
                          'w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95',
                          settings.avatarEmoji === e
                            ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-500/40 scale-105'
                            : 'bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2 max-w-md">
                  <Label className="text-xs font-semibold text-gray-700 dark:text-white/70">
                    ชื่อที่แสดง (Display Name)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      defaultValue={settings.displayName}
                      placeholder="เช่น Boonlok หรือ Finance Master"
                      className="h-10 text-sm"
                      maxLength={30}
                      onBlur={(e) => {
                        if (e.target.value !== settings.displayName) {
                          handleUpdate({ displayName: e.target.value }, 'บันทึกชื่อแสดงผลแล้ว')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdate({ displayName: (e.target as HTMLInputElement).value }, 'บันทึกชื่อแสดงผลแล้ว')
                          ;(e.target as HTMLInputElement).blur()
                        }
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-white/30">
                    พิมพ์แล้วกด Enter หรือคลิกออกด้านนอก ระบบจะบันทึกอัตโนมัติ
                  </p>
                </div>
              </div>

              {/* Better-Auth Account Info */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[oklch(0.14_0.02_270)] border border-gray-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">สถานะบัญชีความปลอดภัย</h2>
                      <p className="text-xs text-gray-500 dark:text-white/40">จัดการการเข้าสู่ระบบผ่าน Better-Auth</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>เข้าสู่ระบบแล้ว</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
                    <span className="text-xs text-gray-400 dark:text-white/40 block mb-1">อีเมลผู้ใช้งาน</span>
                    <span className="font-semibold text-gray-800 dark:text-white/90">
                      {session?.user?.email || user?.email || 'ยังไม่ได้เข้าสู่ระบบ'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04]">
                    <span className="text-xs text-gray-400 dark:text-white/40 block mb-1">รหัสประจำตัว (User ID)</span>
                    <span className="font-mono text-xs text-gray-600 dark:text-white/60 truncate block">
                      {session?.user?.id || user?.id || '-'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setLogoutOpen(true)}
                    className="gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                    ออกจากระบบ (Sign Out)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: APPEARANCE & THEME                                          */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Theme Mode */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[oklch(0.14_0.02_270)] border border-gray-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">โหมดธีมสว่าง / มืด</h2>
                    <p className="text-xs text-gray-500 dark:text-white/40">สลับบรรยากาศการใช้งานของแอปพลิเคชัน</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-md pt-2">
                  {[
                    { value: 'light',  label: 'สว่าง (Light)', icon: Sun },
                    { value: 'dark',   label: 'มืด (Dark)',   icon: Moon },
                    { value: 'system', label: 'ตามระบบ',      icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all cursor-pointer',
                        theme === value
                          ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                          : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] text-gray-600 dark:text-white/60'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color & Live Preview Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[oklch(0.14_0.02_270)] border border-gray-200/80 dark:border-white/[0.08] shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">สีหลักของระบบ (Accent Color)</h2>
                    <p className="text-xs text-gray-500 dark:text-white/40">
                      มีผลกับปุ่ม, การ์ดไฮไลท์ และกราฟแท่งทั่วทั้งแอป
                    </p>
                  </div>
                </div>

                {/* Color Swatches */}
                <div className="flex flex-wrap gap-3 items-center">
                  {ACCENT_OPTIONS.map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => handleUpdate({ accentColor: value })}
                      title={label}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all cursor-pointer hover:scale-105 active:scale-95',
                        settings.accentColor === value
                          ? 'border-gray-900 dark:border-white shadow-md font-semibold bg-gray-50 dark:bg-white/[0.06]'
                          : 'border-transparent opacity-80 hover:opacity-100 bg-gray-100/60 dark:bg-white/[0.03]'
                      )}
                    >
                      <span
                        className="w-4 h-4 rounded-full shadow-inner"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-gray-800 dark:text-white/80">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Live Theme Preview Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/[0.02] dark:to-white/[0.05] border border-gray-200/80 dark:border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/40 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      ตัวอย่างพรีวิวสด (Live Theme Preview)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      {activeAccentInfo.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm">
                      <Check className="w-3.5 h-3.5" /> ปุ่มตัวอย่างแอ็กชัน
                    </Button>
                    <Button variant="outline" className="h-9 px-4 text-xs font-medium">
                      ปุ่มตัวอย่าง Outline
                    </Button>
                    <span className="text-xs px-3 py-1.5 rounded-xl bg-primary/15 text-primary font-semibold">
                      แท็กไฮไลท์
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-gray-500 dark:text-white/40">
                      <span>งบประมาณเดือนนี้</span>
                      <span className="font-bold text-gray-800 dark:text-white/80">78%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-primary rounded-full w-[78%] transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payday & Currency Preferences */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[oklch(0.14_0.02_270)] border border-gray-200/80 dark:border-white/[0.08] shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      การเงิน & สกุลเงิน
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-white/40">
                      ตั้งค่าวันเงินเดือนออกและการแสดงตัวเลขสกุลเงิน
                    </p>
                  </div>
                </div>

                {/* Payday date */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold text-gray-800 dark:text-white">
                        วันที่เงินเดือนออก
                      </Label>
                      <p className="text-xs text-gray-500 dark:text-white/40">
                        สำหรับแสดงการนับถอยหลังในหน้า Dashboard
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-500/20">
                      <Clock className="w-3.5 h-3.5" />
                      <span>อีก {daysUntilPayday} วัน</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Quick popular days */}
                    <div className="flex items-center gap-1.5">
                      {[15, 25, 28, 30].map((d) => (
                        <button
                          key={d}
                          onClick={() => {
                            settings.setPaydayDate(d)
                            toast.success(`ตั้งวันเงินเดือนออกเป็นวันที่ ${d} แล้ว`, { duration: 1500 })
                          }}
                          className={cn(
                            'w-10 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer',
                            settings.paydayDate === d
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center border border-gray-200 dark:border-white/[0.1] rounded-xl overflow-hidden bg-gray-50 dark:bg-white/[0.02]">
                      <button
                        onClick={() => settings.setPaydayDate(settings.paydayDate - 1)}
                        disabled={settings.paydayDate <= 1}
                        className="px-3 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/[0.06] disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-black text-gray-800 dark:text-white">
                        {settings.paydayDate}
                      </span>
                      <button
                        onClick={() => settings.setPaydayDate(settings.paydayDate + 1)}
                        disabled={settings.paydayDate >= 31}
                        className="px-3 py-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/[0.06] disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Currency select */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-white/70">
                      สกุลเงินหลัก
                    </Label>
                    <Select
                      value={settings.currency}
                      onValueChange={(v) => handleUpdate({ currency: v as CurrencyCode }, `เปลี่ยนสกุลเงินเป็น ${v} แล้ว`)}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map(({ value, label, symbol }) => (
                          <SelectItem key={value} value={value}>
                            <span className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-500 w-5">{symbol}</span>
                              <span>{label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700 dark:text-white/70">
                      รูปแบบวันที่
                    </Label>
                    <Select
                      value={settings.dateFormat}
                      onValueChange={(v) => handleUpdate({ dateFormat: v as DateFormat }, 'เปลี่ยนรูปแบบวันที่แล้ว')}
                    >
                      <SelectTrigger className="h-10 text-sm font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as DateFormat[]).map((f) => (
                          <SelectItem key={f} value={f} className="font-mono text-sm">
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: DATA & NEON CLOUD DATABASE                                  */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'data' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Neon Cloud Database Status Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 border border-emerald-500/20 dark:border-emerald-500/30 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>Neon Serverless PostgreSQL</span>
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-white/50">
                        AWS Singapore (ap-southeast-1) · Direct Database Save
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>ออนไลน์ & บันทึกสด</span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-white/60 leading-relaxed">
                  ระบบจะบันทึกทุกรายการธุรกรรม หมวดหมู่ และงบประมาณลงฐานข้อมูลคลาวด์ทันทีที่มีการบันทึก
                  ข้อมูลจะคงอยู่ถาวร ปลอดภัย แม้คุณจะรีเฟรชหน้าเว็บหรือเปิดใช้งานจากเครื่องใดก็ได้
                </p>
              </div>

              {/* Data Entities Stats Grid */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">
                  สถิติข้อมูลในระบบ (Database Records)
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'ธุรกรรม',   count: transactions.length, icon: Coins,      color: 'text-amber-500' },
                    { label: 'หมวดหมู่', count: categories.length,   icon: FolderOpen, color: 'text-violet-500' },
                    { label: 'งบประมาณ', count: budgets.length,      icon: Banknote,   color: 'text-blue-500' },
                    { label: 'เป้าหมาย',  count: goals.length,        icon: Target,     color: 'text-emerald-500' },
                    { label: 'หนี้สิน',   count: debts.length,        icon: CreditCard, color: 'text-rose-500' },
                  ].map(({ label, count, icon: Icon, color }) => (
                    <div
                      key={label}
                      className="p-4 rounded-xl bg-white dark:bg-[oklch(0.14_0.02_270)] border border-gray-200/80 dark:border-white/[0.08] shadow-sm text-center space-y-1"
                    >
                      <Icon className={cn('w-4 h-4 mx-auto mb-1.5', color)} />
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{count}</div>
                      <div className="text-[11px] text-gray-400 dark:text-white/40">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backup & Restore Action Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[oklch(0.14_0.02_270)] border border-gray-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      สำรองและกู้คืนข้อมูล (JSON Backup)
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-white/40">
                      ดาวน์โหลดหรือนำเข้าไฟล์สำรองข้อมูลส่วนตัวแบบสมบูรณ์
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="h-11 rounded-xl justify-center gap-2 border-gray-200 dark:border-white/[0.1] hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                  >
                    <Download className="w-4 h-4 text-primary" />
                    <span>ส่งออกข้อมูลสำรอง (JSON)</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    className="h-11 rounded-xl justify-center gap-2 border-gray-200 dark:border-white/[0.1] hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                  >
                    <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>นำเข้าข้อมูลสำรอง (JSON)</span>
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-6 rounded-2xl bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-500/20 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      พื้นที่อันตราย (Danger Zone)
                    </h3>
                    <p className="text-xs text-red-600/70 dark:text-red-400/60 mt-0.5">
                      ลบรายการธุรกรรมและงบประมาณทั้งหมดในฐานข้อมูลอย่างถาวร
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setResetOpen(true)}
                    className="gap-1.5 text-xs text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/30 hover:bg-red-100/50 dark:hover:bg-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    รีเซ็ตข้อมูลทั้งหมด
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialog: Import Confirm ── */}
      <Dialog open={!!importData} onOpenChange={(o) => !o && setImportData(null)}>
        <DialogContent className="max-w-sm dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              ยืนยันการนำเข้าข้อมูล
            </DialogTitle>
          </DialogHeader>
          {importData && (
            <div className="space-y-3 text-sm text-gray-600 dark:text-white/60">
              <p>
                ข้อมูลในฐานข้อมูลคลาวด์จะถูก{' '}
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  อัปเดตและบันทึกทดแทน
                </span>
              </p>
              <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl p-3 space-y-1.5 text-xs border border-gray-100 dark:border-white/[0.06]">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-white/40">ส่งออกเมื่อ</span>
                  <span className="font-medium">
                    {new Date(importData.exportedAt).toLocaleString('th-TH')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-white/40">รายการธุรกรรม</span>
                  <span className="font-bold text-gray-800 dark:text-white">
                    {importData.transactions.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-white/40">งบประมาณ</span>
                  <span className="font-bold text-gray-800 dark:text-white">
                    {importData.budgets.length}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportData(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึกข้อมูล...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  ยืนยันนำเข้า
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Reset Confirm ── */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              รีเซ็ตข้อมูลทั้งหมด
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-white/60">
              การกระทำนี้จะ <span className="font-semibold text-red-600">ลบถาวร</span>{' '}
              รายการธุรกรรมและงบประมาณทั้งหมดใน Neon Database และไม่สามารถกู้คืนได้
            </p>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">
                พิมพ์คำว่า <span className="font-bold text-red-600">RESET</span> เพื่อยืนยัน
              </Label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setResetOpen(false); setResetConfirmText('') }}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleReset}
              disabled={resetConfirmText !== 'RESET'}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> ลบถาวร
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Logout Confirm ── */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm dark:bg-[rgba(8,14,30,0.97)] dark:border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <LogOut className="w-5 h-5 text-gray-500" />
              ยืนยันการออกจากระบบ
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-white/60">
            คุณต้องการออกจากระบบบัญชี{' '}
            <span className="font-semibold text-gray-800 dark:text-white">
              {session?.user?.email || user?.email || ''}
            </span>{' '}
            ใช่หรือไม่?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
            >
              {isLoggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
