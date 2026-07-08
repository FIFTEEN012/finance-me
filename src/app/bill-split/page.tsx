'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { BillQuestBoard, BillQuestCoachTip } from '@/components/bill-split/BillQuestBoard'
import { BillSplitForm } from '@/components/bill-split/BillSplitForm'
import {
  BillQuestFilter,
  getBillSplitPendingAge,
  isBillSplitSettled,
} from '@/components/bill-split/billSplitQuest'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useBillSplitStore } from '@/store/useBillSplitStore'

function getCoachTip(totalBills: number, settledBills: number, pendingBillsAges: number[]): BillQuestCoachTip {
  if (totalBills === 0) {
    return {
      tone: 'start',
      message: 'เริ่มสร้างบิลแรกของคุณได้เลย แล้วค่อยแบ่งให้เพื่อนทีละคน ภารกิจนี้จะเริ่มสนุกทันทีที่มีรายการแรก',
    }
  }

  if (pendingBillsAges.length === 0) {
    return {
      tone: 'success',
      message: `เยี่ยมมาก ตอนนี้คุณเคลียร์ครบทั้ง ${settledBills} บิลแล้ว พร้อมลุยภารกิจบิลต่อไปเมื่อไหร่ก็ได้`,
    }
  }

  const oldestPendingAge = Math.max(...pendingBillsAges)
  if (oldestPendingAge > 3) {
    return {
      tone: 'warning',
      message: `มีบิลที่ค้างมานาน ${oldestPendingAge} วันแล้ว ลองทวงเพื่อนแบบนุ่ม ๆ วันนี้เพื่อปิดภารกิจให้ไวขึ้น`,
    }
  }

  return {
    tone: 'progress',
    message: 'คุณกำลังเคลียร์บิลได้ดีเลย ถ้าปิดอีกสักรายการ ภารกิจนี้ก็จะใกล้สำเร็จขึ้นอีกมาก',
  }
}

export default function BillSplitPage() {
  const { splits, deleteSplit, markPaid } = useBillSplitStore()
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<BillQuestFilter>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const pendingSplits = splits.filter((split) => !isBillSplitSettled(split))
  const settledSplits = splits.filter(isBillSplitSettled)
  const totalBills = splits.length
  const settledBills = settledSplits.length
  const pendingBills = pendingSplits.length
  const progressPercent = totalBills === 0 ? 0 : Math.round((settledBills / totalBills) * 100)
  const pendingBillsAges = pendingSplits.map(getBillSplitPendingAge)
  const coachTip = getCoachTip(totalBills, settledBills, pendingBillsAges)

  const filteredPendingSplits = filter === 'settled' ? [] : pendingSplits
  const filteredSettledSplits = filter === 'pending' ? [] : settledSplits

  function handleDelete() {
    if (!deletingId) return
    deleteSplit(deletingId)
    toast.success('ลบบิลแล้ว')
    setDeletingId(null)
  }

  return (
    <>
      <BillQuestBoard
        totalBills={totalBills}
        settledBills={settledBills}
        pendingBills={pendingBills}
        progressPercent={progressPercent}
        filter={filter}
        onFilterChange={setFilter}
        coachTip={coachTip}
        pendingSplits={filteredPendingSplits}
        settledSplits={filteredSettledSplits}
        onOpenForm={() => setFormOpen(true)}
        onDeleteRequest={setDeletingId}
        onTogglePaid={markPaid}
      />

      <BillSplitForm open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="ลบบิลนี้?"
        description="บิลนี้รวมถึงรายชื่อผู้ร่วมและสถานะการเคลียร์ทั้งหมดจะถูกลบถาวร และไม่สามารถกู้คืนได้"
        onConfirm={handleDelete}
      />
    </>
  )
}
