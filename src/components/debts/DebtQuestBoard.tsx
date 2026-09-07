'use client'

import { useState, useMemo } from 'react'
import {
  HandCoins,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Sparkles,
  Trophy,
  AlertTriangle,
  ReceiptText,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { PressCard } from '@/components/ui/PressCard'
import { DebtItem, DebtType } from '@/types/debt'
import { DebtCard } from './DebtCard'
import { formatCurrency, cn } from '@/lib/utils'

export type DebtFilterType = 'all' | 'i_owe' | 'owed_to_me' | 'settled'

interface DebtQuestBoardProps {
  debts: DebtItem[]
  onAddDebt: () => void
  onEditDebt: (debt: DebtItem) => void
  onRepayDebt: (debt: DebtItem) => void
  onDeleteDebt: (debt: DebtItem) => void
  onDeletePayment: (debtId: string, paymentId: string) => void
}

function getCoachTip(
  totalCount: number,
  overdueCount: number,
  totalIOwe: number,
  totalOwedToMe: number,
  settledCount: number
) {
  if (totalCount === 0) {
    return {
      tone: 'start' as const,
      message: 'เริ่มบันทึกรายการหนี้สินหรือการยืม-คืนเงิน เพื่อให้ติดตามยอดได้ครบถ้วนและไม่ตกหล่น',
    }
  }

  if (overdueCount > 0) {
    return {
      tone: 'warning' as const,
      message: `มี ${overdueCount} รายการที่เกินกำหนดชำระแล้ว แนะนำให้รีบติดต่อหรือจัดสรรเงินคืนเพื่อรักษาเครดิต`,
    }
  }

  if (totalIOwe === 0 && totalOwedToMe === 0 && settledCount > 0) {
    return {
      tone: 'success' as const,
      message: `ยอดเยี่ยมมาก! คุณเคลียร์หนี้สินครบทุกรายการแล้ว (${settledCount} รายการ) ปลอดภาระ 100%`,
    }
  }

  if (totalIOwe > totalOwedToMe) {
    return {
      tone: 'progress' as const,
      message: `คุณมียอดที่ต้องจ่ายคืน ${formatCurrency(totalIOwe)} แนะนำตั้งเป้าหมายทยอยคืนทีละงวดอย่างสม่ำเสมอ`,
    }
  }

  return {
    tone: 'progress' as const,
    message: `มีคนติดหนี้คุณอยู่ ${formatCurrency(totalOwedToMe)} อย่าลืมติดตามทวงถามเมื่อใกล้ถึงกำหนดชำระ`,
  }
}

export function DebtQuestBoard({
  debts,
  onAddDebt,
  onEditDebt,
  onRepayDebt,
  onDeleteDebt,
  onDeletePayment,
}: DebtQuestBoardProps) {
  const [filter, setFilter] = useState<DebtFilterType>('all')

  const totalCount = debts.length
  const settledDebts = debts.filter((d) => d.isSettled)
  const pendingDebts = debts.filter((d) => !d.isSettled)

  const settledCount = settledDebts.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((settledCount / totalCount) * 100)

  const totalIOwe = pendingDebts
    .filter((d) => d.type === 'I_OWE')
    .reduce((sum, d) => sum + Math.max(0, d.totalAmount - d.paidAmount), 0)

  const totalOwedToMe = pendingDebts
    .filter((d) => d.type === 'OWED_TO_ME')
    .reduce((sum, d) => sum + Math.max(0, d.totalAmount - d.paidAmount), 0)

  const netDebt = totalOwedToMe - totalIOwe

  const todayStr = new Date().toISOString().slice(0, 10)
  const overdueCount = pendingDebts.filter((d) => d.dueDate && d.dueDate < todayStr).length

  const coachTip = getCoachTip(totalCount, overdueCount, totalIOwe, totalOwedToMe, settledCount)

  const filteredDebts = useMemo(() => {
    switch (filter) {
      case 'i_owe':
        return debts.filter((d) => d.type === 'I_OWE' && !d.isSettled)
      case 'owed_to_me':
        return debts.filter((d) => d.type === 'OWED_TO_ME' && !d.isSettled)
      case 'settled':
        return debts.filter((d) => d.isSettled)
      default:
        return debts
    }
  }, [debts, filter])

  const pendingList = filteredDebts.filter((d) => !d.isSettled)
  const settledList = filteredDebts.filter((d) => d.isSettled)

  return (
    <div className="space-y-6">
      {/* 1. Hero Card */}
      <DebtQuestHero
        totalCount={totalCount}
        settledCount={settledCount}
        progressPercent={progressPercent}
        totalIOwe={totalIOwe}
        totalOwedToMe={totalOwedToMe}
      />

      {/* 2. 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        <PressCard
          shadow="0 4px 0 0 #9f1239"
          shadowHover="0 4px 0 0 #9f1239"
          className="rounded-3xl border-2 border-rose-400 bg-rose-500 p-4 text-white dark:border-rose-600 dark:bg-rose-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-100">
              ฉันติดหนี้ (I Owe)
            </span>
            <ArrowDownLeft className="h-4 w-4 text-rose-100 stroke-[2.5px]" />
          </div>
          <p className="mt-2 font-quest-heading text-xl md:text-2xl font-black truncate">
            {formatCurrency(totalIOwe)}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-rose-100/80">
            {pendingDebts.filter((d) => d.type === 'I_OWE').length} รายการที่ต้องจ่าย
          </p>
        </PressCard>

        <PressCard
          shadow="0 4px 0 0 #047857"
          shadowHover="0 4px 0 0 #047857"
          className="rounded-3xl border-2 border-emerald-400 bg-emerald-500 p-4 text-white dark:border-emerald-600 dark:bg-emerald-700"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100">
              ติดหนี้ฉัน (Owed to Me)
            </span>
            <ArrowUpRight className="h-4 w-4 text-emerald-100 stroke-[2.5px]" />
          </div>
          <p className="mt-2 font-quest-heading text-xl md:text-2xl font-black truncate">
            {formatCurrency(totalOwedToMe)}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-emerald-100/80">
            {pendingDebts.filter((d) => d.type === 'OWED_TO_ME').length} รายการที่รอรับ
          </p>
        </PressCard>

        <PressCard
          shadow={netDebt >= 0 ? '0 4px 0 0 #0369a1' : '0 4px 0 0 #9f1239'}
          shadowHover={netDebt >= 0 ? '0 4px 0 0 #0369a1' : '0 4px 0 0 #9f1239'}
          className={cn(
            'rounded-3xl border-2 p-4 text-white',
            netDebt >= 0
              ? 'border-sky-400 bg-sky-500 dark:border-sky-600 dark:bg-sky-700'
              : 'border-rose-400 bg-rose-600 dark:border-rose-700 dark:bg-rose-800'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/90">
              ยอดสุทธิ (Net Balance)
            </span>
            <Scale className="h-4 w-4 text-white/90 stroke-[2.5px]" />
          </div>
          <p className="mt-2 font-quest-heading text-xl md:text-2xl font-black truncate">
            {netDebt >= 0 ? `+${formatCurrency(netDebt)}` : formatCurrency(netDebt)}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-white/80">
            {netDebt >= 0 ? 'ลูกหนี้ค้างเรามากกว่า' : 'เรามีภาระหนี้มากกว่า'}
          </p>
        </PressCard>
      </div>

      {/* 3. Action Button */}
      <button
        type="button"
        onClick={onAddDebt}
        className="quest-action-button flex w-full items-center justify-center gap-2 whitespace-nowrap text-sm"
      >
        <Plus className="h-5 w-5 stroke-[2.8px]" />
        <span>บันทึกรายการยืม-คืน</span>
      </button>

      {/* 4. Coach Tip */}
      <DebtCoachTipCard coachTip={coachTip} />

      {/* 5. Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all' as const, label: 'ทั้งหมด', count: totalCount },
          {
            id: 'i_owe' as const,
            label: 'ฉันติดหนี้',
            count: pendingDebts.filter((d) => d.type === 'I_OWE').length,
          },
          {
            id: 'owed_to_me' as const,
            label: 'ติดหนี้ฉัน',
            count: pendingDebts.filter((d) => d.type === 'OWED_TO_ME').length,
          },
          { id: 'settled' as const, label: 'คืนครบแล้ว', count: settledCount },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              'quest-filter-pill whitespace-nowrap select-none',
              filter === id && 'quest-filter-pill-active'
            )}
          >
            <span>{label}</span>
            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-black dark:bg-white/10">
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* 6. List Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 className="font-quest-heading text-[1.35rem] font-black text-[var(--quest-foreground)]">
              รายการหนี้สิน & ยืม-คืน
            </h2>
            <p className="text-sm font-bold text-[var(--quest-muted)]">
              {filteredDebts.length} รายการในมุมมองนี้
            </p>
          </div>
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--quest-outline)]">
            Debt Log
          </span>
        </div>

        {totalCount === 0 ? (
          <DebtEmptyState
            title="ยังไม่มีรายการหนี้สินเหรอ?"
            description="เริ่มบันทึกรายการที่คุณยืมเงินคนอื่นมา หรือรายการที่เพื่อนยืมเงินคุณไป เพื่อเริ่มติดตามสถานะได้อย่างเป็นระบบ"
            onAddDebt={onAddDebt}
          />
        ) : filteredDebts.length === 0 ? (
          <DebtEmptyState
            title="ไม่พบรายการในหมวดนี้"
            description="ลองสลับไปดูมุมมองอื่น หรือบันทึกรายการยืม-คืนใหม่"
            onAddDebt={onAddDebt}
          />
        ) : (
          <div className="space-y-6">
            {pendingList.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]">
                  <Clock className="h-4 w-4" />
                  <span>กำลังรอชำระ / ติดตาม</span>
                  <span className="rounded-full bg-[var(--quest-surface-soft)] px-2 py-0.5 text-[11px] text-[var(--quest-muted)]">
                    {pendingList.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {pendingList.map((debt) => (
                    <DebtCard
                      key={debt.id}
                      debt={debt}
                      onRepay={onRepayDebt}
                      onEdit={onEditDebt}
                      onDelete={onDeleteDebt}
                      onDeletePayment={onDeletePayment}
                    />
                  ))}
                </div>
              </section>
            )}

            {settledList.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>เคลียร์ครบแล้ว</span>
                  <span className="rounded-full bg-[var(--quest-surface-soft)] px-2 py-0.5 text-[11px] text-[var(--quest-muted)]">
                    {settledList.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {settledList.map((debt) => (
                    <DebtCard
                      key={debt.id}
                      debt={debt}
                      onRepay={onRepayDebt}
                      onEdit={onEditDebt}
                      onDelete={onDeleteDebt}
                      onDeletePayment={onDeletePayment}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DebtQuestHero({
  totalCount,
  settledCount,
  progressPercent,
  totalIOwe,
  totalOwedToMe,
}: {
  totalCount: number
  settledCount: number
  progressPercent: number
  totalIOwe: number
  totalOwedToMe: number
}) {
  const subtitle =
    totalCount > 0
      ? `เคลียร์แล้ว ${settledCount} จาก ${totalCount} รายการทั้งหมด`
      : 'เริ่มบันทึกรายการยืม-คืนเงินเพื่อปลดล็อกภารกิจเคลียร์หนี้'

  return (
    <section className="quest-hero-card">
      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex-1 space-y-3">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-current/80">
            Debt & Loan Quest
          </p>
          <div>
            <h1 className="font-quest-heading text-[1.9rem] font-black tracking-tight md:text-[2.25rem]">
              ภารกิจจัดการหนี้สิน & ยืม-คืน
            </h1>
            <p className="mt-2 text-base font-bold text-current/90 md:text-lg">
              {subtitle}
            </p>
          </div>

          <div
            className="h-5 overflow-hidden rounded-full border-2 border-[rgb(31_81_0_/_0.25)] bg-[rgb(31_81_0_/_0.16)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label="ความคืบหน้าการเคลียร์หนี้"
          >
            <div
              className="quest-progress-fill h-full rounded-full border-b-2 border-white/30 bg-white transition-[width] duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 self-start md:self-center">
          <div className="rounded-[1.25rem] border-2 border-white/30 bg-white/20 px-4 py-3 text-center backdrop-blur-sm">
            <span className="block font-quest-heading text-3xl font-black">{progressPercent}%</span>
            <span className="text-xs font-black uppercase tracking-[0.16em]">เคลียร์แล้ว</span>
          </div>
          <Trophy className="h-16 w-16 text-white/55 md:h-20 md:w-20" />
        </div>
      </div>
    </section>
  )
}

function DebtCoachTipCard({
  coachTip,
}: {
  coachTip: { tone: 'start' | 'warning' | 'progress' | 'success'; message: string }
}) {
  const tipTone =
    coachTip.tone === 'warning'
      ? {
          Icon: AlertTriangle,
          iconWrap: 'bg-[#ffb872] text-[#683a00] border-[#8c5000]',
        }
      : coachTip.tone === 'success'
        ? {
            Icon: Trophy,
            iconWrap: 'bg-[#87fe45] text-[#1e5000] border-[#2b6c00]',
          }
        : coachTip.tone === 'start'
          ? {
              Icon: ReceiptText,
              iconWrap: 'bg-[#c8e6ff] text-[#004666] border-[#006590]',
            }
          : {
              Icon: Sparkles,
              iconWrap: 'bg-[#6be026] text-[#1e5000] border-[#2b6c00]',
            }

  return (
    <section className="quest-soft-card flex items-start gap-4 p-4">
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2', tipTone.iconWrap)}>
        <tipTone.Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-sm font-black text-[var(--quest-foreground)]">โค้ชหนี้สินแนะนำ:</h3>
        <p className="mt-1 text-sm font-medium text-[var(--quest-muted)] md:text-base">
          {coachTip.message}
        </p>
      </div>
    </section>
  )
}

function DebtEmptyState({
  title,
  description,
  onAddDebt,
}: {
  title: string
  description: string
  onAddDebt: () => void
}) {
  return (
    <PressCard
      shadow="0 6px 0 0 #becbb1"
      shadowHover="0 4px 0 0 #becbb1"
      className="border-[#becbb1] bg-[var(--quest-surface)] px-6 py-10 text-center dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:shadow-[0_6px_0_0_#0f130c]"
    >
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#becbb1] bg-[var(--quest-surface-low)] text-[var(--quest-primary-container)] dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
        <HandCoins className="h-12 w-12" />
      </div>
      <h2 className="mt-6 font-quest-heading text-[1.7rem] font-black text-[var(--quest-foreground)]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-base text-[var(--quest-muted)]">
        {description}
      </p>
      <button
        type="button"
        onClick={onAddDebt}
        className="quest-action-button mx-auto mt-6 inline-flex items-center gap-2 px-6 whitespace-nowrap"
      >
        <Plus className="h-5 w-5" />
        บันทึกรายการยืม-คืน
      </button>
    </PressCard>
  )
}
