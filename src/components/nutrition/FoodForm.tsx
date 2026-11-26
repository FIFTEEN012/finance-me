'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MEALS, lastKcalFor, mealForHour, recentFoodNames } from '@/lib/nutrition'
import { FoodInput } from '@/store/useNutritionStore'
import { FoodEntry } from '@/types'

// Macros are optional grams; a blank input means "not given" (undefined).
const macro = z
  .number()
  .min(0, 'ใส่ได้ 0 – 2,000 กรัม')
  .max(2000, 'ใส่ได้ 0 – 2,000 กรัม')
  .optional()

const blankToUndefined = (v: unknown) => (v === '' || v == null ? undefined : Number(v))

const schema = z.object({
  name: z.string().trim().min(1, 'กรุณาระบุชื่ออาหาร'),
  // An empty number input arrives as NaN.
  kcal: z
    .number()
    .refine((n) => !Number.isNaN(n), 'กรุณาระบุแคลอรี่')
    .refine((n) => Number.isNaN(n) || Number.isInteger(n), 'ใส่เป็นจำนวนเต็ม')
    .refine((n) => Number.isNaN(n) || (n >= 0 && n <= 20000), 'ใส่ได้ 0 – 20,000 kcal'),
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  proteinG: macro,
  carbsG: macro,
  fatG: macro,
})

type FormValues = z.infer<typeof schema>

const MACRO_FIELDS = [
  { name: 'proteinG', label: 'โปรตีน' },
  { name: 'carbsG', label: 'คาร์บ' },
  { name: 'fatG', label: 'ไขมัน' },
] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  editing: FoodEntry | null
  history: FoodEntry[]
  onSubmit: (input: FoodInput) => void
}

export function FoodForm({ open, onOpenChange, date, editing, history, onSubmit }: Props) {
  const { register, handleSubmit, reset, getValues, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    reset(editing
      ? {
          name: editing.name,
          kcal: editing.kcal,
          meal: editing.meal,
          proteinG: editing.proteinG,
          carbsG: editing.carbsG,
          fatG: editing.fatG,
        }
      : { name: '', kcal: NaN, meal: mealForHour(new Date().getHours()), proteinG: undefined, carbsG: undefined, fatG: undefined })
  }, [open, editing, reset])

  const names = recentFoodNames(history)

  // Picking a food logged before fills in its calories, unless already typed.
  const fillKnownKcal = () => {
    if (!Number.isNaN(getValues('kcal'))) return
    const known = lastKcalFor(history, getValues('name'))
    if (known !== undefined) setValue('kcal', known, { shouldValidate: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'แก้ไขอาหาร' : 'บันทึกอาหาร'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((v) =>
            onSubmit({
              date: editing?.date ?? date,
              meal: v.meal,
              name: v.name.trim().replace(/\s+/g, ' '),
              kcal: v.kcal,
              // Always pass all three so an edit can clear a macro.
              proteinG: v.proteinG,
              carbsG: v.carbsG,
              fatG: v.fatG,
            }),
          )}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="food-name" className="text-sm mb-1.5 block">อาหาร</Label>
            <Input
              id="food-name"
              {...register('name', { onBlur: fillKnownKcal })}
              list="food-names"
              placeholder="เช่น ข้าวมันไก่ กาแฟเย็น"
              autoComplete="off"
            />
            <datalist id="food-names">
              {names.map((name) => <option key={name} value={name} />)}
            </datalist>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="food-kcal" className="text-sm mb-1.5 block">แคลอรี่ (kcal)</Label>
              <Input
                id="food-kcal"
                {...register('kcal', { valueAsNumber: true })}
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder="เช่น 550"
              />
              {errors.kcal && <p className="text-xs text-red-500 mt-1">{errors.kcal.message}</p>}
            </div>
            <div>
              <Label htmlFor="food-meal" className="text-sm mb-1.5 block">มื้อ</Label>
              <select
                id="food-meal"
                {...register('meal')}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-slate-900"
              >
                {MEALS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm mb-1.5">
              สารอาหาร (กรัม) <span className="text-slate-400 dark:text-slate-500">ไม่ใส่ก็ได้</span>
            </legend>
            <div className="grid grid-cols-3 gap-3">
              {MACRO_FIELDS.map((f) => (
                <div key={f.name}>
                  <Label htmlFor={`food-${f.name}`} className="text-xs mb-1 block text-slate-500 dark:text-slate-400">{f.label}</Label>
                  <Input
                    id={`food-${f.name}`}
                    {...register(f.name, { setValueAs: blankToUndefined })}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    placeholder="-"
                  />
                  {errors[f.name] && <p className="text-xs text-red-500 mt-1">{errors[f.name]?.message}</p>}
                </div>
              ))}
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit">{editing ? 'บันทึกการแก้ไข' : 'บันทึก'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
