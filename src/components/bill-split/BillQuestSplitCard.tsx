'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Trash2 } from 'lucide-react'
import { PressCard } from '@/components/ui/PressCard'
import { BillSplit } from '@/types'
import {
  formatBillSplitAmount,
  formatBillSplitDate,
  getBillSplitInitials,
  getBillSplitPendingParticipants,
  isBillSplitSettled,
} from './billSplitQuest'
import { cn } from '@/lib/utils'

interface BillQuestSplitCardProps {
  split: BillSplit
  onDeleteRequest: (splitId: string) => void
  onTogglePaid: (splitId: string, participantId: string, paid: boolean) => void
}

const avatarThemes = [
  'bg-[#2fb8ff] text-[#004666]',
  'bg-[#ffb872] text-[#683a00]',
  'bg-[#87fe45] text-[#1e5000]',
  'bg-[var(--quest-surface-soft)] text-[var(--quest-muted)]',
]

export function BillQuestSplitCard({ split, onDeleteRequest, onTogglePaid }: BillQuestSplitCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const settled = isBillSplitSettled(split)
  const visibleParticipants = split.participants.slice(0, 3)
  const extraParticipants = Math.max(0, split.participants.length - visibleParticipants.length)
  const pendingParticipants = getBillSplitPendingParticipants(split)

  return (
    <PressCard
      shadow={settled ? '0 6px 0 0 #dadada' : '0 6px 0 0 #ff9c27'}
      shadowHover={settled ? '0 4px 0 0 #dadada' : '0 4px 0 0 #ff9c27'}
      className={cn(
        'overflow-hidden border-2 bg-[var(--quest-surface)] p-0',
        settled
          ? 'border-[#becbb1] dark:border-[#3b4630]'
          : 'border-[#ffb872] dark:border-[#8c5000]'
      )}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              'inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.14em]',
              settled
                ? 'border-[var(--quest-primary)] bg-[var(--quest-primary-container)] text-[var(--quest-on-primary-container)]'
                : 'border-[#ffb872] bg-[#ff9c27]/15 text-[#8c5000]'
            )}
          >
            {settled ? 'สำเร็จ' : 'รอเคลียร์'}
          </span>
          <span className="text-xs font-bold text-[var(--quest-outline)]">{formatBillSplitDate(split.date)}</span>
        </div>

        <div>
          <h3 className="font-quest-heading text-[1.35rem] font-black tracking-tight text-[var(--quest-foreground)]">
            {split.title}
          </h3>
          <p
            className={cn(
              'mt-1 font-quest-heading text-[1.7rem] font-black tracking-tight',
              settled
                ? 'text-[var(--quest-outline)] line-through'
                : 'text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]'
            )}
          >
            {formatBillSplitAmount(split.totalAmount, split.currency)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            {visibleParticipants.map((participant, index) => {
              const theme = participant.name === split.paidBy
                ? 'bg-[var(--quest-primary-container)] text-[var(--quest-on-primary-container)]'
                : avatarThemes[index % avatarThemes.length]

              return (
                <div
                  key={participant.id}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--quest-surface)] text-[11px] font-black shadow-sm',
                    theme
                  )}
                  title={participant.name}
                >
                  {getBillSplitInitials(participant.name)}
                </div>
              )
            })}
          </div>
          <span className="min-w-0 truncate text-sm font-bold text-[var(--quest-muted)]">
            {extraParticipants > 0 ? `และอีก ${extraParticipants} คน` : `${split.participants.length} คนร่วมบิล`}
          </span>
        </div>

        <div className="h-px bg-[#becbb1]/60 dark:bg-[#3b4630]" />

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[var(--quest-muted)]">
            ผู้จ่ายก่อน: <span className="text-[var(--quest-foreground)]">{split.paidBy}</span>
          </p>
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="inline-flex items-center gap-1 text-sm font-bold text-[var(--quest-primary)] transition-colors hover:text-[var(--quest-primary-container)] dark:text-[var(--quest-primary-container)]"
            aria-expanded={detailsOpen}
          >
            ดูรายละเอียด
            {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {detailsOpen && (
        <div className="border-t-2 border-[#becbb1] bg-[var(--quest-surface-low)] px-5 py-4 dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
          <div className="space-y-3">
            {split.participants.map((participant) => {
              const isPayer = participant.name === split.paidBy
              const isPaid = isPayer || participant.paid

              return (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#becbb1] bg-[var(--quest-surface)] px-3 py-3 dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black',
                      isPayer
                        ? 'bg-[var(--quest-primary-container)] text-[var(--quest-on-primary-container)]'
                        : 'bg-[var(--quest-surface-soft)] text-[var(--quest-muted)]'
                    )}
                  >
                    {getBillSplitInitials(participant.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm font-black',
                        isPayer
                          ? 'text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]'
                          : 'text-[var(--quest-foreground)]'
                      )}
                    >
                      {participant.name}
                    </p>
                    <p className="text-xs font-bold text-[var(--quest-muted)]">
                      {isPayer ? 'คนที่จ่ายก่อน' : isPaid ? 'เคลียร์แล้ว' : 'ยังรอเคลียร์'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'text-sm font-black',
                        isPaid && !isPayer
                          ? 'text-[var(--quest-outline)] line-through'
                          : 'text-[var(--quest-foreground)]'
                      )}
                    >
                      {formatBillSplitAmount(participant.share, split.currency)}
                    </span>
                    {isPayer ? (
                      <span className="rounded-full bg-[var(--quest-primary-container)] px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-[var(--quest-on-primary-container)]">
                        จ่ายแล้ว
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onTogglePaid(split.id, participant.id, !participant.paid)}
                        className={cn(
                          'rounded-full p-1 transition-colors',
                          participant.paid
                            ? 'text-[#2b6c00] hover:text-[var(--quest-outline)] dark:text-[#87fe45]'
                            : 'text-[var(--quest-outline)] hover:text-[#2b6c00] dark:hover:text-[#87fe45]'
                        )}
                        title={participant.paid ? 'ยกเลิกการเคลียร์' : 'ทำเครื่องหมายว่าเคลียร์แล้ว'}
                      >
                        {participant.paid ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-bold text-[var(--quest-muted)]">
              {settled ? 'ภารกิจนี้เคลียร์ครบแล้ว' : `ยังรอ ${pendingParticipants.length} คนเคลียร์บิล`}
            </div>
            <button
              type="button"
              onClick={() => onDeleteRequest(split.id)}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border-2 border-rose-700 bg-rose-100 px-4 font-bold text-rose-700 shadow-[0_4px_0_0_#7f1d1d] transition-all hover:-translate-y-0.5 hover:bg-rose-200 active:translate-y-1 active:shadow-none dark:bg-rose-900/30 dark:text-rose-200"
            >
              <Trash2 className="h-4 w-4" />
              ลบบิลนี้
            </button>
          </div>

          {split.note && (
            <div className="mt-3 rounded-2xl border border-dashed border-[#becbb1] px-3 py-2 text-sm font-medium text-[var(--quest-muted)] dark:border-[#3b4630]">
              หมายเหตุ: {split.note}
            </div>
          )}
        </div>
      )}
    </PressCard>
  )
}
