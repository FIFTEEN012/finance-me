'use client'

import { useState } from 'react'
import { Equal, Percent, Plus, SlidersHorizontal, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useBillSplitStore } from '@/store/useBillSplitStore'
import { BillParticipant, BillSplitMode } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

const MODE_OPTIONS: { value: BillSplitMode; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'equal', label: 'เท่ากัน', icon: Equal, desc: 'หารเท่ากันทุกคน' },
  { value: 'custom', label: 'กำหนดเอง', icon: SlidersHorizontal, desc: 'ใส่ยอดแต่ละคนเอง' },
  { value: 'percentage', label: 'เปอร์เซ็นต์', icon: Percent, desc: 'แบ่งตาม %' },
]

function newParticipant(name = ''): BillParticipant {
  return { id: crypto.randomUUID(), name, share: 0, paid: false }
}

export function BillSplitForm({ open, onClose }: Props) {
  const addSplit = useBillSplitStore((state) => state.addSplit)

  const [title, setTitle] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [currency, setCurrency] = useState('THB')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [paidBy, setPaidBy] = useState('ฉัน')
  const [mode, setMode] = useState<BillSplitMode>('equal')
  const [note, setNote] = useState('')
  const [participants, setParticipants] = useState<BillParticipant[]>([
    newParticipant('ฉัน'),
    newParticipant(''),
  ])

  const total = parseFloat(totalAmount) || 0

  function addPerson() {
    setParticipants((current) => [...current, newParticipant('')])
  }

  function removePerson(id: string) {
    setParticipants((current) => current.filter((participant) => participant.id !== id))
  }

  function updateName(id: string, name: string) {
    setParticipants((current) =>
      current.map((participant) => (participant.id === id ? { ...participant, name } : participant))
    )
  }

  function updateShare(id: string, value: string) {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === id ? { ...participant, share: parseFloat(value) || 0 } : participant
      )
    )
  }

  function getComputedParticipants() {
    if (mode === 'equal') {
      const each = participants.length > 0 ? total / participants.length : 0
      return participants.map((participant) => ({
        ...participant,
        share: Math.round(each * 100) / 100,
      }))
    }

    if (mode === 'percentage') {
      return participants.map((participant) => ({
        ...participant,
        share: Math.round(total * (participant.share / 100) * 100) / 100,
      }))
    }

    return participants
  }

  const computedParticipants = getComputedParticipants()
  const shareTotal = mode === 'percentage'
    ? participants.reduce((sum, participant) => sum + participant.share, 0)
    : computedParticipants.reduce((sum, participant) => sum + participant.share, 0)

  const isPercentageValid = mode === 'percentage' ? Math.abs(shareTotal - 100) < 0.01 : true
  const isCustomValid = mode === 'custom' ? Math.abs(shareTotal - total) < 0.01 : true

  function resetForm() {
    setTitle('')
    setTotalAmount('')
    setCurrency('THB')
    setDate(new Date().toISOString().slice(0, 10))
    setPaidBy('ฉัน')
    setMode('equal')
    setNote('')
    setParticipants([newParticipant('ฉัน'), newParticipant('')])
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function handleSubmit() {
    if (!title.trim()) return toast.error('ใส่ชื่อบิลด้วย')
    if (total <= 0) return toast.error('ใส่ยอดรวมด้วย')
    if (participants.length < 2) return toast.error('ต้องมีอย่างน้อย 2 คน')
    if (participants.some((participant) => !participant.name.trim())) return toast.error('ใส่ชื่อทุกคนด้วย')
    if (!isPercentageValid) return toast.error('เปอร์เซ็นต์รวมต้องเท่ากับ 100%')
    if (!isCustomValid) {
      return toast.error(`ยอดรวมต้องเท่ากับ ${total.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ${currency}`)
    }

    addSplit({
      title: title.trim(),
      totalAmount: total,
      currency,
      date,
      paidBy,
      splitMode: mode,
      participants: computedParticipants,
      note: note.trim() || undefined,
    })

    toast.success('บันทึกการแบ่งบิลเรียบร้อย')
    handleClose()
  }

  const totalPerHead = participants.length > 0 ? total / participants.length : 0

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-[1.5rem] border-2 border-[#becbb1] bg-[var(--quest-background)] p-0 text-[var(--quest-foreground)] shadow-[0_8px_0_0_#becbb1] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-foreground)] dark:shadow-[0_8px_0_0_#0f130c]">
        <DialogHeader className="border-b-2 border-[#becbb1] px-6 py-5 dark:border-[#3b4630]">
          <DialogTitle className="font-quest-heading text-2xl font-black text-[#2b6c00] dark:text-[#87fe45]">
            สร้างบิลใหม่
          </DialogTitle>
          <p className="font-quest-body text-sm font-bold text-[var(--quest-muted)]">
            เพิ่มบิลสำหรับภารกิจเคลียร์ยอด แชร์กับเพื่อนได้ง่าย และติดตามสถานะการเคลียร์ได้ทันที
          </p>
        </DialogHeader>

        <div className="space-y-5 p-6 font-quest-body">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.6fr_0.75fr_0.75fr]">
            <div>
              <Label className="quest-field-label">ชื่อบิล</Label>
              <Input
                placeholder="เช่น ค่าชาบูมื้อดึก"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="quest-input"
              />
            </div>
            <div>
              <Label className="quest-field-label">วันที่</Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="quest-input"
              />
            </div>
            <div>
              <Label className="quest-field-label">สกุลเงิน</Label>
              <Input
                placeholder="THB"
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                maxLength={4}
                className="quest-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="quest-field-label">ยอดรวม</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={totalAmount}
                onChange={(event) => setTotalAmount(event.target.value)}
                className="quest-input"
              />
            </div>
            <div>
              <Label className="quest-field-label">ใครจ่ายก่อน?</Label>
              <Input
                placeholder="ฉัน"
                value={paidBy}
                onChange={(event) => setPaidBy(event.target.value)}
                className="quest-input"
              />
            </div>
          </div>

          <div>
            <Label className="quest-field-label">วิธีแบ่ง</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {MODE_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    'rounded-[1.25rem] border-2 px-4 py-3 text-left transition-all',
                    mode === value
                      ? 'border-[#2b6c00] bg-[#58cc02] text-[#1e5000] shadow-[0_4px_0_0_#1e5000]'
                      : 'border-[#becbb1] bg-[var(--quest-surface)] text-[var(--quest-muted)] shadow-[0_4px_0_0_#becbb1] dark:border-[#3b4630] dark:bg-[var(--quest-surface)] dark:text-[var(--quest-muted)] dark:shadow-[0_4px_0_0_#0f130c]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-xl border-2',
                        mode === value
                          ? 'border-[#1e5000] bg-white/25 text-[#1e5000]'
                          : 'border-[#becbb1] bg-[var(--quest-surface-soft)] text-[var(--quest-muted)] dark:border-[#3b4630] dark:bg-[var(--quest-surface-soft)]'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black">{label}</p>
                      <p className={cn('text-xs font-medium', mode === value ? 'text-[#1f5100]' : 'text-[var(--quest-muted)]')}>
                        {desc}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <section className="quest-soft-card space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="quest-field-label mb-0">ผู้ร่วมจ่าย</Label>
                <p className="text-sm font-medium text-[var(--quest-muted)]">{participants.length} คนในภารกิจนี้</p>
              </div>

              <button
                type="button"
                onClick={addPerson}
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#2b6c00] bg-[#58cc02] px-3 py-1.5 text-sm font-bold text-[#1e5000] shadow-[0_3px_0_0_#1e5000] transition-all hover:-translate-y-0.5"
              >
                <UserPlus className="h-4 w-4" />
                เพิ่มคน
              </button>
            </div>

            <div className="space-y-2.5">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-[1.25rem] border border-[#becbb1] bg-[var(--quest-surface)] p-3 dark:border-[#3b4630] dark:bg-[var(--quest-surface)]"
                >
                  <Input
                    placeholder={`ชื่อคนที่ ${index + 1}`}
                    value={participant.name}
                    onChange={(event) => updateName(participant.id, event.target.value)}
                    className="quest-input h-11 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />

                  {mode !== 'equal' ? (
                    <div className="relative w-28">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={participant.share || ''}
                        onChange={(event) => updateShare(participant.id, event.target.value)}
                        className="quest-input h-11 pr-10 text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--quest-muted)]">
                        {mode === 'percentage' ? '%' : currency}
                      </span>
                    </div>
                  ) : (
                    <div className="min-w-20 rounded-full bg-[var(--quest-surface-soft)] px-3 py-2 text-right text-sm font-black text-[var(--quest-muted)] dark:bg-[var(--quest-surface-soft)]">
                      {total > 0 ? totalPerHead.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : '0'}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removePerson(participant.id)}
                    disabled={participants.length <= 2}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-rose-700 bg-rose-100 text-rose-700 shadow-[0_4px_0_0_#7f1d1d] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-rose-900/30 dark:text-rose-200"
                    title="ลบผู้ร่วมจ่าย"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {mode === 'custom' && total > 0 && (
              <div
                className={cn(
                  'rounded-2xl border px-3 py-2 text-sm font-bold',
                  isCustomValid
                    ? 'border-[#2b6c00] bg-[#efffe4] text-[#1e5000] dark:bg-[#1b2614]'
                    : 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-200'
                )}
              >
                รวม {shareTotal.toLocaleString('th-TH', { maximumFractionDigits: 2 })} / {total.toLocaleString('th-TH', { maximumFractionDigits: 2 })} {currency}
              </div>
            )}

            {mode === 'percentage' && (
              <div
                className={cn(
                  'rounded-2xl border px-3 py-2 text-sm font-bold',
                  isPercentageValid
                    ? 'border-[#2b6c00] bg-[#efffe4] text-[#1e5000] dark:bg-[#1b2614]'
                    : 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-200'
                )}
              >
                รวมเปอร์เซ็นต์ {shareTotal.toFixed(1)}%
              </div>
            )}
          </section>

          <div>
            <Label className="quest-field-label">หมายเหตุ (ไม่บังคับ)</Label>
            <Input
              placeholder="เช่น ร้านอาหาร ชั้น 2 หรือทวงหลังเลิกงาน"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="quest-input"
            />
          </div>
        </div>

        <Separator className="bg-[#becbb1] dark:bg-[#3b4630]" />

        <DialogFooter className="-mx-0 -mb-0 gap-2 border-[#becbb1] bg-[var(--quest-surface-low)] px-6 py-4 dark:border-[#3b4630] dark:bg-[var(--quest-surface-low)]">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="quest-secondary-button"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="quest-action-button px-5"
          >
            <Plus className="h-4 w-4" />
            บันทึกบิล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
