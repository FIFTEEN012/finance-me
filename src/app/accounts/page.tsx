'use client'

import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Pause, Play,
  Wallet, TrendingUp, RefreshCw, Eye, EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PressCard } from '@/components/ui/PressCard'
import { useBankAccountStore } from '@/store/useBankAccountStore'
import { BankAccountForm, BANK_PRESETS } from '@/components/accounts/BankAccountForm'
import { BankAccount, BankAccountType } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'

/* ── Constants ── */
const TYPE_LABELS: Record<BankAccountType, string> = {
  savings:       '🏦 ออมทรัพย์',
  current:       '💳 กระแสรายวัน',
  fixed_deposit: '🔒 ฝากประจำ',
  e_wallet:      '📱 กระเป๋าเงิน',
  credit_card:   '💳 บัตรเครดิต',
  other:         '📦 อื่นๆ',
}

/* ── Helpers ── */
function getBankLabel(bankName: string) {
  return BANK_PRESETS.find((p) => p.bankName === bankName)?.label ?? bankName
}

function maskAccountNumber(last4?: string) {
  if (!last4) return null
  return `xxxx-xxxx-${last4}`
}

/* ── Inline balance editor ── */
function BalanceCell({
  account,
  hidden,
  onSave,
}: {
  account: BankAccount
  hidden: boolean
  onSave: (id: string, val: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(account.balance))

  function commit() {
    const n = parseFloat(val)
    if (!isNaN(n)) onSave(account.id, n)
    setEditing(false)
  }

  if (hidden) {
    return <span className="text-[18px] font-bold num text-gray-400 dark:text-white/30 tracking-widest">••••••</span>
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Input
          autoFocus
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          onBlur={commit}
          className="h-8 w-36 text-right text-sm num"
        />
      </div>
    )
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true); setVal(String(account.balance)) }}
      className="group/bal flex items-center gap-1.5 hover:opacity-75 transition-opacity"
      title="คลิกเพื่อแก้ไขยอดเงิน"
    >
      <span className="text-[18px] font-bold num text-gray-900 dark:text-white">
        {account.currency !== 'THB' ? account.currency + ' ' : '฿'}
        {account.balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <Pencil className="w-3 h-3 text-gray-300 dark:text-white/20 opacity-0 group-hover/bal:opacity-100 transition-opacity" />
    </button>
  )
}

/* ── Account card ── */
function AccountCard({
  account,
  hidden,
  onEdit,
  onDelete,
  onToggle,
  onBalanceSave,
}: {
  account: BankAccount
  hidden: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onBalanceSave: (id: string, val: number) => void
}) {
  return (
    <PressCard
      shadow={`0 4px 0 0 ${account.color}99`}
      shadowHover={`0 2px 0 0 ${account.color}99`}
      className="overflow-hidden border-gray-200"
      style={{ borderColor: account.color + '40', opacity: account.isActive ? 1 : 0.5 }}
    >
      {/* Color top bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${account.color}, ${account.color}88)` }} />

      <div className="p-4">
        {/* Top row: bank + actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: account.color + '20' }}
            >
              {account.emoji}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-white/85">
                {account.accountName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-gray-400 dark:text-white/30">{getBankLabel(account.bankName)}</span>
                {account.accountNumberLast4 && (
                  <>
                    <span className="text-gray-200 dark:text-white/10">·</span>
                    <span className="text-[11px] font-mono text-gray-400 dark:text-white/30">
                      {hidden ? '••••' : maskAccountNumber(account.accountNumberLast4)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggle}
              title={account.isActive ? 'ซ่อนบัญชี' : 'แสดงบัญชี'}
              className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              {account.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-gray-400 dark:text-white/30 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Balance */}
        <BalanceCell account={account} hidden={hidden} onSave={onBalanceSave} />

        {/* Footer: type + note */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: account.color + '18', color: account.color }}
          >
            {TYPE_LABELS[account.type]}
          </span>
          {account.note && (
            <span className="text-[11px] text-gray-400 dark:text-white/25 truncate">{account.note}</span>
          )}
        </div>
      </div>
    </PressCard>
  )
}

/* ── Page ── */
export default function AccountsPage() {
  const { accounts, deleteAccount, toggleActive, updateBalance, getTotalBalance, getCurrencies } =
    useBankAccountStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [hidden, setHidden] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const currencies = getCurrencies()
  const activeAccounts = accounts.filter((a) => a.isActive)
  const thbTotal = getTotalBalance('THB')

  const filtered = accounts.filter((a) =>
    filter === 'all'      ? true :
    filter === 'active'   ? a.isActive :
    !a.isActive
  )

  function openEdit(a: BankAccount) {
    setEditing(a)
    setFormOpen(true)
  }
  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">บัญชีธนาคาร</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {activeAccounts.length} บัญชี · คลิกยอดเงินเพื่อแก้ไข
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHidden(!hidden)}
            className="p-2 rounded-lg text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
            title={hidden ? 'แสดงยอดเงิน' : 'ซ่อนยอดเงิน'}
          >
            {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <Button size="sm" className="gap-1.5 h-8" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" />
            เพิ่มบัญชี
          </Button>
        </div>
      </div>

      {/* Total balance hero */}
      {accounts.length > 0 && (
        <PressCard shadow="0 5px 0 0 #4c1d95" shadowHover="0 3px 0 0 #4c1d95" className="border-violet-400 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500" />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/35 mb-1">
              ยอดรวมทั้งหมด (THB)
            </p>
            {hidden ? (
              <span className="text-3xl font-bold text-gray-400 dark:text-white/30 tracking-widest">••••••••</span>
            ) : (
              <p className="text-3xl font-bold num text-gray-900 dark:text-white">
                ฿{thbTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}

            {/* Per-currency breakdown */}
            {currencies.length > 1 && !hidden && (
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
                {currencies.map((cur) => (
                  <div key={cur} className="text-center">
                    <p className="text-[10px] font-medium text-gray-400 dark:text-white/30 uppercase">{cur}</p>
                    <p className="text-sm font-semibold num text-gray-700 dark:text-white/70">
                      {getTotalBalance(cur).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
              <div>
                <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> บัญชีทั้งหมด
                </p>
                <p className="text-sm font-bold text-gray-800 dark:text-white/80">{accounts.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> บัญชี active
                </p>
                <p className="text-sm font-bold text-gray-800 dark:text-white/80">{activeAccounts.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-white/30 mb-0.5 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> อัปเดตล่าสุด
                </p>
                <p className="text-sm font-bold text-gray-800 dark:text-white/80">
                  {accounts.length > 0
                    ? new Date(
                        Math.max(...accounts.map((a) => new Date(a.updatedAt).getTime()))
                      ).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </PressCard>
      )}

      {/* Filter tabs */}
      {accounts.length > 0 && (
        <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.05] rounded-lg p-1 w-fit">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
                filter === f
                  ? 'bg-violet-600 text-white shadow-[0_2px_0_0_#4c1d95]'
                  : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60',
              )}
            >
              {f === 'all' ? 'ทั้งหมด' : f === 'active' ? '🟢 ใช้งาน' : '⏸ ซ่อน'}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-violet-500 dark:text-violet-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">ยังไม่มีบัญชีธนาคาร</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5 max-w-xs">
            เพิ่มบัญชีธนาคารของคุณเพื่อดูยอดรวมทุกบัญชีในที่เดียว
          </p>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            เพิ่มบัญชีแรก
          </Button>
        </div>
      )}

      {/* Account grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              hidden={hidden}
              onEdit={() => openEdit(a)}
              onDelete={() => deleteAccount(a.id)}
              onToggle={() => toggleActive(a.id)}
              onBalanceSave={updateBalance}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && accounts.length > 0 && (
        <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
          ไม่มีบัญชีใน filter นี้
        </div>
      )}

      <BankAccountForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null) }}
        editing={editing}
      />
    </div>
  )
}
