'use client'

import { useRef, useState } from 'react'
import { Download, Upload, AlertTriangle, Database } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  backupStoreCount,
  countItems,
  downloadBackup,
  importBackup,
  parseBackup,
  type BackupFile,
} from '@/lib/backupFile'

export function DataManager() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [pendingData, setPendingData]   = useState<BackupFile | null>(null)
  const [isImporting, setIsImporting]   = useState(false)

  /* ── Export ── */
  const handleExport = () => {
    downloadBackup()
    toast.success('ส่งออกข้อมูลสำเร็จ — ครอบคลุมทุก store')
  }

  /* ── Import ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const normalized = parseBackup(ev.target?.result as string)
        if (!normalized) {
          toast.error('ไฟล์ไม่ถูกต้อง — ไม่ใช่ไฟล์ backup ของ FinanceMe')
          return
        }
        setPendingData(normalized)
        setConfirmOpen(true)
      } catch {
        toast.error('ไม่สามารถอ่านไฟล์ได้ — กรุณาตรวจสอบว่าเป็นไฟล์ JSON')
      }
    }
    reader.readAsText(file)
  }

  // The imported data syncs through the sync engine like any other edit.
  const handleConfirmImport = async () => {
    if (!pendingData) return
    setIsImporting(true)
    try {
      await importBackup(pendingData)

      const stats = countItems(pendingData.stores)
      toast.success(
        `นำเข้าข้อมูลสำเร็จ — ${stats.transactions} ธุรกรรม · ${stats.goals} เป้าหมาย · ${stats.investments} หลักทรัพย์ · ${stats.debts} หนี้สิน`,
        { duration: 5000 }
      )
      setConfirmOpen(false)
      setPendingData(null)
    } catch (e) {
      console.error(e)
      toast.error('นำเข้าข้อมูลไม่สำเร็จ')
    } finally {
      setIsImporting(false)
    }
  }

  /* ── Backup stats for confirm dialog ── */
  const stats = pendingData ? countItems(pendingData.stores) : null
  const storeCount = pendingData ? backupStoreCount(pendingData) : 0

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 transition-colors select-none"
          title="ส่งออกข้อมูลทั้งหมด"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>ส่งออก</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 transition-colors select-none"
          title="นำเข้าข้อมูล"
        >
          <Upload className="w-3.5 h-3.5 shrink-0" />
          <span>นำเข้า</span>
        </button>
      </div>

      {/* Confirm import dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              ยืนยันการนำเข้าข้อมูล
            </DialogTitle>
          </DialogHeader>

          {pendingData && stats && (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <p>
                ข้อมูลปัจจุบัน<span className="font-semibold text-red-600 dark:text-red-400">จะถูกแทนที่ทั้งหมด</span>
              </p>

              <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl p-3 space-y-1.5 text-xs border border-gray-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2 pb-1.5 mb-0.5 border-b border-gray-100 dark:border-white/[0.06]">
                  <Database className="w-3.5 h-3.5 text-violet-500" />
                  <span className="font-medium text-gray-700 dark:text-white/70">
                    {storeCount} store · ส่งออกเมื่อ {new Date(pendingData.exportedAt).toLocaleString('th-TH')}
                  </span>
                </div>

                {[
                  { label: 'ธุรกรรม',        value: stats.transactions },
                  { label: 'เป้าหมายการออม', value: stats.goals },
                  { label: 'หลักทรัพย์',     value: stats.investments },
                  { label: 'หนี้สิน',         value: stats.debts },
                  { label: 'รายการประจำ',    value: stats.recurrings },
                  { label: 'ของใช้',         value: stats.supplies },
                  { label: 'อาหาร น้ำ ออกกำลัง', value: stats.nutrition },
                  { label: 'ท่าในแผนออกกำลังกาย', value: stats.workoutPlan },
                  { label: 'บิลแบ่งจ่าย',    value: stats.billSplits    },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500 dark:text-white/40">{label}</span>
                    <span className="font-semibold text-gray-700 dark:text-white/70">{value} รายการ</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 dark:text-white/30">การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setPendingData(null) }}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isImporting ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันนำเข้า'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
