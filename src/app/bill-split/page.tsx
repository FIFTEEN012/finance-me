'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { SplitSquareHorizontal, HandCoins } from 'lucide-react'
import { BillQuestBoard, BillQuestCoachTip } from '@/components/bill-split/BillQuestBoard'
import { BillSplitForm } from '@/components/bill-split/BillSplitForm'
import {
  BillQuestFilter,
  getBillSplitPendingAge,
  isBillSplitSettled,
} from '@/components/bill-split/billSplitQuest'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useBillSplitStore } from '@/store/useBillSplitStore'
import { useDebtStore } from '@/store/useDebtStore'
import { DebtQuestBoard } from '@/components/debts/DebtQuestBoard'
import { DebtForm } from '@/components/debts/DebtForm'
import { DebtRepaymentDialog } from '@/components/debts/DebtRepaymentDialog'
import { DebtItem } from '@/types/debt'
import { cn } from '@/lib/utils'

type ActiveTab = 'splits' | 'debts'

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
  const [activeTab, setActiveTab] = useState<ActiveTab>('debts')

  // Bill Split State & Store
  const { splits, deleteSplit, markPaid } = useBillSplitStore()
  const [billFormOpen, setBillFormOpen] = useState(false)
  const [billFilter, setBillFilter] = useState<BillQuestFilter>('all')
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null)

  const pendingSplits = splits.filter((split) => !isBillSplitSettled(split))
  const settledSplits = splits.filter(isBillSplitSettled)
  const totalBills = splits.length
  const settledBills = settledSplits.length
  const pendingBills = pendingSplits.length
  const progressPercent = totalBills === 0 ? 0 : Math.round((settledBills / totalBills) * 100)
  const pendingBillsAges = pendingSplits.map(getBillSplitPendingAge)
  const coachTip = getCoachTip(totalBills, settledBills, pendingBillsAges)

  const filteredPendingSplits = billFilter === 'settled' ? [] : pendingSplits
  const filteredSettledSplits = billFilter === 'pending' ? [] : settledSplits

  // Debt State & Store
  const { debts, deleteDebt, deletePayment } = useDebtStore()
  const [debtFormOpen, setDebtFormOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null)
  const [repayingDebt, setRepayingDebt] = useState<DebtItem | null>(null)
  const [deletingDebtItem, setDeletingDebtItem] = useState<DebtItem | null>(null)

  function handleDeleteBill() {
    if (!deletingBillId) return
    deleteSplit(deletingBillId)
    toast.success('ลบบิลแล้ว')
    setDeletingBillId(null)
  }

  function handleDeleteDebt() {
    if (!deletingDebtItem) return
    deleteDebt(deletingDebtItem.id)
    toast.success('ลบรายการหนี้สินเรียบร้อยแล้ว')
    setDeletingDebtItem(null)
  }

  const handleOpenAddDebt = () => {
    setEditingDebt(null)
    setDebtFormOpen(true)
  }

  const handleOpenEditDebt = (debt: DebtItem) => {
    setEditingDebt(debt)
    setDebtFormOpen(true)
  }

  const handleOpenRepayDebt = (debt: DebtItem) => {
    setRepayingDebt(debt)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-28 font-quest-body md:px-8 md:py-8 lg:pb-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Top Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-slate-200 bg-white p-1.5 shadow-[0_4px_0_0_#e5e5e5] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_4px_0_0_#020617]">
          <button
            type="button"
            onClick={() => setActiveTab('debts')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl py-3 text-xs md:text-sm font-black transition-all select-none border-b-2',
              activeTab === 'debts'
                ? 'bg-[var(--quest-primary-container)] text-white border-[var(--quest-primary)] shadow-[0_2px_0_0_var(--quest-primary)]'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 border-transparent'
            )}
          >
            <HandCoins className="h-4 w-4 stroke-[2.5px]" />
            <span>หนี้สิน & ยืม-คืน</span>
            {debts.filter((d) => !d.isSettled).length > 0 && (
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black leading-none">
                {debts.filter((d) => !d.isSettled).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('splits')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl py-3 text-xs md:text-sm font-black transition-all select-none border-b-2',
              activeTab === 'splits'
                ? 'bg-[var(--quest-primary-container)] text-white border-[var(--quest-primary)] shadow-[0_2px_0_0_var(--quest-primary)]'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 border-transparent'
            )}
          >
            <SplitSquareHorizontal className="h-4 w-4 stroke-[2.5px]" />
            <span>แบ่งบิลกลุ่ม</span>
            {pendingBills > 0 && (
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black leading-none">
                {pendingBills}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Debt & Loan Tracker */}
        {activeTab === 'debts' && (
          <DebtQuestBoard
            debts={debts}
            onAddDebt={handleOpenAddDebt}
            onEditDebt={handleOpenEditDebt}
            onRepayDebt={handleOpenRepayDebt}
            onDeleteDebt={setDeletingDebtItem}
            onDeletePayment={deletePayment}
          />
        )}

        {/* Tab 2: Group Bill Split */}
        {activeTab === 'splits' && (
          <div className="space-y-6">
            <BillQuestBoard
              totalBills={totalBills}
              settledBills={settledBills}
              pendingBills={pendingBills}
              progressPercent={progressPercent}
              filter={billFilter}
              onFilterChange={setBillFilter}
              coachTip={coachTip}
              pendingSplits={filteredPendingSplits}
              settledSplits={filteredSettledSplits}
              onOpenForm={() => setBillFormOpen(true)}
              onDeleteRequest={setDeletingBillId}
              onTogglePaid={markPaid}
            />
          </div>
        )}
      </div>

      {/* Bill Dialogs */}
      <BillSplitForm open={billFormOpen} onClose={() => setBillFormOpen(false)} />
      <ConfirmDialog
        open={!!deletingBillId}
        onOpenChange={(open) => !open && setDeletingBillId(null)}
        title="ลบบิลนี้?"
        description="บิลนี้รวมถึงรายชื่อผู้ร่วมและสถานะการเคลียร์ทั้งหมดจะถูกลบถาวร และไม่สามารถกู้คืนได้"
        onConfirm={handleDeleteBill}
      />

      {/* Debt Dialogs */}
      <DebtForm
        open={debtFormOpen}
        onClose={() => {
          setDebtFormOpen(false)
          setEditingDebt(null)
        }}
        editingDebt={editingDebt}
      />

      <DebtRepaymentDialog
        open={!!repayingDebt}
        onClose={() => setRepayingDebt(null)}
        debt={repayingDebt}
      />

      <ConfirmDialog
        open={!!deletingDebtItem}
        onOpenChange={(open) => !open && setDeletingDebtItem(null)}
        title="ลบรายการหนี้สินนี้?"
        description={`รายการหนี้สิน "${deletingDebtItem?.personName}" และประวัติการชำระทั้งหมดจะถูกลบถาวร`}
        onConfirm={handleDeleteDebt}
      />
    </div>
  )
}
