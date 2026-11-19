'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Droplets, Flame, GlassWater, Pencil, Plus, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FoodForm } from '@/components/nutrition/FoodForm'
import { GoalsDialog, WaterAmountDialog } from '@/components/nutrition/AmountDialogs'
import { FoodInput, useNutritionStore } from '@/store/useNutritionStore'
import { todayKey } from '@/lib/recurring'
import { addDays } from '@/lib/supplies'
import { MEALS, averageOfLogged, formatMl, kcalByMeal, kcalOn, progress, recentDays, waterOn } from '@/lib/nutrition'
import { FoodEntry } from '@/types'
import { cn } from '@/lib/utils'

const QUICK_WATER = [250, 500]

function formatDayLabel(date: string, today: string): string {
  if (date === today) return 'วันนี้'
  if (date === addDays(today, -1)) return 'เมื่อวาน'
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
}

function shortWeekday(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('th-TH', { weekday: 'narrow' })
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const cardShadow = { shadow: '0 4px 0 0 #e5e5e5', shadowHover: '0 2px 0 0 #e5e5e5' }

export default function NutritionPage() {
  const { food, water, calorieGoal, waterGoal, addFood, updateFood, deleteFood, addWater, deleteWater, setGoals } =
    useNutritionStore()
  const today = todayKey()
  const [date, setDate] = useState(today)

  const [foodFormOpen, setFoodFormOpen] = useState(false)
  const [editing, setEditing] = useState<FoodEntry | null>(null)
  const [deleting, setDeleting] = useState<FoodEntry | null>(null)
  const [waterOpen, setWaterOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)

  const eaten = kcalOn(food, date)
  const drank = waterOn(water, date)
  const byMeal = kcalByMeal(food, date)
  const dayFood = useMemo(
    () => food.filter((e) => e.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [food, date],
  )
  const dayWater = useMemo(
    () => water.filter((e) => e.date === date).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [water, date],
  )
  const week = useMemo(() => recentDays(food, water, date), [food, water, date])
  const avgKcal = averageOfLogged(week.map((d) => d.kcal))
  const avgWater = averageOfLogged(week.map((d) => d.water))

  const kcalLeft = calorieGoal - eaten
  const waterLeft = waterGoal - drank

  const openNewFood = () => { setEditing(null); setFoodFormOpen(true) }

  const handleFoodSubmit = (input: FoodInput) => {
    if (editing) {
      updateFood(editing.id, input)
      toast.success('แก้ไขแล้ว')
    } else {
      addFood(input)
      toast.success(`บันทึก ${input.name} ${input.kcal.toLocaleString('th-TH')} kcal แล้ว`)
    }
    setFoodFormOpen(false)
  }

  const handleAddWater = (ml: number) => {
    const before = drank
    addWater(date, ml)
    setWaterOpen(false)
    if (before < waterGoal && before + ml >= waterGoal) toast.success('ดื่มน้ำครบเป้าแล้ว')
    else toast.success(`ดื่มน้ำ ${formatMl(ml)}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">แคลอรี่ & น้ำ</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">บันทึกอาหารที่กินและน้ำที่ดื่มในแต่ละวัน เทียบกับเป้าหมายของคุณ</p>
        </div>
        <Button variant="outline" onClick={() => setGoalsOpen(true)} className="gap-1.5">
          <Settings2 className="w-4 h-4" /> เป้าหมาย
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label="วันก่อนหน้า" onClick={() => setDate(addDays(date, -1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <p className="font-bold text-slate-800 dark:text-slate-100">{formatDayLabel(date, today)}</p>
          {date !== today && (
            <button type="button" className="text-xs text-emerald-700 dark:text-emerald-400 underline" onClick={() => setDate(today)}>
              กลับไปวันนี้
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label="วันถัดไป" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PressCard {...cardShadow} className="p-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-500/15">
              <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200">แคลอรี่</p>
          </div>
          <p className="num tabular-nums">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{eaten.toLocaleString('th-TH')}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400"> / {calorieGoal.toLocaleString('th-TH')} kcal</span>
          </p>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full', kcalLeft < 0 ? 'bg-red-500' : 'bg-orange-500')}
              style={{ width: `${Math.round(progress(eaten, calorieGoal) * 100)}%` }}
            />
          </div>
          <p className={cn('text-sm', kcalLeft < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400')}>
            {kcalLeft < 0 ? `เกินเป้า ${(-kcalLeft).toLocaleString('th-TH')} kcal` : `เหลืออีก ${kcalLeft.toLocaleString('th-TH')} kcal`}
          </p>
          <Button onClick={openNewFood} className="w-full gap-1.5">
            <Plus className="w-4 h-4" /> บันทึกอาหาร
          </Button>
        </PressCard>

        <PressCard {...cardShadow} className="p-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-500/15">
              <Droplets className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200">น้ำ</p>
          </div>
          <p className="num tabular-nums">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{drank.toLocaleString('th-TH')}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400"> / {waterGoal.toLocaleString('th-TH')} มล.</span>
          </p>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.round(progress(drank, waterGoal) * 100)}%` }} />
          </div>
          <p className={cn('text-sm', waterLeft <= 0 ? 'text-sky-700 dark:text-sky-400 font-semibold' : 'text-slate-500 dark:text-slate-400')}>
            {waterLeft <= 0 ? 'ดื่มครบเป้าแล้ว' : `อีก ${formatMl(waterLeft)}`}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_WATER.map((ml) => (
              <Button key={ml} variant="outline" className="gap-1" onClick={() => handleAddWater(ml)}>
                <GlassWater className="w-4 h-4" /> +{ml}
              </Button>
            ))}
            <Button variant="outline" onClick={() => setWaterOpen(true)}>ใส่เอง</Button>
          </div>
        </PressCard>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">อาหาร{date === today ? 'วันนี้' : ''}</h3>
        {dayFood.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีรายการอาหาร</p>
        ) : (
          MEALS.filter((m) => dayFood.some((e) => e.meal === m.value)).map((m) => (
            <div key={m.value} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="flex items-center justify-between px-1 pb-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{m.label}</p>
                <p className="text-sm font-semibold num tabular-nums text-slate-600 dark:text-slate-300">
                  {byMeal[m.value].toLocaleString('th-TH')} kcal
                </p>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {dayFood.filter((e) => e.meal === m.value).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 py-1.5 pl-1">
                    <p className="flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-100 break-words">{e.name}</p>
                    <p className="text-sm num tabular-nums text-slate-500 dark:text-slate-400">{e.kcal.toLocaleString('th-TH')}</p>
                    <Button variant="ghost" size="icon" aria-label={`แก้ไข ${e.name}`} onClick={() => { setEditing(e); setFoodFormOpen(true) }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`ลบ ${e.name}`} onClick={() => setDeleting(e)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {dayWater.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">การดื่มน้ำ ({dayWater.length} ครั้ง)</h3>
          <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 divide-y divide-slate-100 dark:divide-slate-800">
            {dayWater.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-1.5 pl-1">
                <p className="w-14 text-xs num tabular-nums text-slate-500 dark:text-slate-400">{timeOf(e.createdAt)}</p>
                <p className="flex-1 text-sm text-slate-800 dark:text-slate-100">{formatMl(e.ml)}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`ลบการดื่มน้ำ ${e.ml} มล.`}
                  onClick={() => { deleteWater(e.id); toast.success('ลบแล้ว') }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">7 วันล่าสุด</h3>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
          {([
            { label: 'แคลอรี่', key: 'kcal', goal: calorieGoal, avg: avgKcal, unit: 'kcal', bar: 'bg-orange-500', over: 'bg-red-500' },
            { label: 'น้ำ', key: 'water', goal: waterGoal, avg: avgWater, unit: 'มล.', bar: 'bg-sky-500', over: 'bg-sky-500' },
          ] as const).map((row) => (
            <div key={row.key} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{row.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {row.avg === null ? 'ยังไม่มีข้อมูล' : `เฉลี่ยวันละ ${row.avg.toLocaleString('th-TH')} ${row.unit} (นับเฉพาะวันที่บันทึก)`}
                </p>
              </div>
              <div className="grid grid-cols-7 gap-1.5 items-end h-20">
                {week.map((d) => {
                  const value = d[row.key]
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setDate(d.date)}
                      title={`${formatDayLabel(d.date, today)}: ${value.toLocaleString('th-TH')} ${row.unit}`}
                      className="flex h-full flex-col justify-end"
                    >
                      <div className="w-full rounded-t-md bg-slate-100 dark:bg-slate-800 h-full flex items-end overflow-hidden">
                        <div
                          className={cn('w-full', value > row.goal ? row.over : row.bar, d.date === date ? 'opacity-100' : 'opacity-60')}
                          style={{ height: `${Math.round(progress(value, row.goal) * 100)}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {week.map((d) => (
                  <p key={d.date} className={cn('text-center text-xs', d.date === date ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-400')}>
                    {shortWeekday(d.date)}
                  </p>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-400">แท่งเต็มช่องเมื่อถึงเป้า แตะแท่งเพื่อดูวันนั้น</p>
        </div>
      </section>

      <FoodForm
        open={foodFormOpen}
        onOpenChange={setFoodFormOpen}
        date={date}
        editing={editing}
        history={food}
        onSubmit={handleFoodSubmit}
      />
      <WaterAmountDialog open={waterOpen} onOpenChange={setWaterOpen} onConfirm={handleAddWater} />
      <GoalsDialog
        open={goalsOpen}
        onOpenChange={setGoalsOpen}
        calorieGoal={calorieGoal}
        waterGoal={waterGoal}
        onConfirm={(k, w) => { setGoals(k, w); setGoalsOpen(false); toast.success('บันทึกเป้าหมายแล้ว') }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="ลบรายการอาหาร"
        description={`ลบ "${deleting?.name ?? ''}" ออกจากบันทึก`}
        onConfirm={() => {
          if (deleting) deleteFood(deleting.id)
          setDeleting(null)
          toast.success('ลบแล้ว')
        }}
        confirmLabel="ลบ"
      />
    </div>
  )
}
