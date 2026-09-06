'use client'

import { Pencil, Trash2, ArrowDownLeft, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Budget } from '@/types'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency, cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/shared/CategoryIcon'

interface BudgetCardProps {
  budget: Budget
  spent: number
  rollover?: number
  onEdit: (b: Budget) => void
  onDelete: (id: string) => void
}

export function BudgetCard({ budget, spent, rollover = 0, onEdit, onDelete }: BudgetCardProps) {
  const { getCategoryById } = useCategoryStore()
  const cat = getCategoryById(budget.categoryId)

  const effectiveAmount = budget.amount + rollover
  const pct = effectiveAmount > 0 ? Math.min((spent / effectiveAmount) * 100, 100) : 0
  const isOver = spent > effectiveAmount
  const isWarning = pct >= 85 && !isOver
  const remaining = effectiveAmount - spent

  // Determine progress bar color based on percentage
  const barColor = isOver
    ? 'bg-[#ba1a1a]'
    : pct >= 80
      ? 'bg-[#ff9c27]'
      : 'bg-[var(--quest-primary-container)]'

  return (
    <Card className="bg-white dark:bg-slate-900 rounded-3xl border-[3px] border-[#becbb1] dark:border-slate-800 shadow-[0_4px_0_0_rgba(0,0,0,0.05)] hover:border-[var(--quest-primary-container)] dark:hover:border-[var(--quest-primary-container)] group transition-all duration-200 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {cat && (
              <div
                className="flex items-center justify-center w-12 h-12 rounded-2xl flex-shrink-0 border-2"
                style={{
                  backgroundColor: cat.color + '20',
                  borderColor: cat.color + '40',
                }}
              >
                <CategoryIcon name={cat.icon} className="w-6 h-6" style={{ color: cat.color }} />
              </div>
            )}
            <div>
              <h5 className="text-base font-bold text-gray-900 dark:text-gray-100">{cat?.name ?? 'ไม่ทราบ'}</h5>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                ใช้ไปแล้ว {Math.round(pct)}%
              </p>
            </div>
          </div>
          
          {/* Action buttons visible on hover, but structured neatly */}
          <div className="flex items-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(budget)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[var(--quest-primary)] transition-colors cursor-pointer"
              title="แก้ไขงบประมาณ"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(budget.id)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
              title="ลบงบประมาณ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-black">
            <span className={cn('num', isOver ? 'text-[#ba1a1a]' : 'text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)]')}>
              {formatCurrency(spent)}
            </span>
            <span className="num text-slate-400 dark:text-slate-500">
              {rollover > 0 ? (
                <>
                  {formatCurrency(budget.amount)}{' '}
                  <span className="text-blue-500">+{formatCurrency(rollover)}</span>
                </>
              ) : (
                formatCurrency(effectiveAmount)
              )}
            </span>
          </div>
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
            <div
              className={cn('h-full rounded-full transition-all duration-500', barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Warning & Rollover Status */}
        <div className="mt-2 flex flex-col gap-1">
          {isOver ? (
            <p className="text-xs font-bold text-[#ba1a1a] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              เกินงบไปแล้ว {formatCurrency(Math.abs(remaining))}
            </p>
          ) : isWarning ? (
            <p className="text-xs font-bold text-[#ff9c27] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
              ระวัง! ใกล้เต็มงบแล้ว (เหลือ {formatCurrency(remaining)})
            </p>
          ) : (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              เหลือใช้ได้อีก {formatCurrency(remaining)}
            </p>
          )}
          {rollover > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              <ArrowDownLeft className="w-3 h-3" />
              รวมทบยอดงบประมาณเหลือมาจากเดือนที่แล้ว
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
