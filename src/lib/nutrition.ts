import type { FoodEntry, MealType, WaterEntry } from '@/types'
import { addDays } from '@/lib/supplies'
import { formatCurrency } from '@/lib/utils'

export const MEALS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'มื้อเช้า' },
  { value: 'lunch', label: 'มื้อกลางวัน' },
  { value: 'dinner', label: 'มื้อเย็น' },
  { value: 'snack', label: 'ของว่าง' },
]

export const DEFAULT_CALORIE_GOAL = 2000
export const DEFAULT_WATER_GOAL = 2000

/** The meal someone is most likely logging at this hour. */
export function mealForHour(hour: number): MealType {
  if (hour >= 4 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 17 && hour < 22) return 'dinner'
  return 'snack'
}

/** Food Entries linked to a Food Expense. */
export function foodForExpense(entries: FoodEntry[], foodExpenseId: string): FoodEntry[] {
  return entries.filter((e) => e.foodExpenseId === foodExpenseId)
}

/**
 * The ฿ badge on a Food Entry linked to a Food Expense: the whole bill, plus
 * how many dishes it covers when it covers more than one ("฿180 · 3 จาน").
 */
export function expenseBadgeLabel(
  amount: number,
  dishCount: number,
  formatAmount: (amount: number) => string = formatCurrency,
): string {
  const bill = formatAmount(amount)
  return dishCount > 1 ? `${bill} · ${dishCount} จาน` : bill
}

/** Total kcal of the Food Entries linked to a Food Expense (its kcal badge). */
export function kcalForExpense(entries: FoodEntry[], foodExpenseId: string): number {
  return foodForExpense(entries, foodExpenseId).reduce((sum, e) => sum + e.kcal, 0)
}

/** kcal badge per Food Expense id, for a list of expenses. */
export function kcalByExpenseId(entries: FoodEntry[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const e of entries) {
    if (e.foodExpenseId) totals.set(e.foodExpenseId, (totals.get(e.foodExpenseId) ?? 0) + e.kcal)
  }
  return totals
}

/** A Food Entry row being typed into a form, before it is saved. */
export interface FoodDraft {
  key: string
  name: string
  kcal: string
  meal: MealType
  /** Macros carried over from a Photo Draft (not typed in the expense form). */
  proteinG?: number
  carbsG?: number
  fatG?: number
}

type FoodDraftInput = Pick<FoodEntry, 'date' | 'meal' | 'name' | 'kcal' | 'proteinG' | 'carbsG' | 'fatG'>

const MACRO_KEYS = ['proteinG', 'carbsG', 'fatG'] as const

function macrosOf(source: Partial<Record<(typeof MACRO_KEYS)[number], number>>) {
  const out: Partial<Record<(typeof MACRO_KEYS)[number], number>> = {}
  for (const k of MACRO_KEYS) if (source[k] !== undefined) out[k] = source[k]
  return out
}

export function newFoodDraft(now: Date = new Date()): FoodDraft {
  return { key: crypto.randomUUID(), name: '', kcal: '', meal: mealForHour(now.getHours()) }
}

/** Food Entry inputs (e.g. the ticked rows of a Photo Draft) → rows in the expense form, macros kept. */
export function foodDraftsFromInputs(inputs: FoodDraftInput[]): FoodDraft[] {
  return inputs.map((input) => ({
    key: crypto.randomUUID(),
    name: input.name,
    kcal: String(input.kcal),
    meal: input.meal,
    ...macrosOf(input),
  }))
}

/** Typed rows → Food Entry inputs for `date`. Rows without a name are skipped; a blank kcal counts as 0. */
export function foodInputsFromDrafts(drafts: FoodDraft[], date: string): FoodDraftInput[] {
  return drafts.flatMap((d) => {
    const name = d.name.trim().replace(/\s+/g, ' ')
    if (!name) return []
    const kcal = Math.max(0, Math.round(Number(d.kcal) || 0))
    return [{ date, meal: d.meal, name, kcal, ...macrosOf(d) }]
  })
}

export function kcalOn(entries: FoodEntry[], date: string): number {
  return entries.reduce((sum, e) => (e.date === date ? sum + e.kcal : sum), 0)
}

export interface MacroTotals {
  proteinG: number
  carbsG: number
  fatG: number
  /** Food Entries of the day that have at least one macro filled in. */
  entriesWithMacros: number
}

/** Day totals of protein, carbs and fat; blank fields count as nothing. */
export function macrosOn(entries: FoodEntry[], date: string): MacroTotals {
  const totals: MacroTotals = { proteinG: 0, carbsG: 0, fatG: 0, entriesWithMacros: 0 }
  for (const e of entries) {
    if (e.date !== date) continue
    if (e.proteinG === undefined && e.carbsG === undefined && e.fatG === undefined) continue
    totals.proteinG += e.proteinG ?? 0
    totals.carbsG += e.carbsG ?? 0
    totals.fatG += e.fatG ?? 0
    totals.entriesWithMacros++
  }
  return totals
}

export function waterOn(entries: WaterEntry[], date: string): number {
  return entries.reduce((sum, e) => (e.date === date ? sum + e.ml : sum), 0)
}

export function kcalByMeal(entries: FoodEntry[], date: string): Record<MealType, number> {
  const totals: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  for (const e of entries) if (e.date === date) totals[e.meal] += e.kcal
  return totals
}

/** Share of the goal reached, capped at 1 for progress bars. */
export function progress(value: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(1, Math.max(0, value / goal))
}

export interface DayTotal {
  date: string
  kcal: number
  water: number
}

/** Totals for the `days` days ending on `endDate`, oldest first. */
export function recentDays(food: FoodEntry[], water: WaterEntry[], endDate: string, days = 7): DayTotal[] {
  const out: DayTotal[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i)
    out.push({ date, kcal: kcalOn(food, date), water: waterOn(water, date) })
  }
  return out
}

/** Average over days that have any record, so empty days don't drag it to zero. */
export function averageOfLogged(values: number[]): number | null {
  const logged = values.filter((v) => v > 0)
  if (logged.length === 0) return null
  return Math.round(logged.reduce((a, b) => a + b, 0) / logged.length)
}

/** Latest calories recorded for a food name, to prefill the form. */
export function lastKcalFor(entries: FoodEntry[], name: string): number | undefined {
  const key = name.trim().toLocaleLowerCase('th-TH')
  if (!key) return undefined
  let latest: FoodEntry | undefined
  for (const e of entries) {
    if (e.name.trim().toLocaleLowerCase('th-TH') !== key) continue
    if (!latest || e.createdAt > latest.createdAt) latest = e
  }
  return latest?.kcal
}

/** Distinct food names, most recently logged first. */
export function recentFoodNames(entries: FoodEntry[], limit = 30): string[] {
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const seen = new Set<string>()
  const names: string[] = []
  for (const e of sorted) {
    const key = e.name.trim().toLocaleLowerCase('th-TH')
    if (seen.has(key)) continue
    seen.add(key)
    names.push(e.name)
    if (names.length >= limit) break
  }
  return names
}

/**
 * Water Bottle reading for a day: `level` is how full the bottle still is (1 = nothing drunk,
 * 0 = Water Target reached), `over` is how much was drunk past the target. A target of 0 draws
 * an empty bottle.
 */
export function waterBottle(drank: number, target: number): { level: number; over: number } {
  const over = Math.max(0, drank - Math.max(0, target))
  if (!(target > 0)) return { level: 0, over }
  return { level: Math.min(1, Math.max(0, 1 - drank / target)), over }
}

export function formatMl(ml: number): string {
  return ml >= 1000 ? `${(ml / 1000).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ลิตร` : `${ml.toLocaleString('th-TH')} มล.`
}
