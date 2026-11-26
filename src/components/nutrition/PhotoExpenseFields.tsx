'use client'

import { Input } from '@/components/ui/input'
import type { Category } from '@/types'

export interface PhotoExpenseValue {
  on: boolean
  amount: string
  categoryId: string
}

interface Props {
  value: PhotoExpenseValue
  onChange: (value: PhotoExpenseValue) => void
  /** Only Food Categories (see foodCategories()). */
  categories: Category[]
  /** Show the "enter an amount" error. */
  showErrors?: boolean
}

/** Parsed amount, or null when it is not a positive number. */
export function photoExpenseAmount(value: PhotoExpenseValue): number | null {
  const amount = Number(value.amount)
  return value.amount.trim() !== '' && Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null
}

/** The "บันทึกรายจ่ายด้วย" switch shown in a Photo Draft on /nutrition, with amount and Food Category. */
export function PhotoExpenseFields({ value, onChange, categories, showErrors = false }: Props) {
  const noCategories = categories.length === 0
  const amountInvalid = showErrors && value.on && photoExpenseAmount(value) === null

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
        บันทึกรายจ่ายด้วย
        <input
          type="checkbox"
          role="switch"
          checked={value.on}
          disabled={noCategories}
          onChange={(e) => onChange({ ...value, on: e.target.checked })}
          className="size-5 shrink-0 accent-emerald-600"
        />
      </label>
      {noCategories && (
        <p className="text-xs text-slate-500 dark:text-slate-400">ยังไม่มีหมวดอาหาร ตั้งหมวดรายจ่ายเป็นหมวดอาหารได้ที่หน้าหมวดหมู่</p>
      )}
      {value.on && !noCategories && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold">ยอดเงิน (บาท)
            <Input
              type="number" min="0" step="0.01" inputMode="decimal"
              value={value.amount}
              onChange={(e) => onChange({ ...value, amount: e.target.value })}
              aria-invalid={amountInvalid || undefined}
              className={amountInvalid ? 'mt-1 border-red-400' : 'mt-1'}
              placeholder="0.00"
            />
          </label>
          <label className="text-xs font-semibold">หมวด
            <select
              value={value.categoryId}
              onChange={(e) => onChange({ ...value, categoryId: e.target.value })}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {amountInvalid && <p className="col-span-2 text-xs text-red-600 dark:text-red-400">กรุณาใส่ยอดเงินมากกว่า 0</p>}
        </div>
      )}
    </div>
  )
}
