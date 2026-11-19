'use client'

import { useEffect, useState } from 'react'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EXERCISES, estimateBurn, exerciseLabel } from '@/lib/fitness'
import { ExerciseInput } from '@/store/useNutritionStore'
import { ExerciseEntry } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  editing: ExerciseEntry | null
  /** Body weight used to estimate burn; null when no profile yet. */
  weightKg: number | null
  fallbackWeightKg: number
  onSubmit: (input: ExerciseInput) => void
}

const selectClass = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-slate-900'

export function ExerciseForm({ open, onOpenChange, date, editing, weightKg, fallbackWeightKg, onSubmit }: Props) {
  const [activity, setActivity] = useState('brisk_walk')
  const [customName, setCustomName] = useState('')
  const [minutes, setMinutes] = useState('')
  const [kcal, setKcal] = useState('')
  // Once the user types calories, stop overwriting them with the estimate.
  const [kcalTouched, setKcalTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setActivity(editing.activity)
      setCustomName(editing.activity === 'other' ? editing.name : '')
      setMinutes(String(editing.minutes))
      setKcal(String(editing.kcal))
      setKcalTouched(true)
    } else {
      setActivity('brisk_walk')
      setCustomName('')
      setMinutes('30')
      setKcal('')
      setKcalTouched(false)
    }
  }, [open, editing])

  const weight = weightKg ?? fallbackWeightKg
  const mins = Number(minutes)
  const estimate = estimateBurn(activity, mins, weight)
  const shownKcal = kcalTouched ? kcal : estimate > 0 ? String(estimate) : ''
  const k = Number(shownKcal)

  const minutesError = minutes === '' || !Number.isInteger(mins) || mins <= 0 || mins > 600 ? 'ใส่ 1 – 600 นาที' : null
  const kcalError = shownKcal === '' || !Number.isInteger(k) || k < 0 || k > 5000 ? 'ใส่ 0 – 5,000 kcal' : null
  const nameError = activity === 'other' && !customName.trim() ? 'กรุณาระบุชื่อกิจกรรม' : null
  const invalid = !!(minutesError || kcalError || nameError)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'แก้ไขการออกกำลัง' : 'บันทึกการออกกำลัง'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (invalid) return
            onSubmit({
              date: editing?.date ?? date,
              activity,
              name: activity === 'other' ? customName.trim() : exerciseLabel(activity),
              minutes: mins,
              kcal: k,
            })
          }}
        >
          <div>
            <Label htmlFor="ex-activity" className="text-sm mb-1.5 block">กิจกรรม</Label>
            <select
              id="ex-activity"
              value={activity}
              onChange={(e) => { setActivity(e.target.value); if (!editing) setKcalTouched(false) }}
              className={selectClass}
            >
              {EXERCISES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>

          {activity === 'other' && (
            <div>
              <Label htmlFor="ex-name" className="text-sm mb-1.5 block">ชื่อกิจกรรม</Label>
              <Input id="ex-name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="เช่น ปีนเขา มวยไทย" />
              {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ex-minutes" className="text-sm mb-1.5 block">เวลา (นาที)</Label>
              <Input id="ex-minutes" type="number" inputMode="numeric" min="1" step="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              {minutesError && minutes !== '' && <p className="text-xs text-red-500 mt-1">{minutesError}</p>}
            </div>
            <div>
              <Label htmlFor="ex-kcal" className="text-sm mb-1.5 block">เผาผลาญ (kcal)</Label>
              <Input
                id="ex-kcal"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={shownKcal}
                onChange={(e) => { setKcal(e.target.value); setKcalTouched(true) }}
                placeholder={activity === 'other' ? 'ใส่เอง' : ''}
              />
              {kcalError && shownKcal !== '' && <p className="text-xs text-red-500 mt-1">{kcalError}</p>}
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activity === 'other'
              ? 'กิจกรรมอื่นต้องใส่แคลอรี่เอง เช่น ตัวเลขจากนาฬิกาออกกำลังกาย'
              : `ประมาณจากน้ำหนัก ${weight} กก.${weightKg === null ? ' (ค่าตั้งต้น กรอกข้อมูลร่างกายเพื่อให้แม่นขึ้น)' : ''} แก้ตัวเลขเองได้`}
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={invalid}>{editing ? 'บันทึกการแก้ไข' : 'บันทึก'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
