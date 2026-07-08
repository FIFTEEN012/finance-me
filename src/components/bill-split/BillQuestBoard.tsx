import {
  CircleCheckBig,
  Hourglass,
  Plus,
  ReceiptText,
  Sparkles,
  Trophy,
  TriangleAlert,
} from 'lucide-react'
import { PressCard } from '@/components/ui/PressCard'
import { BillSplit } from '@/types'
import { BillQuestSplitCard } from './BillQuestSplitCard'
import { BillQuestFilter } from './billSplitQuest'
import { cn } from '@/lib/utils'

export interface BillQuestCoachTip {
  message: string
  tone: 'start' | 'warning' | 'progress' | 'success'
}

interface BillQuestBoardProps {
  totalBills: number
  settledBills: number
  pendingBills: number
  progressPercent: number
  filter: BillQuestFilter
  onFilterChange: (filter: BillQuestFilter) => void
  coachTip: BillQuestCoachTip
  pendingSplits: BillSplit[]
  settledSplits: BillSplit[]
  onOpenForm: () => void
  onDeleteRequest: (splitId: string) => void
  onTogglePaid: (splitId: string, participantId: string, paid: boolean) => void
}

const summaryAccents = {
  total: {
    card: 'bg-[#2fb8ff] text-[#004666] border-[#006590]',
    shadow: '0 4px 0 0 #004666',
  },
  settled: {
    card: 'bg-[#58cc02] text-[#1e5000] border-[#2b6c00]',
    shadow: '0 4px 0 0 #1e5000',
  },
  pending: {
    card: 'bg-[#ff9c27] text-[#683a00] border-[#8c5000]',
    shadow: '0 4px 0 0 #683a00',
  },
} as const

export function BillQuestBoard({
  totalBills,
  settledBills,
  pendingBills,
  progressPercent,
  filter,
  onFilterChange,
  coachTip,
  pendingSplits,
  settledSplits,
  onOpenForm,
  onDeleteRequest,
  onTogglePaid,
}: BillQuestBoardProps) {
  const hasBills = totalBills > 0
  const activeTotal = filter === 'all' ? totalBills : filter === 'pending' ? pendingBills : settledBills

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 pb-28 font-quest-body md:px-8 md:py-10 lg:pb-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <BillQuestHero
          totalBills={totalBills}
          settledBills={settledBills}
          progressPercent={progressPercent}
        />

        <section className="grid grid-cols-3 gap-3 md:gap-4">
          <BillQuestSummaryCard
            label="บิลทั้งหมด"
            value={totalBills}
            accent={summaryAccents.total}
          />
          <BillQuestSummaryCard
            label="เคลียร์แล้ว"
            value={settledBills}
            accent={summaryAccents.settled}
          />
          <BillQuestSummaryCard
            label="ยังรอจ่าย"
            value={pendingBills}
            accent={summaryAccents.pending}
          />
        </section>

        <button
          type="button"
          onClick={onOpenForm}
          className="quest-action-button flex w-full items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          สร้างบิลใหม่
        </button>

        <BillQuestTipCard coachTip={coachTip} />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            ['all', 'ทั้งหมด', totalBills],
            ['pending', 'รอเคลียร์', pendingBills],
            ['settled', 'สำเร็จ', settledBills],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={cn(
                'quest-filter-pill whitespace-nowrap',
                filter === value && 'quest-filter-pill-active'
              )}
            >
              <span>{label}</span>
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-black dark:bg-white/10">
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="font-quest-heading text-[1.35rem] font-black text-[var(--quest-foreground)]">
                บิลของฉัน
              </h2>
              <p className="text-sm font-bold text-[var(--quest-muted)]">
                {activeTotal} รายการในมุมมองนี้
              </p>
            </div>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--quest-outline)]">
              Quest Log
            </span>
          </div>

          {!hasBills ? (
            <BillQuestEmptyState
              title="ยังไม่มีบิลเหรอ?"
              description="เริ่มสร้างบิลใหม่เพื่อเริ่มภารกิจจัดการค่าใช้จ่ายร่วมกันให้เป็นระเบียบมากขึ้น"
              onOpenForm={onOpenForm}
            />
          ) : activeTotal === 0 ? (
            <BillQuestEmptyState
              title={filter === 'pending' ? 'ไม่มีบิลที่ยังรอเคลียร์' : 'ยังไม่มีบิลที่เคลียร์แล้ว'}
              description={
                filter === 'pending'
                  ? 'ตอนนี้ทุกบิลในระบบถูกเคลียร์แล้ว ลองสร้างบิลใหม่หรือสลับไปดูบิลที่สำเร็จ'
                  : 'ยังไม่มีบิลที่เคลียร์ครบ ลองตามยอดที่ค้างอยู่ก่อนเพื่อปลดล็อกความสำเร็จ'
              }
              onOpenForm={onOpenForm}
            />
          ) : (
            <>
              {(filter === 'all' || filter === 'pending') && pendingSplits.length > 0 && (
                <BillQuestSection
                  title="กำลังรอเคลียร์"
                  count={pendingSplits.length}
                  icon={Hourglass}
                  accentClass="text-[#8c5000]"
                  splits={pendingSplits}
                  onDeleteRequest={onDeleteRequest}
                  onTogglePaid={onTogglePaid}
                />
              )}

              {(filter === 'all' || filter === 'settled') && settledSplits.length > 0 && (
                <BillQuestSection
                  title="เคลียร์สำเร็จ"
                  count={settledSplits.length}
                  icon={CircleCheckBig}
                  accentClass="text-[#2b6c00] dark:text-[#87fe45]"
                  splits={settledSplits}
                  onDeleteRequest={onDeleteRequest}
                  onTogglePaid={onTogglePaid}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface BillQuestHeroProps {
  totalBills: number
  settledBills: number
  progressPercent: number
}

export function BillQuestHero({ totalBills, settledBills, progressPercent }: BillQuestHeroProps) {
  const description = totalBills > 0
    ? `ตอนนี้คุณเคลียร์แล้ว ${settledBills} จาก ${totalBills} บิลทั้งหมด`
    : 'เริ่มสร้างบิลแรกเพื่อปลดล็อกภารกิจเคลียร์บิลของคุณ'

  return (
    <section className="quest-hero-card">
      <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex-1 space-y-3">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-current/80">
            Finance Quest
          </p>
          <div>
            <h1 className="font-quest-heading text-[1.9rem] font-black tracking-tight md:text-[2.25rem]">
              ภารกิจเคลียร์บิล
            </h1>
            <p className="mt-2 text-base font-bold text-current/90 md:text-lg">
              {description}
            </p>
          </div>

          <div
            className="h-5 overflow-hidden rounded-full border-2 border-[rgb(31_81_0_/_0.25)] bg-[rgb(31_81_0_/_0.16)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            aria-label="ความคืบหน้าการเคลียร์บิล"
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
            <span className="text-xs font-black uppercase tracking-[0.16em]">สำเร็จ</span>
          </div>
          <Trophy className="h-16 w-16 text-white/55 md:h-20 md:w-20" />
        </div>
      </div>
    </section>
  )
}

interface BillQuestSummaryCardProps {
  label: string
  value: number
  accent: {
    card: string
    shadow: string
  }
}

export function BillQuestSummaryCard({ label, value, accent }: BillQuestSummaryCardProps) {
  return (
    <PressCard
      shadow={accent.shadow}
      shadowHover={accent.shadow}
      className={cn('rounded-3xl border-2 p-3 text-center md:p-4', accent.card)}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.12em] md:text-xs">{label}</p>
      <p className="mt-1 font-quest-heading text-2xl font-black tracking-tight md:text-[1.75rem]">{value}</p>
    </PressCard>
  )
}

interface BillQuestTipCardProps {
  coachTip: BillQuestCoachTip
}

export function BillQuestTipCard({ coachTip }: BillQuestTipCardProps) {
  const tipTone = coachTip.tone === 'warning'
    ? {
        Icon: TriangleAlert,
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
        <h3 className="text-sm font-black text-[var(--quest-foreground)]">โค้ชการเงินบอกว่า:</h3>
        <p className="mt-1 text-sm font-medium text-[var(--quest-muted)] md:text-base">
          {coachTip.message}
        </p>
      </div>
    </section>
  )
}

interface BillQuestSectionProps {
  title: string
  count: number
  icon: typeof Hourglass
  accentClass: string
  splits: BillSplit[]
  onDeleteRequest: (splitId: string) => void
  onTogglePaid: (splitId: string, participantId: string, paid: boolean) => void
}

export function BillQuestSection({
  title,
  count,
  icon: Icon,
  accentClass,
  splits,
  onDeleteRequest,
  onTogglePaid,
}: BillQuestSectionProps) {
  return (
    <section className="space-y-4">
      <div className={cn('flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]', accentClass)}>
        <Icon className="h-4 w-4" />
        <span>{title}</span>
        <span className="rounded-full bg-[var(--quest-surface-soft)] px-2 py-0.5 text-[11px] text-[var(--quest-muted)] dark:bg-[var(--quest-surface-soft)]">
          {count}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {splits.map((split) => (
          <BillQuestSplitCard
            key={split.id}
            split={split}
            onDeleteRequest={onDeleteRequest}
            onTogglePaid={onTogglePaid}
          />
        ))}
      </div>
    </section>
  )
}

interface BillQuestEmptyStateProps {
  title: string
  description: string
  onOpenForm: () => void
}

export function BillQuestEmptyState({ title, description, onOpenForm }: BillQuestEmptyStateProps) {
  return (
    <PressCard
      shadow="0 6px 0 0 #becbb1"
      shadowHover="0 4px 0 0 #becbb1"
      className="border-[#becbb1] bg-[var(--quest-surface)] px-6 py-10 text-center dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:shadow-[0_6px_0_0_#0f130c]"
    >
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#becbb1] bg-[var(--quest-surface-low)] text-[#58cc02] dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
        <ReceiptText className="h-12 w-12" />
      </div>
      <h2 className="mt-6 font-quest-heading text-[1.7rem] font-black text-[var(--quest-foreground)]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-base text-[var(--quest-muted)]">
        {description}
      </p>
      <button
        type="button"
        onClick={onOpenForm}
        className="quest-action-button mx-auto mt-6 inline-flex items-center gap-2 px-6"
      >
        <Plus className="h-5 w-5" />
        สร้างบิลใหม่
      </button>
    </PressCard>
  )
}
