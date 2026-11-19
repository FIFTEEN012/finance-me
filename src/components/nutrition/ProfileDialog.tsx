'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ACTIVITY_LEVELS, GOALS } from '@/lib/fitness'
import { ProfileInput } from '@/store/useNutritionStore'
import { HealthProfile } from '@/types'
import { cn } from '@/lib/utils'

// Empty number inputs arrive as NaN.
const ranged = (min: number, max: number, label: string) =>
  z
    .number()
    .refine((n) => !Number.isNaN(n), `กรุณาระบุ${label}`)
    .refine((n) => Number.isNaN(n) || (n >= min && n <= max), `${label}ต้องอยู่ระหว่าง ${min} – ${max}`)

const schema = z.object({
  sex: z.enum(['male', 'female']),
  age: ranged(13, 100, 'อายุ'),
  heightCm: ranged(120, 230, 'ส่วนสูง'),
  weightKg: ranged(30, 250, 'น้ำหนัก'),
  activity: z.enum(['sedentary', 'light', 'active', 'very_active']),
  goal: z.enum(['lose', 'maintain', 'gain']),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: HealthProfile | null
  onSubmit: (input: ProfileInput) => void
}

const selectClass = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-slate-900'

export function ProfileDialog({ open, onOpenChange, profile, onSubmit }: Props) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    reset(profile
      ? { sex: profile.sex, age: profile.age, heightCm: profile.heightCm, weightKg: profile.weightKg, activity: profile.activity, goal: profile.goal }
      : { sex: 'male', age: NaN, heightCm: NaN, weightKg: NaN, activity: 'sedentary', goal: 'maintain' })
  }, [open, profile, reset])

  const sex = watch('sex')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ข้อมูลร่างกาย</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">
          ใช้คำนวณแคลอรี่ น้ำ และการออกกำลังที่เหมาะกับคุณ ข้อมูลเก็บในเครื่องนี้
        </p>

        <form onSubmit={handleSubmit((v) => onSubmit(v))} className="space-y-4">
          <div>
            <Label className="text-sm mb-1.5 block">เพศ</Label>
            <div className="grid grid-cols-2 gap-2">
              {([['male', 'ชาย'], ['female', 'หญิง']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('sex', value)}
                  aria-pressed={sex === value}
                  className={cn(
                    'h-9 rounded-md border text-sm font-medium',
                    sex === value
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'border-input text-slate-600 dark:text-slate-300',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="p-age" className="text-sm mb-1.5 block">อายุ (ปี)</Label>
              <Input id="p-age" type="number" inputMode="numeric" {...register('age', { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="p-height" className="text-sm mb-1.5 block">ส่วนสูง (ซม.)</Label>
              <Input id="p-height" type="number" inputMode="decimal" step="any" {...register('heightCm', { valueAsNumber: true })} />
            </div>
            <div>
              <Label htmlFor="p-weight" className="text-sm mb-1.5 block">น้ำหนัก (กก.)</Label>
              <Input id="p-weight" type="number" inputMode="decimal" step="any" {...register('weightKg', { valueAsNumber: true })} />
            </div>
          </div>
          {(errors.age || errors.heightCm || errors.weightKg) && (
            <p className="text-xs text-red-500 -mt-2">{errors.age?.message ?? errors.heightCm?.message ?? errors.weightKg?.message}</p>
          )}

          <div>
            <Label htmlFor="p-activity" className="text-sm mb-1.5 block">กิจวัตรประจำวัน (ไม่นับการออกกำลัง)</Label>
            <select id="p-activity" {...register('activity')} className={selectClass}>
              {ACTIVITY_LEVELS.map((a) => <option key={a.value} value={a.value}>{a.label} — {a.desc}</option>)}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">การออกกำลังที่บันทึกในแต่ละวันจะถูกบวกเพิ่มให้แยกต่างหาก</p>
          </div>

          <div>
            <Label htmlFor="p-goal" className="text-sm mb-1.5 block">เป้าหมาย</Label>
            <select id="p-goal" {...register('goal')} className={selectClass}>
              {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit">คำนวณ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
