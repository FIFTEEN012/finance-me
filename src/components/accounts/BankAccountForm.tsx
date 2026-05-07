'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBankAccountStore } from '@/store/useBankAccountStore'
import { BankAccount, BankAccountType } from '@/types'
import { cn } from '@/lib/utils'

/* ── Thai bank presets ── */
export const BANK_PRESETS = [
  { bankName: 'SCB',      label: 'ไทยพาณิชย์',       emoji: '🟣', color: '#4E2D8B' },
  { bankName: 'KBank',    label: 'กสิกรไทย',          emoji: '🟢', color: '#138F2D' },
  { bankName: 'BBL',      label: 'กรุงเทพ',           emoji: '🔵', color: '#1B3D8F' },
  { bankName: 'KTB',      label: 'กรุงไทย',           emoji: '🔵', color: '#00A0E2' },
  { bankName: 'BAY',      label: 'กรุงศรี',           emoji: '🟡', color: '#FFD700' },
  { bankName: 'TTB',      label: 'ทหารไทยธนชาต',      emoji: '🔵', color: '#0067B1' },
  { bankName: 'CIMB',     label: 'ซีไอเอ็มบี',        emoji: '🔴', color: '#C8102E' },
  { bankName: 'UOB',      label: 'ยูโอบี',             emoji: '🔵', color: '#003087' },
  { bankName: 'GSB',      label: 'ออมสิน',             emoji: '🩷', color: '#E4007F' },
  { bankName: 'GHB',      label: 'อาคารสงเคราะห์',    emoji: '🟠', color: '#F37021' },
  { bankName: 'Wise',     label: 'Wise',               emoji: '💚', color: '#00B9A9' },
  { bankName: 'TrueMoney',label: 'True Money Wallet',  emoji: '📱', color: '#FF0000' },
  { bankName: 'Rabbit',   label: 'Rabbit LINE Pay',    emoji: '🐰', color: '#06C755' },
  { bankName: 'PromptPay',label: 'พร้อมเพย์',          emoji: '📲', color: '#003087' },
  { bankName: 'Other',    label: 'อื่นๆ',              emoji: '🏦', color: '#6366F1' },
]

const TYPE_LABELS: Record<BankAccountType, string> = {
  savings:      'ออมทรัพย์',
  current:      'กระแสรายวัน',
  fixed_deposit:'ฝากประจำ',
  e_wallet:     'กระเป๋าเงิน',
  credit_card:  'บัตรเครดิต',
  other:        'อื่นๆ',
}

const COLORS = [
  '#4E2D8B','#138F2D','#1B3D8F','#00A0E2','#FFD700',
  '#0067B1','#C8102E','#E4007F','#F37021','#6366F1',
  '#7C3AED','#10B981','#3B82F6','#EF4444','#F59E0B',
]

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: BankAccount | null
}

const EMPTY = {
  bankName: '', accountName: '', accountNumberLast4: '',
  type: 'savings' as BankAccountType,
  balance: '', currency: 'THB',
  color: '#6366F1', emoji: '🏦',
  note: '', isActive: true,
}

export function BankAccountForm({ open, onOpenChange, editing }: Props) {
  const { addAccount, updateAccount } = useBankAccountStore()
  const [form, setForm] = useState(EMPTY)
  const [step, setStep] = useState<'bank' | 'details'>('bank')

  useEffect(() => {
    if (editing) {
      setForm({
        bankName: editing.bankName,
        accountName: editing.accountName,
        accountNumberLast4: editing.accountNumberLast4 ?? '',
        type: editing.type,
        balance: String(editing.balance),
        currency: editing.currency,
        color: editing.color,
        emoji: editing.emoji,
        note: editing.note ?? '',
        isActive: editing.isActive,
      })
      setStep('details')
    } else {
      setForm(EMPTY)
      setStep('bank')
    }
  }, [editing, open])

  function selectBank(preset: typeof BANK_PRESETS[number]) {
    setForm((f) => ({
      ...f,
      bankName: preset.bankName,
      emoji: preset.emoji,
      color: preset.color,
      accountName: preset.label,
    }))
    setStep('details')
  }

  function handleSave() {
    const bal = parseFloat(form.balance)
    if (!form.bankName || !form.accountName.trim() || isNaN(bal)) return

    const payload: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'> = {
      bankName:            form.bankName,
      accountName:         form.accountName.trim(),
      accountNumberLast4:  form.accountNumberLast4 || undefined,
      type:                form.type,
      balance:             bal,
      currency:            form.currency,
      color:               form.color,
      emoji:               form.emoji,
      note:                form.note || undefined,
      isActive:            form.isActive,
    }

    if (editing) {
      updateAccount(editing.id, payload)
    } else {
      addAccount(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'แก้ไขบัญชี' : step === 'bank' ? 'เลือกธนาคาร' : 'ข้อมูลบัญชี'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1 — Bank picker */}
        {step === 'bank' && !editing && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {BANK_PRESETS.map((p) => (
              <button
                key={p.bankName}
                onClick={() => selectBank(p)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150',
                  'border-gray-100 dark:border-white/[0.07] bg-white dark:bg-white/[0.03]',
                  'hover:border-violet-300 dark:hover:border-violet-500/40',
                  'hover:bg-violet-50 dark:hover:bg-violet-500/10 active:scale-95',
                )}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: p.color + '22' }}
                >
                  {p.emoji}
                </span>
                <span className="text-[11px] font-semibold text-gray-800 dark:text-white/75 text-center leading-tight">{p.bankName}</span>
                <span className="text-[10px] text-gray-400 dark:text-white/30 text-center leading-tight">{p.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Details */}
        {(step === 'details' || editing) && (
          <div className="space-y-4 pt-1">

            {/* Bank indicator */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06]">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: form.color + '25' }}
              >
                {form.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 dark:text-white/85">{form.bankName}</p>
                <button
                  onClick={() => !editing && setStep('bank')}
                  className="text-[11px] text-violet-500 dark:text-violet-400"
                >
                  {!editing && 'เปลี่ยนธนาคาร'}
                </button>
              </div>
              {/* Emoji override */}
              <Input
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                className="w-14 text-center text-lg h-9 ml-auto"
                maxLength={4}
              />
            </div>

            {/* Account name */}
            <div>
              <Label className="text-xs mb-1 block">ชื่อบัญชี *</Label>
              <Input
                value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                placeholder="เช่น บัญชีหลัก, บัญชีเงินเดือน"
                className="h-10"
              />
            </div>

            {/* Account number last 4 */}
            <div>
              <Label className="text-xs mb-1 block">เลขบัญชี 4 ตัวท้าย (ไม่บังคับ)</Label>
              <Input
                value={form.accountNumberLast4}
                onChange={(e) => setForm({ ...form, accountNumberLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="1234"
                maxLength={4}
                className="h-10"
              />
            </div>

            {/* Account type */}
            <div>
              <Label className="text-xs mb-1 block">ประเภทบัญชี</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.entries(TYPE_LABELS) as [BankAccountType, string][]).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, type: t })}
                    className={cn(
                      'py-2 px-1 rounded-lg text-[11px] font-medium border transition-colors text-center',
                      form.type === t
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'border-gray-100 dark:border-white/[0.07] text-gray-500 dark:text-white/40 hover:border-gray-200 dark:hover:border-white/15',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Balance + Currency */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">ยอดเงินปัจจุบัน *</Label>
                <Input
                  type="number"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })}
                  placeholder="0"
                  className="h-10"
                />
              </div>
              <div className="w-28">
                <Label className="text-xs mb-1 block">สกุลเงิน</Label>
                <Select value={form.currency} onValueChange={(v) => v && setForm({ ...form, currency: v })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['THB','USD','EUR','JPY','SGD','GBP','CNY','HKD'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                      form.color === c
                        ? 'ring-2 ring-offset-2 ring-offset-background ring-current scale-110'
                        : 'hover:scale-105',
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Note */}
            <div>
              <Label className="text-xs mb-1 block">หมายเหตุ</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="เช่น บัญชีสำหรับค่าใช้จ่ายประจำ"
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
                disabled={!form.bankName || !form.accountName.trim() || form.balance === ''}
              >
                {editing ? 'บันทึก' : 'เพิ่มบัญชี'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
