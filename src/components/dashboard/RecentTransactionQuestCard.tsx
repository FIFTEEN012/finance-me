import Link from 'next/link'
import { ArrowLeftRight } from 'lucide-react'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { cn } from '@/lib/utils'
import type { RecentQuestTransaction } from './forestDashboard'

interface RecentTransactionQuestCardProps {
  transactions: RecentQuestTransaction[]
}

export function RecentTransactionQuestCard({ transactions }: RecentTransactionQuestCardProps) {
  return (
    <section className="forest-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-quest-heading text-[1.2rem] font-black tracking-[-0.02em] text-[var(--forest-foreground)]">
          ธุรกรรมล่าสุด
        </h2>
        <Link href="/transactions" className="text-[12px] font-bold text-[var(--forest-primary)] hover:underline">
          ดูทั้งหมด
        </Link>
      </div>

      {transactions.length > 0 ? (
        <div className="space-y-2.5">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--forest-outline-variant)]/30 bg-[var(--forest-surface-low)] p-3 transition-colors hover:border-[var(--forest-outline-variant)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--forest-outline-variant)]/20 bg-white">
                  <CategoryIcon name={transaction.icon} className="h-5 w-5" style={{ color: transaction.iconColor }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[var(--forest-foreground)]">{transaction.title}</p>
                  <p className="truncate text-[11px] font-medium text-[var(--forest-muted)]">{transaction.meta}</p>
                </div>
              </div>

              <p
                className={cn(
                  'num text-[1.1rem] font-black tracking-tight',
                  transaction.amountTone === 'income'
                    ? 'text-[#1b4300]'
                    : transaction.amountTone === 'expense'
                      ? 'text-[#ba1a1a]'
                      : 'text-[#0369a1]'
                )}
              >
                {transaction.amountLabel}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--forest-outline-variant)] bg-[var(--forest-surface-low)] px-4 py-8 text-center">
          <ArrowLeftRight className="h-9 w-9 text-[var(--forest-outline)]" />
          <div>
            <p className="font-quest-heading text-lg font-black text-[var(--forest-foreground)]">ยังไม่มีธุรกรรมล่าสุด</p>
            <p className="text-sm font-medium text-[var(--forest-muted)]">เพิ่มรายการแรกเพื่อเริ่มภารกิจการเงินของคุณ</p>
          </div>
          <Link href="/transactions" className="forest-button-outline inline-flex items-center justify-center px-4 py-2 text-sm">
            ไปหน้าธุรกรรม
          </Link>
        </div>
      )}
    </section>
  )
}
