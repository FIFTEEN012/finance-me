'use client'

import { useEffect, useState } from 'react'

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { todayKey } from '@/lib/recurring'
import { daysBetween, formatDuration } from '@/lib/supplies'
import { SupplyItem } from '@/types'

interface Props {
  item: SupplyItem | null
  onOpenChange: (open: boolean) => void
  onConfirm: (finishedDate: string) => void
}

export function FinishSupplyDialog({ item, onOpenChange, onConfirm }: Props) {
  const [date, setDate] = useState(todayKey())

  useEffect(() => {
    if (item) setDate(todayKey())
  }, [item])

  const today = todayKey()
  const error = !item || !date
    ? 'กรุณาเลือกวันที่'
    : date < item.startDate
      ? 'วันที่ใช้หมดต้องไม่ก่อนวันที่เริ่มใช้'
      : date > today
        ? 'วันที่ใช้หมดต้องไม่อยู่ในอนาคต'
        : null

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{item?.name} หมดแล้ว</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!error) onConfirm(date)
          }}
        >
          <div>
            <Label htmlFor="supply-finish-date" className="text-sm mb-1.5 block">ใช้หมดวันที่</Label>
            <Input
              id="supply-finish-date"
              type="date"
              value={date}
              min={item?.startDate}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
            {error
              ? <p className="text-xs text-red-500 mt-1">{error}</p>
              : item && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  ใช้ได้ {formatDuration(daysBetween(item.startDate, date))}
                </p>
              )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={!!error}>บันทึกว่าหมดแล้ว</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
