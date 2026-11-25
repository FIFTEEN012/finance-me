import { z } from 'zod'
import type { MealType } from '@/types'
import type { FoodInput } from '@/store/useNutritionStore'

export const foodPhotoConfidences = ['low', 'medium', 'high'] as const
export type FoodPhotoConfidence = (typeof foodPhotoConfidences)[number]

const nullableGrams = z.number().finite().nonnegative().max(1000).nullable()

/** One food the AI suggests from a photo. */
export const foodPhotoItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  portion: z.string().trim().max(60),
  kcal: z.number().finite().nonnegative().max(10000),
  proteinG: nullableGrams,
  carbsG: nullableGrams,
  fatG: nullableGrams,
  confidence: z.enum(foodPhotoConfidences),
})
export type FoodPhotoItem = z.infer<typeof foodPhotoItemSchema>

export const MAX_FOOD_PHOTO_ITEMS = 20

export interface FoodPhotoResult {
  items: FoodPhotoItem[]
}

/** Keeps only the items that fit the schema; anything that is not a list of items reads as empty. */
export function foodPhotoItemsFrom(raw: unknown): FoodPhotoItem[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
    ? (raw as { items: unknown[] }).items
    : []
  const items: FoodPhotoItem[] = []
  for (const candidate of list) {
    const parsed = foodPhotoItemSchema.safeParse(candidate)
    if (parsed.success) items.push(parsed.data)
    if (items.length >= MAX_FOOD_PHOTO_ITEMS) break
  }
  return items
}

/** A Photo Draft row: a suggested item the user can edit and tick before saving. */
export interface PhotoDraftRow {
  key: string
  included: boolean
  name: string
  portion: string
  kcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  meal: MealType
  confidence: FoodPhotoConfidence
}

export function photoDraftRows(items: FoodPhotoItem[], meal: MealType, makeKey: () => string = () => crypto.randomUUID()): PhotoDraftRow[] {
  return items.map((item) => ({
    key: makeKey(),
    included: true,
    name: item.name,
    portion: item.portion,
    kcal: Math.round(item.kcal),
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    meal,
    confidence: item.confidence,
  }))
}

/** A ticked row can be saved once it has a name and a non-negative kcal. */
export function photoDraftRowIsValid(row: PhotoDraftRow): boolean {
  return row.name.trim().length > 0 && row.kcal !== null && Number.isFinite(row.kcal) && row.kcal >= 0 && row.kcal <= 20000
}

const macro = (value: number | null) => (value === null || !Number.isFinite(value) || value < 0 ? undefined : value)

/** The Food Entries to save from a Photo Draft: only ticked rows, with their macros. */
export function foodInputsFromDraft(rows: PhotoDraftRow[], date: string): FoodInput[] {
  return rows
    .filter((row) => row.included && photoDraftRowIsValid(row))
    .map((row) => ({
      date,
      meal: row.meal,
      name: row.name.trim(),
      kcal: Math.round(row.kcal as number),
      proteinG: macro(row.proteinG),
      carbsG: macro(row.carbsG),
      fatG: macro(row.fatG),
    }))
}
