'use client'

import { useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  User, Palette, Database, Info, Sun, Moon, Monitor,
  Download, Upload, Trash2, AlertTriangle, Check,
  RotateCcw, ChevronRight, Save, X, Banknote, ChevronUp, ChevronDown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PressCard } from '@/components/ui/PressCard'
import { useSettingsStore, AppSettings, CurrencyCode, DateFormat, NumberFormat, AccentColor } from '@/store/useSettingsStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useBudgetStore } from '@/store/useBudgetStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { cn } from '@/lib/utils'

/* ── Section wrapper ─────────────────────────────────────────── */

function Section({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <PressCard
      shadow="0 4px 0 0 #d1d5db"
      shadowHover="0 2px 0 0 #d1d5db"
      className="border-gray-200 overflow-hidden p-0"
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/80">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
        {children}
      </div>
    </PressCard>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white/70">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{sub}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

/* ── Backup schema ────────────────────────────────────────────── */

const backupSchema = z.object({
  version:      z.number(),
  exportedAt:   z.string(),
  transactions: z.array(z.any()),
  budgets:      z.array(z.any()),
  categories:   z.array(z.any()),
})

/* ── Settings keys that need Save ────────────────────────────── */

const SETTINGS_KEYS: (keyof AppSettings)[] = [
  'displayName', 'avatarEmoji', 'currency',
  'firstDayOfWeek', 'dateFormat', 'numberFormat',
  'compactNumbers', 'accentColor',
]

/* ── Main page ────────────────────────────────────────────────── */

export default function SettingsPage() {
  const settings = useSettingsStore()
  const { theme, setTheme } = useTheme()
  const setPaydayDate = useSettingsStore((s) => s.setPaydayDate)

  const { transactions, replaceTransactions, deleteTransactions } = useTransactionStore()
  const { budgets, replaceBudgets }                               = useBudgetStore()
  const { categories, replaceCategories }                         = useCategoryStore()

  const fileRef = useRef<HTMLInputElement>(null)
  const [importData, setImportData]           = useState<z.infer<typeof backupSchema> | null>(null)
  const [resetOpen, setResetOpen]             = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')

  /* ── Draft state (pending changes) ── */
  const [draft, setDraft] = useState<AppSettings>(() => ({
    displayName:    settings.displayName,
    avatarEmoji:    settings.avatarEmoji,
    currency:       settings.currency,
    firstDayOfWeek: settings.firstDayOfWeek,
    dateFormat:     settings.dateFormat,
    numberFormat:   settings.numberFormat,
    compactNumbers: settings.compactNumbers,
    accentColor:    settings.accentColor,
  }))

  const patch = (p: Partial<AppSettings>) => setDraft((d) => ({ ...d, ...p }))

  const hasChanges = SETTINGS_KEYS.some((k) => draft[k] !== settings[k])

  const handleSave = () => {
    settings.update(draft)
    toast.success('บันทึกการตั้งค่าแล้ว')
  }

  const handleDiscard = () => {
    setDraft({
      displayName:    settings.displayName,
      avatarEmoji:    settings.avatarEmoji,
      currency:       settings.currency,
      firstDayOfWeek: settings.firstDayOfWeek,
      dateFormat:     settings.dateFormat,
      numberFormat:   settings.numberFormat,
      compactNumbers: settings.compactNumbers,
      accentColor:    settings.accentColor,
    })
  }

  /* ── Backup export ── */
  const handleExport = () => {
    const data = { version: 1, exportedAt: new Date().toISOString(), transactions, budgets, categories }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `financeme-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
    toast.success('ส่งออก backup สำเร็จ')
  }

  /* ── Backup import ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        const parsed = backupSchema.safeParse(raw)
        if (!parsed.success) { toast.error('ไฟล์ไม่ถูกต้อง'); return }
        setImportData(parsed.data)
      } catch { toast.error('ไม่สามารถอ่านไฟล์ได้') }
    }
    reader.readAsText(file)
  }

  const handleConfirmImport = () => {
    if (!importData) return
    replaceTransactions(importData.transactions as Parameters<typeof replaceTransactions>[0])
    replaceBudgets(importData.budgets as Parameters<typeof replaceBudgets>[0])
    replaceCategories(importData.categories as Parameters<typeof replaceCategories>[0])
    toast.success(`นำเข้าสำเร็จ — ${importData.transactions.length} รายการ`)
    setImportData(null)
  }

  /* ── Reset ── */
  const handleReset = () => {
    deleteTransactions(transactions.map((t) => t.id))
    replaceBudgets([])
    useOnboardingStore.getState().reset()
    setResetOpen(false); setResetConfirmText('')
    toast.success('รีเซ็ตข้อมูลทั้งหมดสำเร็จ')
  }

  /* ── Options ── */
  const EMOJIS = ['💰','🏦','💳','🪙','📊','🎯','🌟','🦁','🐯','🦊','🐻','🐼','🐨','🦄','🌈','⚡','🔥','🌊','🍀','🎪']

  const themeOptions = [
    { value: 'light',  label: 'สว่าง',  icon: Sun     },
    { value: 'dark',   label: 'มืด',    icon: Moon    },
    { value: 'system', label: 'ระบบ',   icon: Monitor },
  ]

  const accentOptions: { value: AccentColor; label: string; color: string }[] = [
    { value: 'violet',  label: 'ม่วง',    color: '#7c3aed' },
    { value: 'rose',    label: 'กุหลาบ',  color: '#e11d48' },
    { value: 'blue',    label: 'น้ำเงิน', color: '#2563eb' },
    { value: 'emerald', label: 'เขียว',   color: '#059669' },
    { value: 'amber',   label: 'เหลือง',  color: '#d97706' },
    { value: 'indigo',  label: 'คราม',    color: '#4338ca' },
  ]

  const currencyOptions: { value: CurrencyCode; label: string; symbol: string }[] = [
    { value: 'THB', label: 'บาทไทย',         symbol: '฿'  },
    { value: 'USD', label: 'ดอลลาร์สหรัฐ',   symbol: '$'  },
    { value: 'EUR', label: 'ยูโร',            symbol: '€'  },
    { value: 'JPY', label: 'เยนญี่ปุ่น',     symbol: '¥'  },
    { value: 'SGD', label: 'ดอลลาร์สิงคโปร์', symbol: 'S$' },
    { value: 'GBP', label: 'ปอนด์อังกฤษ',    symbol: '£'  },
  ]

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">ตั้งค่า</h1>
          <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">ปรับแต่งแอปให้เหมาะกับคุณ</p>
        </div>
        {hasChanges && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-full">
            ยังไม่ได้บันทึก
          </span>
        )}
      </div>

      {/* ── Profile ── */}
      <Section icon={User} title="โปรไฟล์">
        <Row label="อวตาร" sub="เลือก emoji ที่ชอบ">
          <div className="flex flex-wrap gap-1.5 max-w-[220px] justify-end">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => patch({ avatarEmoji: e })}
                className={cn(
                  'w-8 h-8 rounded-lg text-base transition-all hover:scale-110',
                  draft.avatarEmoji === e
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : 'bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08]',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </Row>

        <Row label="ชื่อที่แสดง" sub="ไว้ทักทายบนหน้าแรก (ไม่บังคับ)">
          <Input
            value={draft.displayName}
            onChange={(e) => patch({ displayName: e.target.value })}
            placeholder="เช่น คุณ..."
            className="w-40 h-9 text-sm"
            maxLength={30}
          />
        </Row>
      </Section>

      {/* ── Payday ── */}
      <Section icon={Banknote} title="วันเงินเดือน">
        <Row label="วันที่เงินเดือนออก" sub="ใช้แสดงนับถอยหลังในหน้าแรก">
          <div className="flex items-center gap-2">
            {/* Quick-pick popular days */}
            <div className="hidden sm:flex items-center gap-1">
              {[15, 25, 28, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setPaydayDate(d)}
                  className={cn(
                    'w-9 h-9 rounded-xl text-xs font-black transition-all',
                    settings.paydayDate === d
                      ? 'bg-violet-600 text-white shadow-[0_2px_0_0_#4c1d95]'
                      : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Manual stepper */}
            <div className="flex items-center border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
              <button
                onClick={() => setPaydayDate(settings.paydayDate - 1)}
                disabled={settings.paydayDate <= 1}
                className="px-2 py-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-30"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div className="px-3 py-1.5 min-w-[44px] text-center">
                <span className="text-sm font-black text-gray-800 dark:text-white num">{settings.paydayDate}</span>
              </div>
              <button
                onClick={() => setPaydayDate(settings.paydayDate + 1)}
                disabled={settings.paydayDate >= 31}
                className="px-2 py-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-30"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Row>
      </Section>

      {/* ── Appearance ── */}
      <Section icon={Palette} title="ธีมและการแสดงผล">
        {/* Theme — instant, via next-themes */}
        <Row label="ธีมสี" sub="Light / Dark / ตามระบบ">
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.05]">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  theme === value
                    ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                    : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </Row>

        {/* Accent color */}
        <Row label="สีหลักของแอป" sub="กด บันทึก เพื่อเปลี่ยนสี UI">
          <div className="flex gap-2">
            {accentOptions.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => patch({ accentColor: value })}
                title={label}
                className={cn(
                  'w-7 h-7 rounded-full border-2 transition-all duration-150 hover:scale-110',
                  draft.accentColor === value
                    ? 'border-gray-700 dark:border-white scale-110 shadow-md'
                    : 'border-transparent opacity-70',
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </Row>

        {/* Currency */}
        <Row label="สกุลเงินหลัก" sub="ใช้แสดงตัวเลขทั้งแอป">
          <Select
            value={draft.currency}
            onValueChange={(v) => patch({ currency: v as CurrencyCode })}
          >
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map(({ value, label, symbol }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-gray-500 w-5 text-xs">{symbol}</span>
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        {/* Date format */}
        <Row label="รูปแบบวันที่">
          <Select
            value={draft.dateFormat}
            onValueChange={(v) => patch({ dateFormat: v as DateFormat })}
          >
            <SelectTrigger className="w-40 h-9 text-sm font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as DateFormat[]).map((f) => (
                <SelectItem key={f} value={f} className="font-mono text-sm">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>

        {/* Compact numbers */}
        <Row label="ตัวเลขย่อ" sub="แสดง 1,000,000 เป็น 1M">
          <button
            onClick={() => patch({ compactNumbers: !draft.compactNumbers })}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors duration-200',
              draft.compactNumbers ? 'bg-primary' : 'bg-gray-200 dark:bg-white/10',
            )}
          >
            <span className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
              draft.compactNumbers && 'translate-x-5',
            )} />
          </button>
        </Row>
      </Section>

      {/* ── Data ── */}
      <Section icon={Database} title="ข้อมูลและความเป็นส่วนตัว">
        <Row label="สำรองข้อมูล" sub={`${transactions.length} รายการ · ${budgets.length} งบ · ${categories.length} หมวด`}>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 h-8">
            <Download className="w-3.5 h-3.5" /> ส่งออก JSON
          </Button>
        </Row>

        <Row label="กู้คืนข้อมูล" sub="นำเข้าไฟล์ backup ที่เคยส่งออก">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 h-8">
            <Upload className="w-3.5 h-3.5" /> นำเข้า JSON
          </Button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        </Row>

        <Row label="สถิติข้อมูล" sub="ข้อมูลทั้งหมดเก็บในเบราว์เซอร์ของคุณเท่านั้น">
          <div className="flex gap-3 text-right">
            {[
              { label: 'รายการ', value: transactions.length },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm font-bold text-gray-800 dark:text-white/80">{value}</p>
                <p className="text-[10px] text-gray-400 dark:text-white/25">{label}</p>
              </div>
            ))}
          </div>
        </Row>

        <Row label="รีเซ็ตข้อมูลทั้งหมด" sub="ลบรายการธุรกรรมและงบประมาณทั้งหมด">
          <Button
            variant="outline" size="sm"
            onClick={() => setResetOpen(true)}
            className="gap-1.5 h-8 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" /> รีเซ็ต
          </Button>
        </Row>
      </Section>

      {/* ── About ── */}
      <Section icon={Info} title="เกี่ยวกับแอป">
        <Row label="FinanceMe" sub="แอปจัดการการเงินส่วนตัว">
          <span className="text-xs font-mono text-gray-400 dark:text-white/25 bg-gray-100 dark:bg-white/[0.05] px-2 py-1 rounded-md">
            v2.0 Violet Pro
          </span>
        </Row>
        <Row label="สร้างด้วย" sub="Next.js · Zustand · Recharts · Tailwind CSS">
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20" />
        </Row>
        <Row label="ข้อมูลส่วนตัว" sub="ไม่มีการส่งข้อมูลออกนอกเครื่อง — เก็บใน localStorage เท่านั้น">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">ปลอดภัย</span>
          </div>
        </Row>
      </Section>

      {/* ── Sticky Save bar ── */}
      {hasChanges && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-2xl',
            'bg-white dark:bg-[oklch(0.09_0.025_272)]',
            'border border-gray-200 dark:border-white/[0.08]',
          )}>
            <span className="text-sm text-gray-600 dark:text-white/60 whitespace-nowrap">มีการเปลี่ยนแปลง</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              className="gap-1.5 h-8"
            >
              <X className="w-3.5 h-3.5" />
              ยกเลิก
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="gap-1.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึก
            </Button>
          </div>
        </div>
      )}

      {/* ── Import confirm dialog ── */}
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
              <p>ข้อมูลปัจจุบันจะถูก <span className="font-semibold text-red-600">แทนที่ทั้งหมด</span></p>
              <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-white/40">ส่งออกเมื่อ</span>
                  <span className="font-medium">{new Date(importData.exportedAt).toLocaleString('th-TH')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-white/40">รายการ</span>
                  <span className="font-medium">{importData.transactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-white/40">งบประมาณ</span>
                  <span className="font-medium">{importData.budgets.length}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportData(null)}>ยกเลิก</Button>
            <Button onClick={handleConfirmImport} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
              <Check className="w-4 h-4" /> ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset confirm dialog ── */}
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
              การกระทำนี้จะ<span className="font-semibold text-red-600"> ลบถาวร</span>รายการธุรกรรม งบประมาณ และรีเซ็ต onboarding ทั้งหมด ไม่สามารถยกเลิกได้
            </p>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500 dark:text-white/40">
                พิมพ์ <span className="font-mono font-bold text-red-500">RESET</span> เพื่อยืนยัน
              </Label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="font-mono border-red-200 dark:border-red-500/30 focus:ring-red-400"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setResetOpen(false); setResetConfirmText('') }}>ยกเลิก</Button>
            <Button
              onClick={handleReset}
              disabled={resetConfirmText !== 'RESET'}
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5 disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              รีเซ็ตทั้งหมด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
