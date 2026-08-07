'use client'

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Edit3, Footprints, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PressCard } from '@/components/ui/PressCard'
import { getHealthDateKey, useHealthQuestStore } from '@/store/useHealthQuestStore'
import { cn } from '@/lib/utils'
import type {
  HealthIntensity,
  HealthMood,
  HealthRunningLog,
  HealthRunningStats,
  HealthRunType,
} from '@/types/health'

type RunFormState = {
  date: string
  distanceKm: string
  durationMin: string
  durationSec: string
  runType: HealthRunType
  intensity: HealthIntensity
  mood: HealthMood
  note: string
}

const defaultRunForm = (): RunFormState => ({
  date: getHealthDateKey(),
  distanceKm: '',
  durationMin: '',
  durationSec: '',
  runType: 'easy',
  intensity: 'normal',
  mood: 'ok',
  note: '',
})

const runTypeLabel: Record<HealthRunType, string> = {
  easy: 'วิ่งเบา',
  long: 'วิ่งยาว',
  tempo: 'Tempo',
  interval: 'Interval',
  treadmill: 'Treadmill',
  recovery: 'Recovery',
}

const intensityLabel: Record<HealthIntensity, string> = {
  easy: 'เบา',
  normal: 'พอดี',
  hard: 'หนัก',
}

const moodLabel: Record<HealthMood, string> = {
  great: 'สดชื่น',
  ok: 'โอเค',
  tired: 'เหนื่อย',
}

const runToneClass: Record<HealthRunType, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  long: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
  tempo: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  interval: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
  treadmill: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200',
  recovery: 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-200',
}

function toPositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftDateKey(dateKey: string, days: number) {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + days)
  return getHealthDateKey(date)
}

function formatKm(value: number) {
  return `${value.toLocaleString('th-TH', { maximumFractionDigits: 1 })} km`
}

function formatPace(seconds?: number) {
  if (!seconds || seconds <= 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}/km`
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest > 0 ? `${minutes} นาที ${rest} วิ` : `${minutes} นาที`
}

function formatShortDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day))
}

function getDurationSec(form: RunFormState) {
  const minutes = toPositiveNumber(form.durationMin) ?? 0
  const seconds = toPositiveNumber(form.durationSec) ?? 0
  return Math.round(minutes * 60 + seconds)
}

function getPacePreview(form: RunFormState) {
  const distanceKm = toPositiveNumber(form.distanceKm)
  const durationSec = getDurationSec(form)
  if (!distanceKm || durationSec <= 0) return undefined
  return Math.round(durationSec / distanceKm)
}

function buildSevenDayChart(runningLogs: HealthRunningLog[]) {
  const today = getHealthDateKey()
  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(today, index - 6)
    const distanceKm = runningLogs
      .filter((run) => run.date === date)
      .reduce((sum, run) => sum + run.distanceKm, 0)

    return {
      date,
      label: new Intl.DateTimeFormat('th-TH', { weekday: 'short' }).format(parseDateKey(date)),
      distanceKm: Number(distanceKm.toFixed(2)),
    }
  })
}

function calculateAveragePaceSecPerKm(runs: HealthRunningLog[]) {
  const totalDistance = runs.reduce((sum, run) => sum + run.distanceKm, 0)
  if (totalDistance <= 0) return undefined

  const totalDuration = runs.reduce((sum, run) => sum + run.durationSec, 0)
  return Math.round(totalDuration / totalDistance)
}

function deriveRunningStats(
  runningLogs: HealthRunningLog[],
  weeklyGoalKm: number
): HealthRunningStats {
  const today = getHealthDateKey()
  const weekStart = shiftDateKey(today, -6)
  const weeklyRuns = runningLogs.filter((run) => run.date >= weekStart && run.date <= today)
  const weeklyDistanceKm = weeklyRuns.reduce((sum, run) => sum + run.distanceKm, 0)
  const totalDistanceKm = runningLogs.reduce((sum, run) => sum + run.distanceKm, 0)

  return {
    weeklyGoalKm,
    weeklyDistanceKm,
    weeklyProgressPercent: weeklyGoalKm > 0 ? Math.min(100, (weeklyDistanceKm / weeklyGoalKm) * 100) : 0,
    totalRuns: runningLogs.length,
    totalDistanceKm,
    averagePaceSecPerKm: calculateAveragePaceSecPerKm(runningLogs),
    longestRunKm: runningLogs.reduce((max, run) => Math.max(max, run.distanceKm), 0) || undefined,
  }
}

export function RunningQuestSection() {
  const runningLogs = useHealthQuestStore((state) => state.runningLogs)
  const weeklyRunningGoalKm = useHealthQuestStore((state) => state.weeklyRunningGoalKm)
  const addRunLog = useHealthQuestStore((state) => state.addRunLog)
  const updateRunLog = useHealthQuestStore((state) => state.updateRunLog)
  const deleteRunLog = useHealthQuestStore((state) => state.deleteRunLog)

  const [open, setOpen] = useState(false)
  const [editingRun, setEditingRun] = useState<HealthRunningLog | null>(null)
  const [form, setForm] = useState<RunFormState>(() => defaultRunForm())

  const chartData = useMemo(() => buildSevenDayChart(runningLogs), [runningLogs])
  const stats = useMemo(
    () => deriveRunningStats(runningLogs, weeklyRunningGoalKm),
    [runningLogs, weeklyRunningGoalKm]
  )
  const recentRuns = runningLogs.slice(0, 5)
  const pacePreview = getPacePreview(form)

  function openAddDialog() {
    setEditingRun(null)
    setForm(defaultRunForm())
    setOpen(true)
  }

  function openEditDialog(run: HealthRunningLog) {
    const minutes = Math.floor(run.durationSec / 60)
    const seconds = run.durationSec % 60
    setEditingRun(run)
    setForm({
      date: run.date,
      distanceKm: String(run.distanceKm),
      durationMin: String(minutes),
      durationSec: seconds > 0 ? String(seconds) : '',
      runType: run.runType,
      intensity: run.intensity,
      mood: run.mood ?? 'ok',
      note: run.note ?? '',
    })
    setOpen(true)
  }

  function handleSubmit() {
    const distanceKm = toPositiveNumber(form.distanceKm)
    const durationSec = getDurationSec(form)

    if (!distanceKm) {
      toast.error('ใส่ระยะทางก่อนนะ')
      return
    }

    if (durationSec <= 0) {
      toast.error('ใส่เวลาที่วิ่งอย่างน้อย 1 อย่าง')
      return
    }

    const payload = {
      date: form.date,
      distanceKm,
      durationSec,
      runType: form.runType,
      intensity: form.intensity,
      mood: form.mood,
      note: form.note,
    }

    if (editingRun) {
      updateRunLog(editingRun.id, payload)
      toast.success('อัปเดตบันทึกการวิ่งแล้ว')
    } else {
      addRunLog(payload)
      toast.success('บันทึกการวิ่งแล้ว รับ EXP เรียบร้อย')
    }

    setOpen(false)
  }

  function handleDelete(run: HealthRunningLog) {
    if (!window.confirm(`ลบบันทึกวิ่ง ${formatKm(run.distanceKm)} วันที่ ${formatShortDate(run.date)} ใช่ไหม?`)) return
    deleteRunLog(run.id)
    toast.success('ลบบันทึกการวิ่งแล้ว')
  }

  return (
    <section className="space-y-4">
      <PressCard
        shadow="0 7px 0 0 #065f46"
        shadowHover="0 4px 0 0 #065f46"
        className="overflow-hidden rounded-3xl border-[3px] border-emerald-900 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-4 text-white sm:p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20">
              <Footprints className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Running Quest</h2>
            <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-white/90">
              บันทึกการวิ่งแบบเร็ว ๆ ระบบจะคำนวณ pace, EXP และระยะสะสมรายสัปดาห์ให้เอง
            </p>
          </div>
          <Button
            onClick={openAddDialog}
            className="h-12 rounded-2xl border-2 border-white bg-white px-5 font-black text-emerald-800 shadow-[0_4px_0_0_#065f46] hover:bg-emerald-50 active:translate-y-1"
          >
            <Plus className="h-5 w-5" />
            บันทึกการวิ่ง
          </Button>
        </div>
      </PressCard>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <RunSummaryCard label="สัปดาห์นี้" value={formatKm(stats.weeklyDistanceKm)} helper={`${formatKm(stats.weeklyGoalKm)} goal`} />
        <RunSummaryCard label="Progress" value={`${Math.round(stats.weeklyProgressPercent)}%`} helper="เป้าระยะต่อสัปดาห์" />
        <RunSummaryCard label="Pace เฉลี่ย" value={formatPace(stats.averagePaceSecPerKm)} helper="รวมทุก run" />
        <RunSummaryCard label="วิ่งทั้งหมด" value={`${stats.totalRuns} ครั้ง`} helper={formatKm(stats.totalDistanceKm)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <PressCard
          shadow="0 5px 0 0 #cbd5e1"
          shadowHover="0 3px 0 0 #cbd5e1"
          className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">ระยะทาง 7 วันล่าสุด</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                ดูจังหวะการซ้อมแบบไม่กดดันเกินไป
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:w-48">
              <div
                className="h-full rounded-full bg-[#58cc02]"
                style={{ width: `${Math.min(100, stats.weeklyProgressPercent)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis hide domain={[0, 'dataMax + 2']} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)} km`, 'ระยะทาง']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? formatShortDate(payload[0].payload.date) : ''}
                  contentStyle={{ borderRadius: 16, border: '2px solid #d1fae5', fontWeight: 800 }}
                />
                <Area
                  type="monotone"
                  dataKey="distanceKm"
                  stroke="#059669"
                  strokeWidth={3}
                  fill="#86efac"
                  fillOpacity={0.45}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </PressCard>

        <PressCard
          shadow="0 5px 0 0 #cbd5e1"
          shadowHover="0 3px 0 0 #cbd5e1"
          className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">Run history</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">ล่าสุด {recentRuns.length} รายการ</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              {stats.longestRunKm ? `Longest ${formatKm(stats.longestRunKm)}` : 'เริ่มวิ่งกัน'}
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            {recentRuns.length > 0 ? recentRuns.map((run) => (
              <RunLogCard
                key={run.id}
                run={run}
                onEdit={() => openEditDialog(run)}
                onDelete={() => handleDelete(run)}
              />
            )) : (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 p-5 text-center dark:border-slate-800">
                <Footprints className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">ยังไม่มีบันทึกการวิ่ง</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  เริ่มจาก 1-2 km ก็พอ ระบบจะช่วยนับ progress ให้
                </p>
              </div>
            )}
          </div>
        </PressCard>
      </div>

      <RunLogDialog
        open={open}
        onOpenChange={setOpen}
        form={form}
        setForm={setForm}
        editingRun={editingRun}
        pacePreview={pacePreview}
        onSubmit={handleSubmit}
      />
    </section>
  )
}

function RunSummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <PressCard
      shadow="0 4px 0 0 #cbd5e1"
      shadowHover="0 2px 0 0 #cbd5e1"
      className="rounded-3xl border-[3px] border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{helper}</p>
    </PressCard>
  )
}

function RunLogCard({
  run,
  onEdit,
  onDelete,
}: {
  run: HealthRunningLog
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-3xl border-2 border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={runToneClass[run.runType]}>{runTypeLabel[run.runType]}</Badge>
            <Badge variant="outline">{intensityLabel[run.intensity]}</Badge>
          </div>
          <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{formatKm(run.distanceKm)}</p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {formatDuration(run.durationSec)} · {formatPace(run.paceSecPerKm)} · {formatShortDate(run.date)}
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
          +{run.xpEarned} EXP
        </Badge>
      </div>

      {run.note && (
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{run.note}</p>
      )}

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} className="h-9 rounded-2xl border-2 font-black">
          <Edit3 className="h-3.5 w-3.5" />
          แก้ไข
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="h-9 rounded-2xl border-2 font-black text-rose-600 hover:text-rose-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
          ลบ
        </Button>
      </div>
    </div>
  )
}

function RunLogDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editingRun,
  pacePreview,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: RunFormState
  setForm: Dispatch<SetStateAction<RunFormState>>
  editingRun: HealthRunningLog | null
  pacePreview?: number
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92vh] !w-[calc(100vw-1rem)] !max-w-[720px] flex-col overflow-hidden rounded-3xl border-[3px] border-emerald-200 p-0 dark:border-emerald-900 sm:!w-[calc(100vw-2rem)]"
      >
        <DialogHeader className="border-b px-5 py-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
              {editingRun ? 'แก้ไขบันทึกการวิ่ง' : 'บันทึกการวิ่ง'}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-2xl">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="วันที่">
              <Input
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                className="h-11 rounded-2xl border-2 font-bold"
              />
            </Field>
            <Field label="ระยะทาง (km)">
              <Input
                inputMode="decimal"
                value={form.distanceKm}
                onChange={(event) => setForm((current) => ({ ...current, distanceKm: event.target.value }))}
                className="h-11 rounded-2xl border-2 font-bold"
                placeholder="5"
              />
            </Field>
            <Field label="Pace preview">
              <div className="flex h-11 items-center rounded-2xl border-2 border-emerald-100 bg-emerald-50 px-3 font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
                {formatPace(pacePreview)}
              </div>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="เวลา (นาที)">
              <Input
                inputMode="numeric"
                value={form.durationMin}
                onChange={(event) => setForm((current) => ({ ...current, durationMin: event.target.value }))}
                className="h-11 rounded-2xl border-2 font-bold"
                placeholder="30"
              />
            </Field>
            <Field label="เวลา (วินาที)">
              <Input
                inputMode="numeric"
                value={form.durationSec}
                onChange={(event) => setForm((current) => ({ ...current, durationSec: event.target.value }))}
                className="h-11 rounded-2xl border-2 font-bold"
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="ประเภทการวิ่ง">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(runTypeLabel).map(([runType, label]) => (
                <ChoiceButton
                  key={runType}
                  active={form.runType === runType}
                  onClick={() => setForm((current) => ({ ...current, runType: runType as HealthRunType }))}
                >
                  {label}
                </ChoiceButton>
              ))}
            </div>
          </Field>

          <Field label="ความหนัก">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(intensityLabel).map(([intensity, label]) => (
                <ChoiceButton
                  key={intensity}
                  active={form.intensity === intensity}
                  onClick={() => setForm((current) => ({ ...current, intensity: intensity as HealthIntensity }))}
                >
                  {label}
                </ChoiceButton>
              ))}
            </div>
          </Field>

          <Field label="ความรู้สึก">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(moodLabel).map(([mood, label]) => (
                <ChoiceButton
                  key={mood}
                  active={form.mood === mood}
                  onClick={() => setForm((current) => ({ ...current, mood: mood as HealthMood }))}
                >
                  {label}
                </ChoiceButton>
              ))}
            </div>
          </Field>

          <Field label="Note">
            <Input
              value={form.note}
              onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              className="h-11 rounded-2xl border-2"
              placeholder="เช่น วันนี้วิ่งเบา ขาดี อากาศร้อนนิดหน่อย"
            />
          </Field>
        </div>

        <DialogFooter className="border-t bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl border-2 font-black">
            ยกเลิก
          </Button>
          <Button onClick={onSubmit} className="rounded-2xl bg-[#58cc02] font-black text-white hover:bg-[#46a302]">
            {editingRun ? 'บันทึกการแก้ไข' : 'รับ EXP'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">{label}</Label>
      {children}
    </div>
  )
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className={cn(
        'h-10 rounded-2xl border-2 font-black',
        active && 'border-[#2b6c00] bg-[#58cc02] text-white hover:bg-[#46a302]'
      )}
    >
      {children}
    </Button>
  )
}
