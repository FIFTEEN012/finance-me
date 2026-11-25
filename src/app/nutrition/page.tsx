'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  GlassWater,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { PressCard } from '@/components/ui/PressCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FoodForm } from '@/components/nutrition/FoodForm'
import { FoodPhotoButton } from '@/components/nutrition/FoodPhotoButton'
import { PhotoExpenseFields, photoExpenseAmount, type PhotoExpenseValue } from '@/components/nutrition/PhotoExpenseFields'
import { ExerciseForm } from '@/components/nutrition/ExerciseForm'
import { ProfileDialog } from '@/components/nutrition/ProfileDialog'
import { AdviceCard } from '@/components/nutrition/AdviceCard'
import { GoalsDialog, WaterAmountDialog } from '@/components/nutrition/AmountDialogs'
import { ExerciseInput, FoodInput, ProfileInput, useNutritionStore } from '@/store/useNutritionStore'
import { useTransactionStore } from '@/store/useTransactionStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { savePhotoDraft } from '@/store/photoDraftExpense'
import { DEFAULT_FOOD_CATEGORY_ID, foodCategories } from '@/lib/foodCategory'
import { formatCurrency } from '@/lib/utils'
import { todayKey } from '@/lib/recurring'
import { addDays } from '@/lib/supplies'
import { MEALS, averageOfLogged, formatMl, kcalByMeal, kcalOn, macrosOn, progress, waterBottle, waterOn } from '@/lib/nutrition'
import { FillGauge } from '@/components/shared/FillGauge'
import { FALLBACK_WEIGHT_KG, burnedOn, exerciseWater, minutesOn, recommend, weekMinutes } from '@/lib/fitness'
import { ExerciseEntry, FoodEntry } from '@/types'
import { cn } from '@/lib/utils'

const QUICK_WATER = [250, 500]
/** One tap on the Water Bottle logs this much. */
const TAP_WATER = 250
/** Weekly exercise target before a profile exists (WHO minimum). */
const DEFAULT_WEEKLY_MINUTES = 150

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

const n = (v: number) => v.toLocaleString('th-TH')
const grams = (v: number) => n(Math.round(v * 10) / 10)
/** ml → litres for the bottle caption, e.g. 1200 → "1.2". */
const formatLitres = (ml: number) =>
  (ml / 1000).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
const cardShadow = { shadow: '0 4px 0 0 #e5e5e5', shadowHover: '0 2px 0 0 #e5e5e5' }
const cardClass = 'p-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3'

export default function NutritionPage() {
  const store = useNutritionStore()
  const { food, water, exercise, profile, calorieGoal, waterGoal } = store
  const today = todayKey()
  const [date, setDate] = useState(today)
  const transactions = useTransactionStore((s) => s.transactions)
  const expenseById = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions])
  const categories = useCategoryStore((s) => s.categories)
  const foodCats = useMemo(() => foodCategories(categories), [categories])
  const defaultFoodCategoryId =
    foodCats.find((c) => c.id === DEFAULT_FOOD_CATEGORY_ID)?.id ?? foodCats[0]?.id ?? ''
  const [photoExpense, setPhotoExpense] = useState<PhotoExpenseValue>({ on: false, amount: '', categoryId: '' })
  const [photoExpenseErrors, setPhotoExpenseErrors] = useState(false)
  // Keep the chosen category valid when Food Categories change.
  const photoExpenseCategoryId = foodCats.some((c) => c.id === photoExpense.categoryId)
    ? photoExpense.categoryId
    : defaultFoodCategoryId

  // A kcal badge on a Food Expense links here with ?date=YYYY-MM-DD.
  useEffect(() => {
    const linked = new URLSearchParams(window.location.search).get('date')
    if (linked && /^\d{4}-\d{2}-\d{2}$/.test(linked) && linked <= today) setDate(linked)
  }, [today])

  const [foodFormOpen, setFoodFormOpen] = useState(false)
  const [editingFood, setEditingFood] = useState<FoodEntry | null>(null)
  const [deletingFood, setDeletingFood] = useState<FoodEntry | null>(null)
  const [exerciseOpen, setExerciseOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<ExerciseEntry | null>(null)
  const [deletingExercise, setDeletingExercise] = useState<ExerciseEntry | null>(null)
  const [waterOpen, setWaterOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const rec = profile ? recommend(profile) : null
  const weeklyTarget = rec?.weeklyExerciseMinutes ?? DEFAULT_WEEKLY_MINUTES
  const sessionTarget = rec?.minutesPerSession ?? 30

  // Exercise raises the day's calorie and water targets.
  const burned = burnedOn(exercise, date)
  const exMinutes = minutesOn(exercise, date)
  const calorieTarget = calorieGoal + burned
  const extraWater = exerciseWater(exMinutes)
  const waterTarget = waterGoal + extraWater

  const eaten = kcalOn(food, date)
  const drank = waterOn(water, date)
  const byMeal = kcalByMeal(food, date)
  const macros = macrosOn(food, date)
  const kcalLeft = calorieTarget - eaten
  const waterLeft = waterTarget - drank
  const bottle = waterBottle(drank, waterTarget)
  const weekMins = weekMinutes(exercise, date)

  const dayFood = useMemo(
    () => food.filter((e) => e.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [food, date],
  )
  const dayWater = useMemo(
    () => water.filter((e) => e.date === date).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [water, date],
  )
  const dayExercise = useMemo(
    () => exercise.filter((e) => e.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [exercise, date],
  )

  const week = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = addDays(date, -i)
      const mins = minutesOn(exercise, d)
      days.push({
        date: d,
        kcal: kcalOn(food, d),
        kcalGoal: calorieGoal + burnedOn(exercise, d),
        water: waterOn(water, d),
        waterGoal: waterGoal + exerciseWater(mins),
        minutes: mins,
      })
    }
    return days
  }, [food, water, exercise, date, calorieGoal, waterGoal])

  const handleFoodSubmit = (input: FoodInput) => {
    if (editingFood) {
      store.updateFood(editingFood.id, input)
      toast.success('แก้ไขแล้ว')
    } else {
      store.addFood(input)
      toast.success(`บันทึก ${input.name} ${n(input.kcal)} kcal แล้ว`)
    }
    setFoodFormOpen(false)
  }

  const handlePhotoDraftSave = (entries: FoodInput[]) => {
    if (entries.length === 0) return
    const withExpense = photoExpense.on && foodCats.length > 0
    const amount = photoExpenseAmount(photoExpense)
    if (withExpense && amount === null) {
      setPhotoExpenseErrors(true)
      return false
    }
    const { foodIds, expenseId } = savePhotoDraft(
      entries,
      withExpense && amount !== null ? { amount, categoryId: photoExpenseCategoryId } : null,
    )
    const total = entries.reduce((sum, e) => sum + e.kcal, 0)
    const undo = () => {
      foodIds.forEach((id) => store.deleteFood(id))
      if (expenseId) useTransactionStore.getState().deleteTransaction(expenseId)
    }
    const message = expenseId
      ? `บันทึก ${entries.length} รายการ ${n(total)} kcal พร้อมรายจ่าย ${formatCurrency(amount!)} แล้ว`
      : `บันทึก ${entries.length} รายการ ${n(total)} kcal แล้ว`
    toast.success(message, { action: { label: 'ยกเลิก', onClick: undo } })
  }

  const resetPhotoExpense = () => {
    setPhotoExpense((current) => ({ ...current, amount: '' }))
    setPhotoExpenseErrors(false)
  }

  const handleExerciseSubmit =(input: ExerciseInput) => {
    if (editingExercise) {
      store.updateExercise(editingExercise.id, input)
      toast.success('แก้ไขแล้ว')
    } else {
      store.addExercise(input)
      toast.success(`${input.name} ${input.minutes} นาที เผาผลาญ ${n(input.kcal)} kcal`)
    }
    setExerciseOpen(false)
  }

  const handleAddWater = (ml: number) => {
    const before = drank
    const id = store.addWater(date, ml)
    setWaterOpen(false)
    const undo = { action: { label: 'ยกเลิก', onClick: () => store.deleteWater(id) } }
    if (before < waterTarget && before + ml >= waterTarget) toast.success('ดื่มน้ำครบเป้าแล้ว', undo)
    else toast.success(`ดื่มน้ำ ${formatMl(ml)}`, undo)
  }

  const handleProfile = (input: ProfileInput) => {
    store.setProfile(input)
    const r = recommend({ ...input, updatedAt: '' })
    store.setGoals(r.calories, r.water)
    setProfileOpen(false)
    toast.success(`ตั้งเป้าเป็น ${n(r.calories)} kcal และน้ำ ${formatMl(r.water)} ต่อวัน`)
  }

  const chartRows = [
    { label: 'แคลอรี่', unit: 'kcal', bar: 'bg-orange-500', over: 'bg-red-500', value: (d: (typeof week)[number]) => d.kcal, goal: (d: (typeof week)[number]) => d.kcalGoal },
    { label: 'น้ำ', unit: 'มล.', bar: 'bg-sky-500', over: 'bg-sky-500', value: (d: (typeof week)[number]) => d.water, goal: (d: (typeof week)[number]) => d.waterGoal },
    { label: 'ออกกำลัง', unit: 'นาที', bar: 'bg-violet-500', over: 'bg-violet-500', value: (d: (typeof week)[number]) => d.minutes, goal: () => sessionTarget },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">แคลอรี่ น้ำ & ออกกำลัง</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            บันทึกอาหาร น้ำ และการออกกำลังในแต่ละวัน การออกกำลังจะเพิ่มแคลอรี่และน้ำที่ควรได้รับในวันนั้นให้อัตโนมัติ
          </p>
        </div>
        <Button variant="outline" onClick={() => setGoalsOpen(true)} className="gap-1.5">
          <Settings2 className="w-4 h-4" /> เป้าหมาย
        </Button>
      </div>

      <AdviceCard
        profile={profile}
        calorieGoal={calorieGoal}
        waterGoal={waterGoal}
        onEditProfile={() => setProfileOpen(true)}
        onApply={(k, w) => { store.setGoals(k, w); toast.success('ใช้คำแนะนำเป็นเป้าหมายแล้ว') }}
      />

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PressCard {...cardShadow} className={cardClass}>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-500/15">
              <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200">แคลอรี่</p>
          </div>
          <p className="num tabular-nums">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{n(eaten)}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400"> / {n(calorieTarget)} kcal</span>
          </p>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full', kcalLeft < 0 ? 'bg-red-500' : 'bg-orange-500')}
              style={{ width: `${Math.round(progress(eaten, calorieTarget) * 100)}%` }}
            />
          </div>
          <p className={cn('text-sm', kcalLeft < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-slate-400')}>
            {kcalLeft < 0 ? `เกินเป้า ${n(-kcalLeft)} kcal` : `เหลืออีก ${n(kcalLeft)} kcal`}
          </p>
          {burned > 0 && (
            <p className="text-xs text-violet-700 dark:text-violet-400">เป้า {n(calorieGoal)} + ออกกำลัง {n(burned)} kcal</p>
          )}
          {macros.entriesWithMacros > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center" aria-label="สารอาหารรวมของวัน">
              {[
                { label: 'โปรตีน', value: macros.proteinG },
                { label: 'คาร์บ', value: macros.carbsG },
                { label: 'ไขมัน', value: macros.fatG },
              ].map((m) => (
                <div key={m.label} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 py-1.5">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
                  <p className="num tabular-nums text-sm font-bold text-slate-700 dark:text-slate-200">{grams(m.value)} ก.</p>
                </div>
              ))}
            </div>
          )}
          <Button onClick={() => { setEditingFood(null); setFoodFormOpen(true) }} className="w-full gap-1.5">
            <Plus className="w-4 h-4" /> บันทึกอาหาร
          </Button>
          <FoodPhotoButton
            date={date}
            onSave={handlePhotoDraftSave}
            onClose={resetPhotoExpense}
            footer={
              <PhotoExpenseFields
                value={{ ...photoExpense, categoryId: photoExpenseCategoryId }}
                onChange={setPhotoExpense}
                categories={foodCats}
                showErrors={photoExpenseErrors}
              />
            }
          />
        </PressCard>

        <PressCard {...cardShadow} className={cardClass}>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-500/15">
              <Droplets className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200">น้ำ</p>
          </div>
          <div className="flex flex-col items-center">
            <FillGauge
              shape="water"
              level={bottle.level}
              onClick={() => handleAddWater(TAP_WATER)}
              label={`ขวดน้ำ ดื่มแล้ว ${formatLitres(drank)} จาก ${formatLitres(waterTarget)} แตะเพื่อดื่ม ${TAP_WATER} มล.`}
              className="h-44 drop-shadow-md"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">แตะขวดเพื่อดื่ม {TAP_WATER} มล.</p>
          </div>
          <div className="text-center space-y-1">
            <p className="num tabular-nums">
              <span className="text-sm text-slate-500 dark:text-slate-400">ดื่มแล้ว </span>
              <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{formatLitres(drank)}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400"> / {formatLitres(waterTarget)} ล.</span>
            </p>
            {bottle.over > 0 ? (
              <span className="inline-block rounded-full bg-sky-600 dark:bg-sky-500 text-white text-xs font-bold px-2 py-0.5">
                +{n(bottle.over)} มล. เกินเป้า
              </span>
            ) : (
              <p className={cn('text-sm', waterLeft <= 0 ? 'text-sky-700 dark:text-sky-400 font-semibold' : 'text-slate-500 dark:text-slate-400')}>
                {waterLeft <= 0 ? 'ดื่มครบเป้าแล้ว' : `อีก ${formatMl(waterLeft)}`}
              </p>
            )}
          </div>
          {extraWater > 0 && (
            <p className="text-xs text-violet-700 dark:text-violet-400">เป้า {formatMl(waterGoal)} + ชดเชยเหงื่อ {formatMl(extraWater)}</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {QUICK_WATER.map((ml) => (
              <Button key={ml} variant="outline" className="gap-1" onClick={() => handleAddWater(ml)}>
                <GlassWater className="w-4 h-4" /> +{ml}
              </Button>
            ))}
            <Button variant="outline" onClick={() => setWaterOpen(true)}>ใส่เอง</Button>
          </div>
        </PressCard>

        <PressCard {...cardShadow} className={cardClass}>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-500/15">
              <Dumbbell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200">ออกกำลัง</p>
          </div>
          <p className="num tabular-nums">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{n(exMinutes)}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400"> นาที · เผาผลาญ {n(burned)} kcal</span>
          </p>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round(progress(weekMins, weeklyTarget) * 100)}%` }} />
          </div>
          <p className={cn('text-sm', weekMins >= weeklyTarget ? 'text-violet-700 dark:text-violet-400 font-semibold' : 'text-slate-500 dark:text-slate-400')}>
            สัปดาห์นี้ {n(weekMins)} / {n(weeklyTarget)} นาที{weekMins >= weeklyTarget ? ' ครบเป้าแล้ว' : ''}
          </p>
          <Button onClick={() => { setEditingExercise(null); setExerciseOpen(true) }} className="w-full gap-1.5">
            <Plus className="w-4 h-4" /> บันทึกการออกกำลัง
          </Button>
        </PressCard>
      </div>

      {dayExercise.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">การออกกำลัง{date === today ? 'วันนี้' : ''}</h3>
          <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 divide-y divide-slate-100 dark:divide-slate-800">
            {dayExercise.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-1.5 pl-1">
                <p className="flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-100 break-words">
                  {e.name} <span className="text-slate-500 dark:text-slate-400">· {e.minutes} นาที</span>
                </p>
                <p className="text-sm num tabular-nums text-slate-500 dark:text-slate-400">{n(e.kcal)} kcal</p>
                <Button variant="ghost" size="icon" aria-label={`แก้ไข ${e.name}`} onClick={() => { setEditingExercise(e); setExerciseOpen(true) }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`ลบ ${e.name}`} onClick={() => setDeletingExercise(e)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">อาหาร{date === today ? 'วันนี้' : ''}</h3>
        {dayFood.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีรายการอาหาร</p>
        ) : (
          MEALS.filter((m) => dayFood.some((e) => e.meal === m.value)).map((m) => (
            <div key={m.value} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="flex items-center justify-between px-1 pb-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{m.label}</p>
                <p className="text-sm font-semibold num tabular-nums text-slate-600 dark:text-slate-300">{n(byMeal[m.value])} kcal</p>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {dayFood.filter((e) => e.meal === m.value).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 py-1.5 pl-1">
                    <p className="flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-100 break-words">{e.name}</p>
                    {e.foodExpenseId && expenseById.has(e.foodExpenseId) && (
                      <Link
                        href={`/transactions?tx=${e.foodExpenseId}`}
                        aria-label={`ดูรายจ่ายของ ${e.name}`}
                        className="text-xs num tabular-nums px-1.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300 hover:underline"
                      >
                        {formatCurrency(expenseById.get(e.foodExpenseId)!.amount)}
                      </Link>
                    )}
                    <p className="text-sm num tabular-nums text-slate-500 dark:text-slate-400">{n(e.kcal)}</p>
                    <Button variant="ghost" size="icon" aria-label={`แก้ไข ${e.name}`} onClick={() => { setEditingFood(e); setFoodFormOpen(true) }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`ลบ ${e.name}`} onClick={() => setDeletingFood(e)}>
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
                  onClick={() => { store.deleteWater(e.id); toast.success('ลบแล้ว') }}
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
          {chartRows.map((row) => {
            const avg = averageOfLogged(week.map(row.value))
            return (
              <div key={row.label} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{row.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
                    {avg === null ? 'ยังไม่มีข้อมูล' : `เฉลี่ยวันละ ${n(avg)} ${row.unit} (นับเฉพาะวันที่บันทึก)`}
                  </p>
                </div>
                <div className="grid grid-cols-7 gap-1.5 items-end h-16">
                  {week.map((d) => {
                    const value = row.value(d)
                    const goal = row.goal(d)
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setDate(d.date)}
                        title={`${formatDayLabel(d.date, today)}: ${n(value)} / ${n(goal)} ${row.unit}`}
                        className="flex h-full flex-col justify-end"
                      >
                        <div className="w-full rounded-t-md bg-slate-100 dark:bg-slate-800 h-full flex items-end overflow-hidden">
                          <div
                            className={cn('w-full', value > goal ? row.over : row.bar, d.date === date ? 'opacity-100' : 'opacity-60')}
                            style={{ height: `${Math.round(progress(value, goal) * 100)}%` }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((d) => (
              <p key={d.date} className={cn('text-center text-xs', d.date === date ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-400')}>
                {shortWeekday(d.date)}
              </p>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            แท่งเต็มช่องเมื่อถึงเป้าของวันนั้น (รวมส่วนที่เพิ่มจากการออกกำลัง) เป้าออกกำลังคือ {sessionTarget} นาทีต่อวัน แตะแท่งเพื่อดูวันนั้น
          </p>
        </div>
      </section>

      <FoodForm open={foodFormOpen} onOpenChange={setFoodFormOpen} date={date} editing={editingFood} history={food} onSubmit={handleFoodSubmit} />
      <ExerciseForm
        open={exerciseOpen}
        onOpenChange={setExerciseOpen}
        date={date}
        editing={editingExercise}
        weightKg={profile?.weightKg ?? null}
        fallbackWeightKg={FALLBACK_WEIGHT_KG}
        onSubmit={handleExerciseSubmit}
      />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} profile={profile} onSubmit={handleProfile} />
      <WaterAmountDialog open={waterOpen} onOpenChange={setWaterOpen} onConfirm={handleAddWater} />
      <GoalsDialog
        open={goalsOpen}
        onOpenChange={setGoalsOpen}
        calorieGoal={calorieGoal}
        waterGoal={waterGoal}
        onConfirm={(k, w) => { store.setGoals(k, w); setGoalsOpen(false); toast.success('บันทึกเป้าหมายแล้ว') }}
      />
      <ConfirmDialog
        open={!!deletingFood}
        onOpenChange={(open) => { if (!open) setDeletingFood(null) }}
        title="ลบรายการอาหาร"
        description={`ลบ "${deletingFood?.name ?? ''}" ออกจากบันทึก`}
        onConfirm={() => {
          if (deletingFood) store.deleteFood(deletingFood.id)
          setDeletingFood(null)
          toast.success('ลบแล้ว')
        }}
        confirmLabel="ลบ"
      />
      <ConfirmDialog
        open={!!deletingExercise}
        onOpenChange={(open) => { if (!open) setDeletingExercise(null) }}
        title="ลบการออกกำลัง"
        description={`ลบ "${deletingExercise?.name ?? ''}" ออกจากบันทึก เป้าแคลอรี่และน้ำของวันนั้นจะลดลงตาม`}
        onConfirm={() => {
          if (deletingExercise) store.deleteExercise(deletingExercise.id)
          setDeletingExercise(null)
          toast.success('ลบแล้ว')
        }}
        confirmLabel="ลบ"
      />
    </div>
  )
}
