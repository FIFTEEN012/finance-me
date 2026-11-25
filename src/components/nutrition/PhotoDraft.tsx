'use client'

import { useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MEALS, mealForHour } from '@/lib/nutrition'
import {
  foodInputsFromDraft,
  photoDraftRowIsValid,
  photoDraftRows,
  type FoodPhotoConfidence,
  type FoodPhotoItem,
  type PhotoDraftRow,
} from '@/lib/foodPhoto'
import type { FoodInput } from '@/store/useNutritionStore'
import type { MealType } from '@/types'
import { cn } from '@/lib/utils'

const CONFIDENCE: Record<FoodPhotoConfidence, { label: string; className: string }> = {
  high: { label: 'มั่นใจสูง', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  medium: { label: 'มั่นใจปานกลาง', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
  low: { label: 'มั่นใจต่ำ', className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
}

const MACRO_FIELDS = [
  { field: 'proteinG', label: 'โปรตีน (ก.)' },
  { field: 'carbsG', label: 'คาร์บ (ก.)' },
  { field: 'fatG', label: 'ไขมัน (ก.)' },
] as const

const numberOrNull = (value: string) => (value === '' ? null : Number(value))

export interface PhotoDraftProps {
  /** The AI's suggestions for one photo. Give the component a new `key` for a new photo. */
  items: FoodPhotoItem[]
  /** Day the Food Entries are saved on (yyyy-MM-dd). */
  date: string
  /** Meal every row starts in; defaults to a guess from the current hour. */
  defaultMeal?: MealType
  /** Called with the ticked, valid rows as Food Entry inputs. Nothing is saved by the component itself. */
  onSave: (entries: FoodInput[]) => void
  onCancel?: () => void
  saving?: boolean
  /** Extra controls shown above the save button (e.g. a "save expense too" switch). */
  footer?: ReactNode
  /** Save button text for `count` ticked rows. */
  saveLabel?: (count: number) => string
}

/** Photo Draft: the Food Entries suggested from a photo, for the user to edit and tick before saving. */
export function PhotoDraft({ items, date, defaultMeal, onSave, onCancel, saving = false, footer, saveLabel }: PhotoDraftProps) {
  const [rows, setRows] = useState<PhotoDraftRow[]>(() => photoDraftRows(items, defaultMeal ?? mealForHour(new Date().getHours())))
  const [showErrors, setShowErrors] = useState(false)

  const update = (key: string, patch: Partial<PhotoDraftRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          ไม่พบอาหารในภาพ ลองถ่ายใหม่ให้เห็นอาหารชัด ๆ หรือพิมพ์บันทึกเอง
        </p>
        {footer}
        {onCancel && <Button type="button" variant="outline" className="w-full" onClick={onCancel}>ปิด</Button>}
      </div>
    )
  }

  const ticked = rows.filter((row) => row.included)
  const invalid = ticked.filter((row) => !photoDraftRowIsValid(row))
  const totalKcal = ticked.reduce((sum, row) => sum + (row.kcal ?? 0), 0)

  const save = () => {
    if (invalid.length > 0) {
      setShowErrors(true)
      return
    }
    onSave(foodInputsFromDraft(rows, date))
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        ค่าทั้งหมดเป็นการประมาณจาก AI ตรวจและแก้ก่อนบันทึก ติ๊กออกรายการที่ไม่ต้องการ
      </p>
      <ul className="space-y-3">
        {rows.map((row, index) => {
          const rowInvalid = showErrors && row.included && !photoDraftRowIsValid(row)
          return (
            <li
              key={row.key}
              aria-label={`รายการที่ ${index + 1}`}
              className={cn(
                'rounded-2xl border-2 bg-white p-3 dark:bg-slate-900',
                rowInvalid ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-800',
                !row.included && 'opacity-60',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex min-h-11 min-w-0 cursor-pointer items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={(e) => update(row.key, { included: e.target.checked })}
                    className="size-4 shrink-0 accent-emerald-600"
                  />
                  <span className="break-words">{row.name || `รายการที่ ${index + 1}`}</span>
                </label>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold', CONFIDENCE[row.confidence].className)}>
                  {CONFIDENCE[row.confidence].label}
                </span>
              </div>
              {row.portion && <p className="text-xs text-slate-500 dark:text-slate-400 pl-6">ขนาด {row.portion}</p>}
              {row.included && (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label className="col-span-2 text-xs font-semibold">ชื่ออาหาร
                    <Input value={row.name} onChange={(e) => update(row.key, { name: e.target.value })} className="mt-1" />
                  </label>
                  <label className="text-xs font-semibold">มื้อ
                    <select
                      value={row.meal}
                      onChange={(e) => update(row.key, { meal: e.target.value as MealType })}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {MEALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold">แคลอรี่ (kcal)
                    <Input
                      type="number" min="0" step="1" inputMode="numeric"
                      value={row.kcal ?? ''}
                      onChange={(e) => update(row.key, { kcal: numberOrNull(e.target.value) })}
                      className="mt-1"
                    />
                  </label>
                  {MACRO_FIELDS.map(({ field, label }) => (
                    <label key={field} className="text-xs font-semibold">{label}
                      <Input
                        type="number" min="0" step="any" inputMode="decimal"
                        value={row[field] ?? ''}
                        onChange={(e) => update(row.key, { [field]: numberOrNull(e.target.value) })}
                        className="mt-1"
                      />
                    </label>
                  ))}
                  {rowInvalid && <p className="col-span-full text-xs text-red-600 dark:text-red-400">กรุณาใส่ชื่อและแคลอรี่ 0 – 20,000 kcal</p>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-sm text-slate-600 dark:text-slate-300 num tabular-nums">
        เลือก {ticked.length} รายการ · รวม {totalKcal.toLocaleString('th-TH')} kcal
      </p>
      {footer}
      <div className="flex gap-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>ยกเลิก</Button>}
        <Button type="button" className="flex-1 gap-1.5" onClick={save} disabled={saving || ticked.length === 0}>
          <Check className="w-4 h-4" />
          {saveLabel ? saveLabel(ticked.length) : `บันทึก ${ticked.length} รายการ`}
        </Button>
      </div>
    </div>
  )
}
