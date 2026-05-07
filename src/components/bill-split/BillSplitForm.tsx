'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, Equal, Sliders, Percent, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useBillSplitStore } from '@/store/useBillSplitStore'
import { BillSplitMode, BillParticipant } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

const MODE_OPTIONS: { value: BillSplitMode; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'equal',      label: 'เท่ากัน',     icon: Equal,   desc: 'หารเท่าๆ กันทุกคน' },
  { value: 'custom',     label: 'กำหนดเอง',   icon: Sliders,  desc: 'ใส่ยอดแต่ละคนเอง' },
  { value: 'percentage', label: 'เปอร์เซ็นต์', icon: Percent, desc: 'แบ่งตาม %' },
]

function newParticipant(name = ''): BillParticipant {
  return { id: crypto.randomUUID(), name, share: 0, paid: false }
}

export function BillSplitForm({ open, onClose }: Props) {
  const addSplit = useBillSplitStore((s) => s.addSplit)

  const [title,       setTitle]       = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [currency,    setCurrency]    = useState('THB')
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [paidBy,      setPaidBy]      = useState('ฉัน')
  const [mode,        setMode]        = useState<BillSplitMode>('equal')
  const [note,        setNote]        = useState('')
  const [participants, setParticipants] = useState<BillParticipant[]>([
    newParticipant('ฉัน'),
    newParticipant(''),
  ])

  const total = parseFloat(totalAmount) || 0

  /* ── participant helpers ── */
  const addPerson = () =>
    setParticipants((p) => [...p, newParticipant('')])

  const removePerson = (id: string) =>
    setParticipants((p) => p.filter((x) => x.id !== id))

  const updateName = (id: string, name: string) =>
    setParticipants((p) => p.map((x) => (x.id === id ? { ...x, name } : x)))

  const updateShare = (id: string, val: string) =>
    setParticipants((p) =>
      p.map((x) => (x.id === id ? { ...x, share: parseFloat(val) || 0 } : x))
    )

  /* ── computed shares ── */
  const computedParticipants = useCallback((): BillParticipant[] => {
    if (mode === 'equal') {
      const each = participants.length > 0 ? total / participants.length : 0
      return participants.map((p) => ({ ...p, share: Math.round(each * 100) / 100 }))
    }
    if (mode === 'percentage') {
      return participants.map((p) => ({
        ...p,
        share: Math.round(total * (p.share / 100) * 100) / 100,
      }))
    }
    return participants // custom
  }, [mode, participants, total])

  const shareTotal =
    mode === 'percentage'
      ? participants.reduce((s, p) => s + p.share, 0)
      : computedParticipants().reduce((s, p) => s + p.share, 0)

  const isPercentageValid = mode === 'percentage' ? Math.abs(shareTotal - 100) < 0.01 : true
  const isCustomValid     = mode === 'custom'     ? Math.abs(shareTotal - total) < 0.01 : true

  /* ── submit ── */
  const handleSubmit = () => {
    if (!title.trim())            return toast.error('ใส่ชื่อบิลด้วย')
    if (total <= 0)               return toast.error('ใส่ยอดรวมด้วย')
    if (participants.length < 2)  return toast.error('ต้องมีอย่างน้อย 2 คน')
    if (participants.some((p) => !p.name.trim())) return toast.error('ใส่ชื่อทุกคนด้วย')
    if (!isPercentageValid)       return toast.error('เปอร์เซ็นต์รวมต้องเท่ากับ 100%')
    if (!isCustomValid)           return toast.error(`ยอดรวมต้องเท่ากับ ${total.toLocaleString()} บาท`)

    addSplit({
      title:        title.trim(),
      totalAmount:  total,
      currency,
      date,
      paidBy,
      splitMode:    mode,
      participants: computedParticipants(),
      note:         note.trim() || undefined,
    })

    toast.success('บันทึกการแบ่งบิลเรียบร้อย 🎉')
    handleClose()
  }

  const handleClose = () => {
    setTitle(''); setTotalAmount(''); setCurrency('THB')
    setDate(new Date().toISOString().slice(0, 10))
    setPaidBy('ฉัน'); setMode('equal'); setNote('')
    setParticipants([newParticipant('ฉัน'), newParticipant('')])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="text-xl">🧾</span>
            แบ่งบิลใหม่
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title + date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-white/40">ชื่อบิล</Label>
              <Input
                placeholder="เช่น อาหารเย็น, ทริปเชียงใหม่"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-white/40">วันที่</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-white/40">สกุลเงิน</Label>
              <Input
                placeholder="THB"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={4}
              />
            </div>
          </div>

          {/* Total + paidBy */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-white/40">ยอดรวม</Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-white/40">ใครจ่าย?</Label>
              <Input
                placeholder="ฉัน"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              />
            </div>
          </div>

          {/* Split mode */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 dark:text-white/40">วิธีแบ่ง</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {MODE_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all',
                    mode === value
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
                      : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:border-gray-300 dark:hover:border-white/20'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  <span className="text-[9px] font-normal text-gray-400 dark:text-white/30 leading-tight text-center">
                    {desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500 dark:text-white/40">
                ผู้ร่วมจ่าย ({participants.length} คน)
              </Label>
              <button
                type="button"
                onClick={addPerson}
                className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                <UserPlus className="w-3.5 h-3.5" />
                เพิ่มคน
              </button>
            </div>

            <div className="space-y-1.5">
              {participants.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Input
                    placeholder={`ชื่อคนที่ ${i + 1}`}
                    value={p.name}
                    onChange={(e) => updateName(p.id, e.target.value)}
                    className="flex-1"
                  />
                  {mode !== 'equal' && (
                    <div className="relative w-24">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={p.share || ''}
                        onChange={(e) => updateShare(p.id, e.target.value)}
                        className="pr-8 text-right"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                        {mode === 'percentage' ? '%' : currency}
                      </span>
                    </div>
                  )}
                  {mode === 'equal' && total > 0 && (
                    <span className="w-24 text-right text-xs font-medium text-gray-500 dark:text-white/40 tabular-nums">
                      {(total / participants.length).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePerson(p.id)}
                    disabled={participants.length <= 2}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Sum check */}
            {mode === 'custom' && total > 0 && (
              <div className={cn(
                'flex justify-between text-xs px-1',
                isCustomValid ? 'text-green-600 dark:text-green-400' : 'text-red-500'
              )}>
                <span>รวม</span>
                <span className="tabular-nums font-medium">
                  {shareTotal.toLocaleString('th-TH', { maximumFractionDigits: 2 })} / {total.toLocaleString('th-TH', { maximumFractionDigits: 2 })} {currency}
                </span>
              </div>
            )}
            {mode === 'percentage' && (
              <div className={cn(
                'flex justify-between text-xs px-1',
                isPercentageValid ? 'text-green-600 dark:text-green-400' : 'text-red-500'
              )}>
                <span>รวม %</span>
                <span className="tabular-nums font-medium">{shareTotal.toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 dark:text-white/40">โน้ต (ไม่บังคับ)</Label>
            <Input
              placeholder="เช่น ร้านอาหาร XYZ"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={handleClose}>ยกเลิก</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700 text-white">
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
