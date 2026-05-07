'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSubscriptionStore, nextBillingDate } from '@/store/useSubscriptionStore'
import { Subscription, SubscriptionBillingCycle, SubscriptionCategory } from '@/types'
import { cn } from '@/lib/utils'

/* ── Popular preset services ── */
const PRESETS = [
  { name: 'Netflix',          emoji: '🎬', amount: 349, currency: 'THB', category: 'entertainment' as SubscriptionCategory, color: '#E50914', website: 'netflix.com' },
  { name: 'Spotify',          emoji: '🎵', amount: 129, currency: 'THB', category: 'entertainment' as SubscriptionCategory, color: '#1DB954', website: 'spotify.com' },
  { name: 'YouTube Premium',  emoji: '📺', amount: 159, currency: 'THB', category: 'entertainment' as SubscriptionCategory, color: '#FF0000', website: 'youtube.com' },
  { name: 'Disney+',          emoji: '🏰', amount: 299, currency: 'THB', category: 'entertainment' as SubscriptionCategory, color: '#113CCF', website: 'disneyplus.com' },
  { name: 'ChatGPT Plus',     emoji: '🤖', amount: 20,  currency: 'USD', category: 'productivity'  as SubscriptionCategory, color: '#10A37F', website: 'openai.com' },
  { name: 'iCloud+',          emoji: '☁️', amount: 35,  currency: 'THB', category: 'cloud'         as SubscriptionCategory, color: '#3478F6', website: 'icloud.com' },
  { name: 'Google One',       emoji: '💾', amount: 59,  currency: 'THB', category: 'cloud'         as SubscriptionCategory, color: '#4285F4', website: 'one.google.com' },
  { name: 'Microsoft 365',    emoji: '💼', amount: 269, currency: 'THB', category: 'productivity'  as SubscriptionCategory, color: '#D83B01', website: 'microsoft.com' },
  { name: 'Adobe CC',         emoji: '🎨', amount: 899, currency: 'THB', category: 'productivity'  as SubscriptionCategory, color: '#FF0000', website: 'adobe.com' },
  { name: 'Apple One',        emoji: '🍎', amount: 390, currency: 'THB', category: 'entertainment' as SubscriptionCategory, color: '#555555', website: 'apple.com' },
  { name: 'LINE MAN',         emoji: '🛵', amount: 99,  currency: 'THB', category: 'food'          as SubscriptionCategory, color: '#00B900', website: 'lineman.wongnai.com' },
  { name: 'Canva Pro',        emoji: '✏️', amount: 519, currency: 'THB', category: 'productivity'  as SubscriptionCategory, color: '#00C4CC', website: 'canva.com' },
]

const CYCLE_LABELS: Record<SubscriptionBillingCycle, string> = {
  weekly:    'รายสัปดาห์',
  monthly:   'รายเดือน',
  quarterly: 'ราย 3 เดือน',
  yearly:    'รายปี',
}

const CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  entertainment: '🎬 บันเทิง',
  productivity:  '💼 การทำงาน',
  cloud:         '☁️ คลาวด์',
  health:        '💪 สุขภาพ',
  gaming:        '🎮 เกม',
  news:          '📰 ข่าวสาร',
  food:          '🍔 อาหาร',
  transport:     '🚗 ขนส่ง',
  other:         '📦 อื่นๆ',
}

const COLORS = [
  '#7C3AED', '#6366F1', '#3B82F6', '#0EA5E9', '#10B981',
  '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6',
  '#E50914', '#1DB954', '#FF0000', '#00B900', '#D83B01',
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: Subscription | null
}

const EMPTY = {
  name: '', emoji: '📦', amount: '', currency: 'THB',
  billingCycle: 'monthly' as SubscriptionBillingCycle,
  nextBillingDate: new Date().toISOString().slice(0, 10),
  category: 'other' as SubscriptionCategory,
  color: '#7C3AED', active: true, note: '', website: '',
}

export function SubscriptionForm({ open, onOpenChange, editing }: Props) {
  const { addSubscription, updateSubscription } = useSubscriptionStore()
  const [form, setForm] = useState(EMPTY)
  const [tab, setTab] = useState<'preset' | 'custom'>('preset')

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        emoji: editing.emoji,
        amount: String(editing.amount),
        currency: editing.currency,
        billingCycle: editing.billingCycle,
        nextBillingDate: editing.nextBillingDate,
        category: editing.category,
        color: editing.color,
        active: editing.active,
        note: editing.note ?? '',
        website: editing.website ?? '',
      })
      setTab('custom')
    } else {
      setForm(EMPTY)
      setTab('preset')
    }
  }, [editing, open])

  function applyPreset(p: typeof PRESETS[number]) {
    const today = new Date().toISOString().slice(0, 10)
    setForm({
      name: p.name,
      emoji: p.emoji,
      amount: String(p.amount),
      currency: p.currency,
      billingCycle: 'monthly',
      nextBillingDate: nextBillingDate(today, 'monthly'),
      category: p.category,
      color: p.color,
      active: true,
      note: '',
      website: p.website,
    })
    setTab('custom')
  }

  function handleSave() {
    const amt = parseFloat(form.amount)
    if (!form.name.trim() || isNaN(amt) || amt <= 0) return

    const payload: Omit<Subscription, 'id' | 'createdAt'> = {
      name:            form.name.trim(),
      emoji:           form.emoji,
      amount:          amt,
      currency:        form.currency,
      billingCycle:    form.billingCycle,
      nextBillingDate: form.nextBillingDate,
      category:        form.category,
      color:           form.color,
      active:          form.active,
      note:            form.note || undefined,
      website:         form.website || undefined,
    }

    if (editing) {
      updateSubscription(editing.id, payload)
    } else {
      addSubscription(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'แก้ไข Subscription' : 'เพิ่ม Subscription'}</DialogTitle>
        </DialogHeader>

        {/* Tab toggle — only show when adding */}
        {!editing && (
          <div className="flex rounded-lg bg-gray-100 dark:bg-white/[0.05] p-1 gap-1">
            {(['preset', 'custom'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                  tab === t
                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60'
                )}
              >
                {t === 'preset' ? '⚡ เลือกบริการ' : '✏️ กรอกเอง'}
              </button>
            ))}
          </div>
        )}

        {/* Preset grid */}
        {tab === 'preset' && !editing && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150',
                  'border-gray-100 dark:border-white/[0.07] bg-white dark:bg-white/[0.03]',
                  'hover:border-violet-300 dark:hover:border-violet-500/40',
                  'hover:bg-violet-50 dark:hover:bg-violet-500/10',
                  'active:scale-95',
                )}
              >
                <span className="text-2xl">{p.emoji}</span>
                <span className="text-[11px] font-medium text-gray-700 dark:text-white/70 text-center leading-tight">{p.name}</span>
                <span className="text-[10px] text-gray-400 dark:text-white/30">
                  {p.currency} {p.amount}
                </span>
              </button>
            ))}
            <button
              onClick={() => setTab('custom')}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150',
                'border-dashed border-gray-200 dark:border-white/[0.07]',
                'hover:border-violet-300 dark:hover:border-violet-500/40',
                'hover:bg-violet-50 dark:hover:bg-violet-500/10 active:scale-95',
              )}
            >
              <span className="text-2xl">➕</span>
              <span className="text-[11px] font-medium text-gray-500 dark:text-white/40 text-center">กรอกเอง</span>
            </button>
          </div>
        )}

        {/* Custom form */}
        {tab === 'custom' && (
          <div className="space-y-4 pt-1">
            {/* Emoji + Name */}
            <div className="flex gap-2">
              <div className="w-16">
                <Label className="text-xs mb-1 block">ไอคอน</Label>
                <Input
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  className="text-center text-xl h-10"
                  maxLength={4}
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1 block">ชื่อ *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น Netflix, Spotify"
                  className="h-10"
                />
              </div>
            </div>

            {/* Amount + Currency */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">ยอดเงิน *</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                  min={0}
                  className="h-10"
                />
              </div>
              <div className="w-28">
                <Label className="text-xs mb-1 block">สกุลเงิน</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['THB', 'USD', 'EUR', 'JPY', 'SGD', 'GBP'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Billing cycle */}
            <div>
              <Label className="text-xs mb-1 block">รอบชำระ</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(CYCLE_LABELS) as SubscriptionBillingCycle[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, billingCycle: c })}
                    className={cn(
                      'py-2 rounded-lg text-[12px] font-medium border transition-colors',
                      form.billingCycle === c
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-gray-100 dark:border-white/[0.07] text-gray-500 dark:text-white/40 hover:border-gray-200 dark:hover:border-white/15',
                    )}
                  >
                    {c === 'weekly' ? 'สัปดาห์' : c === 'monthly' ? 'เดือน' : c === 'quarterly' ? '3 เดือน' : 'ปี'}
                  </button>
                ))}
              </div>
            </div>

            {/* Next billing date */}
            <div>
              <Label className="text-xs mb-1 block">วันชำระครั้งถัดไป</Label>
              <Input
                type="date"
                value={form.nextBillingDate}
                onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })}
                className="h-10"
              />
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs mb-1 block">หมวดหมู่</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as SubscriptionCategory })}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORY_LABELS)).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div>
              <Label className="text-xs mb-1 block">สี</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    style={{ backgroundColor: c }}
                    className={cn(
                      'w-7 h-7 rounded-full transition-all',
                      form.color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-current scale-110' : 'hover:scale-105'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Website (optional) */}
            <div>
              <Label className="text-xs mb-1 block">เว็บไซต์ (ไม่บังคับ)</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="netflix.com"
                className="h-10"
              />
            </div>

            {/* Note (optional) */}
            <div>
              <Label className="text-xs mb-1 block">หมายเหตุ</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="เช่น แชร์กับครอบครัว"
                className="h-10"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={!form.name.trim() || !form.amount || parseFloat(form.amount) <= 0}
              >
                {editing ? 'บันทึก' : 'เพิ่ม'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
