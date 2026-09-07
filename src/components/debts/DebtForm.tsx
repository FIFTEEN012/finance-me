'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, User, ArrowDownLeft, ArrowUpRight, Calendar, DollarSign, Tag, FileText, Palette } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DebtItem, DebtType, DebtCategory } from '@/types/debt'
import { useDebtStore } from '@/store/useDebtStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DebtFormProps {
  open: boolean
  onClose: () => void
  editingDebt?: DebtItem | null
}

const CATEGORY_OPTIONS: { id: DebtCategory; label: string; icon: string }[] = [
  { id: 'person', label: 'เพื่อน / คนรู้จัก', icon: '👤' },
  { id: 'family', label: 'ครอบครัว / ญาติ', icon: '🏡' },
  { id: 'credit_card', label: 'บัตรเครดิต', icon: '💳' },
  { id: 'loan', label: 'สินเชื่อ / เงินกู้', icon: '🏦' },
  { id: 'other', label: 'อื่น ๆ', icon: '🏷️' },
]

const COLOR_PRESETS = [
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#6366f1', // indigo
]

export function DebtForm({ open, onClose, editingDebt }: DebtFormProps) {
  const { addDebt, updateDebt } = useDebtStore()

  const [type, setType] = useState<DebtType>('I_OWE')
  const [personName, setPersonName] = useState('')
  const [category, setCategory] = useState<DebtCategory>('person')
  const [totalAmount, setTotalAmount] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [createInitialTx, setCreateInitialTx] = useState(false)

  useEffect(() => {
    if (editingDebt) {
      setType(editingDebt.type)
      setPersonName(editingDebt.personName)
      setCategory(editingDebt.category)
      setTotalAmount(String(editingDebt.totalAmount))
      setStartDate(editingDebt.startDate)
      setDueDate(editingDebt.dueDate || '')
      setNote(editingDebt.note || '')
      setColor(editingDebt.color || '#3b82f6')
      setCreateInitialTx(false)
    } else {
      setType('I_OWE')
      setPersonName('')
      setCategory('person')
      setTotalAmount('')
      setStartDate(new Date().toISOString().slice(0, 10))
      setDueDate('')
      setNote('')
      setColor('#3b82f6')
      setCreateInitialTx(false)
    }
  }, [editingDebt, open])

  const numAmount = parseFloat(totalAmount) || 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!personName.trim()) {
      toast.error('กรุณาระบุชื่อบุคคลหรือเจ้าหนี้/ลูกหนี้')
      return
    }
    if (numAmount <= 0) {
      toast.error('กรุณาระบุจำนวนเงินที่ถูกต้อง')
      return
    }

    if (editingDebt) {
      updateDebt(editingDebt.id, {
        personName: personName.trim(),
        type,
        category,
        totalAmount: numAmount,
        startDate,
        dueDate: dueDate || undefined,
        note: note.trim() || undefined,
        color,
      })
      toast.success('อัปเดตข้อมูลหนี้สินเรียบร้อยแล้ว')
    } else {
      addDebt(
        {
          personName: personName.trim(),
          type,
          category,
          totalAmount: numAmount,
          startDate,
          dueDate: dueDate || undefined,
          note: note.trim() || undefined,
          color,
        },
        {
          create: createInitialTx,
        }
      )
      toast.success(
        type === 'I_OWE'
          ? `บันทึกรายการติดหนี้ ${personName} เรียบร้อยแล้ว`
          : `บันทึกรายการให้ ${personName} ยืมเงินเรียบร้อยแล้ว`
      )
    }

    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl rounded-3xl border-2 border-slate-200 bg-white p-6 md:p-8 font-quest-body dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="font-quest-heading text-xl md:text-2xl font-black text-slate-800 dark:text-white">
            {editingDebt ? 'แก้ไขรายการหนี้สิน' : 'บันทึกรายการยืม-คืนเงิน'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setType('I_OWE')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl py-3 text-xs md:text-sm font-black transition-all select-none border-b-2',
                type === 'I_OWE'
                  ? 'bg-rose-500 text-white border-rose-700 shadow-[0_2px_0_0_#be123c]'
                  : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-white/60 dark:hover:bg-slate-700'
              )}
            >
              <ArrowDownLeft className="h-4 w-4 stroke-[2.5px] shrink-0" />
              <span>ฉันติดหนี้เขา (ฉันยืมมา)</span>
            </button>
            <button
              type="button"
              onClick={() => setType('OWED_TO_ME')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl py-3 text-xs md:text-sm font-black transition-all select-none border-b-2',
                type === 'OWED_TO_ME'
                  ? 'bg-emerald-500 text-white border-emerald-700 shadow-[0_2px_0_0_#047857]'
                  : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-white/60 dark:hover:bg-slate-700'
              )}
            >
              <ArrowUpRight className="h-4 w-4 stroke-[2.5px] shrink-0" />
              <span>เขาติดหนี้ฉัน (ให้เขายืม)</span>
            </button>
          </div>

          {/* Person Name Input */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <User className="h-3.5 w-3.5" />
              {type === 'I_OWE' ? 'ชื่อเจ้าหนี้ / ผู้ให้ยืม *' : 'ชื่อลูกหนี้ / ผู้ขอยืม *'}
            </label>
            <input
              type="text"
              required
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="เช่น นาย A, เพื่อนร่วมงาน, ธนาคาร"
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:border-[var(--quest-primary-container)] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Total Amount Input */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <DollarSign className="h-3.5 w-3.5" />
              จำนวนเงินรวม (บาท) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-xl font-black text-slate-800 focus:border-[var(--quest-primary-container)] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                THB
              </span>
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Tag className="h-3.5 w-3.5" />
              ประเภทหนี้สิน
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition-all select-none min-h-[72px]',
                    category === cat.id
                      ? 'border-[var(--quest-primary-container)] bg-[var(--quest-primary-container)]/10 text-[var(--quest-primary)] dark:text-[var(--quest-primary-container)] font-black shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 font-bold'
                  )}
                >
                  <span className="text-2xl mb-1">{cat.icon}</span>
                  <span className="text-xs leading-tight text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                วันที่เริ่มยืม / สร้างหนี้ *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-[var(--quest-primary-container)] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                กำหนดคืน (ไม่บังคับ)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 focus:border-[var(--quest-primary-container)] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Palette className="h-3.5 w-3.5" />
              สีสัญลักษณ์
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {COLOR_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-transform select-none shrink-0 flex items-center justify-center text-white',
                    color === hex ? 'scale-110 border-slate-800 dark:border-white' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: hex }}
                >
                  {color === hex && <Check className="h-4 w-4 stroke-[3px]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              หมายเหตุเพิ่มเติม
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียด เงื่อนไข หรือข้อความช่วยจำ..."
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 focus:border-[var(--quest-primary-container)] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Initial Transaction Checkbox (Only on create) */}
          {!editingDebt && (
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 cursor-pointer dark:border-slate-800 dark:bg-slate-800/50">
              <input
                type="checkbox"
                checked={createInitialTx}
                onChange={(e) => setCreateInitialTx(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--quest-primary-container)] focus:ring-[var(--quest-primary-container)]"
              />
              <div className="text-xs">
                <p className="font-black text-slate-800 dark:text-slate-200">
                  {type === 'I_OWE'
                    ? 'ลงรายการรับเงิน (Income) เริ่มต้นในระบบธุรกรรม'
                    : 'ลงรายการจ่ายเงิน (Expense) เริ่มต้นในระบบธุรกรรม'}
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {type === 'I_OWE'
                    ? 'เหมาะสำหรับยอดเงินที่เพิ่งได้รับเข้ามาในกระเป๋า'
                    : 'เหมาะสำหรับยอดเงินที่คุณเพิ่งโอน/จ่ายออกไปให้เขายืม'}
                </p>
              </div>
            </label>
          )}

          <DialogFooter className="gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="quest-secondary-button flex-1 px-4 text-xs"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="quest-action-button flex-1 flex items-center justify-center gap-2 px-6 text-xs whitespace-nowrap"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              {editingDebt ? 'บันทึกการแก้ไข' : 'สร้างรายการหนี้สิน'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
