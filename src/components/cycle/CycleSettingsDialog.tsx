'use client'

import { useState } from 'react'
import { Settings2, Calendar, Clock, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCycleStore } from '@/store/useCycleStore'

interface CycleSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CycleSettingsDialog({ open, onOpenChange }: CycleSettingsDialogProps) {
  const cycleLength = useCycleStore((state) => state.cycleLength)
  const periodLength = useCycleStore((state) => state.periodLength)
  const lastPeriodDate = useCycleStore((state) => state.lastPeriodDate)
  const updateSettings = useCycleStore((state) => state.updateSettings)

  const [formCycleLength, setFormCycleLength] = useState(cycleLength)
  const [formPeriodLength, setFormPeriodLength] = useState(periodLength)
  const [formLastDate, setFormLastDate] = useState(lastPeriodDate)

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setFormCycleLength(cycleLength)
      setFormPeriodLength(periodLength)
      setFormLastDate(lastPeriodDate)
    }
    onOpenChange(isOpen)
  }

  const handleSave = () => {
    const cLen = Math.max(20, Math.min(45, Number(formCycleLength) || 28))
    const pLen = Math.max(2, Math.min(12, Number(formPeriodLength) || 5))

    updateSettings({
      cycleLength: cLen,
      periodLength: pLen,
      lastPeriodDate: formLastDate,
    })

    toast.success('บันทึกการตั้งค่ารอบเดือนเรียบร้อย')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full sm:max-w-lg rounded-3xl border-2 border-rose-200 dark:border-rose-900">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600">
              <Settings2 className="h-5 w-5" />
            </div>
            <DialogTitle className="font-quest-heading text-lg font-black text-slate-900 dark:text-white">
              ตั้งค่ารอบเดือน
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Last Period Start Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-rose-500" />
              วันแรกของประจำเดือนรอบล่าสุด
            </Label>
            <Input
              type="date"
              value={formLastDate}
              onChange={(e) => setFormLastDate(e.target.value)}
              className="rounded-2xl border-2 font-bold"
            />
          </div>

          {/* Cycle Length (21-45 days) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-purple-500" />
                ความยาวรอบเดือนเฉลี่ย
              </Label>
              <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                {formCycleLength} วัน
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="21"
                max="45"
                value={formCycleLength}
                onChange={(e) => setFormCycleLength(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              <Input
                type="number"
                min="21"
                max="45"
                value={formCycleLength}
                onChange={(e) => setFormCycleLength(Number(e.target.value))}
                className="w-20 text-center rounded-2xl border-2 font-black num"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              โดยทั่วไปรอบเดือนจะอยู่ที่ 28 วัน (ช่วงปกติ 21–35 วัน)
            </p>
          </div>

          {/* Period Length (3-10 days) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-rose-500" />
                จำนวนวันที่มีประจำเดือน
              </Label>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                {formPeriodLength} วัน
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3"
                max="10"
                value={formPeriodLength}
                onChange={(e) => setFormPeriodLength(Number(e.target.value))}
                className="w-full accent-rose-500"
              />
              <Input
                type="number"
                min="3"
                max="10"
                value={formPeriodLength}
                onChange={(e) => setFormPeriodLength(Number(e.target.value))}
                className="w-20 text-center rounded-2xl border-2 font-black num"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              จำนวนวันที่มีเลือดประจำเดือน (ค่าเฉลี่ยประมาณ 4–7 วัน)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl border-2 font-bold"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-2xl bg-rose-500 text-white hover:bg-rose-600 font-black shadow-[0_4px_0_0_#be123c] active:translate-y-[2px]"
          >
            บันทึกการตั้งค่า
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
