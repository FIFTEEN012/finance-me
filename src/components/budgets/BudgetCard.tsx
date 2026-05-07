'use client'

import { MoreHorizontal, Pencil, Trash2, ArrowDownLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Budget } from '@/types'
import { useCategoryStore } from '@/store/useCategoryStore'
import { formatCurrency, cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/shared/CategoryIcon'
import { buttonVariants } from '@/components/ui/button'

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
  const remaining = effectiveAmount - spent

  const barColor = pct < 70 ? 'bg-violet-500' : pct < 90 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <Card className="border shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {cat && (
              <div
                className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                style={{ backgroundColor: cat.color + '20' }}
              >
                <CategoryIcon name={cat.icon} className="w-5 h-5" style={{ color: cat.color }} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{cat?.name ?? 'ไม่ทราบ'}</p>
                {rollover > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <ArrowDownLeft className="w-2.5 h-2.5" />
                    +{formatCurrency(rollover)}
                  </span>
                )}
              </div>
              <p className={cn('text-xs', isOver ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400')}>
                {isOver
                  ? `เกินงบ ${formatCurrency(Math.abs(remaining))}`
                  : `คงเหลือ ${formatCurrency(remaining)}`}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}>
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(budget)}>
                <Pencil className="w-4 h-4 mr-2" />
                แก้ไข
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(budget.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                ลบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-2">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>ใช้ไป {formatCurrency(spent)}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {rollover > 0
              ? <>{formatCurrency(budget.amount)} <span className="text-blue-500">+{formatCurrency(rollover)}</span></>
              : formatCurrency(effectiveAmount)
            }
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
