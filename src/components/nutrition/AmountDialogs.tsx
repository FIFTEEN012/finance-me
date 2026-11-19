'use client'

import { useEffect, useState } from 'react'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WaterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (ml: number) => void
}

/** Logs a custom amount of water. */
export function WaterAmountDialog({ open, onOpenChange, onConfirm }: WaterProps) {
  const [value, setValue] = useState('')
  useEffect(() => { if (open) setValue('') }, [open])

  const ml = Number(value)
  const error = value === ''
    ? null
    : !Number.isInteger(ml) || ml <= 0
      ? 'ใส่จำนวนเต็มมากกว่า 0'
      : ml > 5000
        ? 'ครั้งละไม่เกิน 5,000 มล.'
        : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>บันทึกการดื่มน้ำ</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (value !== '' && !error) onConfirm(ml)
          }}
        >
          <div>
            <Label htmlFor="water-ml" className="text-sm mb-1.5 block">ปริมาณ (มล.)</Label>
            <Input
              id="water-ml"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="เช่น 350"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={value === '' || !!error}>บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface GoalsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calorieGoal: number
  waterGoal: number
  onConfirm: (calorieGoal: number, waterGoal: number) => void
}

export function GoalsDialog({ open, onOpenChange, calorieGoal, waterGoal, onConfirm }: GoalsProps) {
  const [kcal, setKcal] = useState('')
  const [water, setWater] = useState('')
  useEffect(() => {
    if (open) { setKcal(String(calorieGoal)); setWater(String(waterGoal)) }
  }, [open, calorieGoal, waterGoal])

  const k = Number(kcal)
  const w = Number(water)
  const kcalError = !Number.isInteger(k) || k < 500 || k > 10000 ? 'ใส่ได้ 500 – 10,000 kcal' : null
  const waterError = !Number.isInteger(w) || w < 250 || w > 10000 ? 'ใส่ได้ 250 – 10,000 มล.' : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>เป้าหมายต่อวัน</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!kcalError && !waterError) onConfirm(k, w)
          }}
        >
          <div>
            <Label htmlFor="goal-kcal" className="text-sm mb-1.5 block">แคลอรี่ (kcal)</Label>
            <Input id="goal-kcal" type="number" inputMode="numeric" step="50" value={kcal} onChange={(e) => setKcal(e.target.value)} />
            {kcalError && <p className="text-xs text-red-500 mt-1">{kcalError}</p>}
          </div>
          <div>
            <Label htmlFor="goal-water" className="text-sm mb-1.5 block">น้ำ (มล.)</Label>
            <Input id="goal-water" type="number" inputMode="numeric" step="250" value={water} onChange={(e) => setWater(e.target.value)} />
            {waterError && <p className="text-xs text-red-500 mt-1">{waterError}</p>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ค่าเริ่มต้นคือ 2,000 kcal และน้ำ 2 ลิตร ความต้องการจริงต่างกันไปในแต่ละคน
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={!!kcalError || !!waterError}>บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
