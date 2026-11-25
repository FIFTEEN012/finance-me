import { SupplyItem, SupplyShape } from '@/types'

/** The fixed list of Supply Shapes, in picker order. */
export const SUPPLY_SHAPES: { value: SupplyShape; label: string }[] = [
  { value: 'bottle', label: 'ขวด' },
  { value: 'tube', label: 'หลอด' },
  { value: 'bag', label: 'ถุง' },
  { value: 'box', label: 'กล่อง' },
  { value: 'roll', label: 'ม้วน' },
  { value: 'can', label: 'กระป๋อง' },
  { value: 'sachet', label: 'ซอง' },
]

// Checked in order, so the more specific words come first (ครีมกันแดด is a tube, other ครีม a bottle).
const SHAPE_KEYWORDS: [SupplyShape, string[]][] = [
  ['tube', ['ยาสีฟัน', 'โฟม', 'เจล', 'ครีมกันแดด', 'หลอด', 'toothpaste', 'sunscreen', 'foam', 'gel', 'tube']],
  ['roll', ['กระดาษชำระ', 'ทิชชู่ม้วน', 'ม้วน', 'ฟอยล์', 'แรป', 'toilet paper', 'paper towel', 'foil', 'wrap', 'roll']],
  ['box', ['กล่อง', 'ทิชชู่', 'ซีเรียล', 'นมกล่อง', 'tissue', 'cereal', 'box']],
  ['bag', ['ข้าว', 'ผงซักฟอก', 'อาหารแมว', 'อาหารหมา', 'น้ำตาล', 'ถุง', 'rice', 'detergent', 'cat food', 'dog food', 'sugar', 'bag']],
  ['can', ['กระป๋อง', 'สเปรย์', 'กาแฟ', 'นมผง', 'spray', 'coffee', 'formula', 'can']],
  ['sachet', ['ซอง', 'ผงชง', 'มาส์ก', 'sachet', 'mask', 'packet']],
  ['bottle', ['แชมพู', 'ครีม', 'สบู่', 'น้ำยา', 'โลชั่น', 'ขวด', 'ซอส', 'น้ำปลา', 'น้ำมัน', 'shampoo', 'conditioner', 'soap', 'lotion', 'cream', 'sauce', 'oil', 'bottle']],
]

/** Guess the Supply Shape from a name. */
export function guessShape(name: string): SupplyShape {
  const n = name.toLocaleLowerCase('th-TH')
  for (const [shape, words] of SHAPE_KEYWORDS) if (words.some((w) => containsKeyword(n, w))) return shape
  return 'bottle'
}

/** The shape to draw `item` as; items saved before shapes existed get a guess from the name. */
export function supplyShape(item: SupplyItem): SupplyShape {
  return item.shape ?? guessShape(item.name)
}

// Thai is written without spaces, so a Thai keyword matches anywhere. An English one must be
// a whole word (plurals allowed), or "can" would match "canola".
function containsKeyword(name: string, word: string): boolean {
  if (!/^[a-z ]+$/.test(word)) return name.includes(word)
  return new RegExp(`(^|[^a-z])${word}(e?s)?($|[^a-z])`).test(name)
}

const DAY_MS =24 * 60 * 60 * 1000

function toUtc(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Whole calendar days from `from` to `to`, both YYYY-MM-DD. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

export function addDays(date: string, days: number): string {
  const d = new Date(toUtc(date) + days * DAY_MS)
  return d.toISOString().slice(0, 10)
}

/** Items with the same name, ignoring case and extra spaces, count as one product. */
export function productKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('th-TH')
}

/** Days an item lasted, or has been in use so far when it is not finished. */
export function usageDays(item: SupplyItem, today: string): number {
  return Math.max(0, daysBetween(item.startDate, item.finishedDate ?? today))
}

/** Average days of the finished items of this product, other than `item` itself. */
export function averageLifespan(item: SupplyItem, items: SupplyItem[]): { averageDays: number; samples: number } | null {
  const key = productKey(item.name)
  const durations = items
    .filter((other) => other.id !== item.id && other.finishedDate && productKey(other.name) === key)
    .map((other) => usageDays(other, other.finishedDate as string))

  if (durations.length === 0) return null
  const total = durations.reduce((sum, d) => sum + d, 0)
  return { averageDays: total / durations.length, samples: durations.length }
}

export interface SupplyForecast {
  elapsedDays: number
  averageDays: number
  samples: number
  expectedEndDate: string
  /** Share of the usual lifespan already used, 0 to 1. */
  progress: number
  /** Days past the usual lifespan, 0 while it is still within it. */
  overdueDays: number
}

export function forecast(item: SupplyItem, items: SupplyItem[], today: string): SupplyForecast | null {
  const history = averageLifespan(item, items)
  if (!history) return null

  const elapsedDays = usageDays(item, today)
  const rounded = Math.max(1, Math.round(history.averageDays))
  return {
    elapsedDays,
    averageDays: history.averageDays,
    samples: history.samples,
    expectedEndDate: addDays(item.startDate, rounded),
    progress: Math.min(1, elapsedDays / rounded),
    overdueDays: Math.max(0, elapsedDays - rounded),
  }
}

export interface SupplyRemaining {
  /** Share left, 1 full to 0 empty; null while the Usual Lifespan is unknown. */
  level: number | null
  /** In use for the whole Usual Lifespan or longer. */
  needsRestock: boolean
}

/** How much of `item` is estimated to be left (GLOSSARY: Remaining). */
export function remaining(item: SupplyItem, items: SupplyItem[], today: string): SupplyRemaining {
  const lifespan = averageLifespan(item, items)?.averageDays ?? item.expectedDays
  if (!lifespan) return { level: null, needsRestock: false }

  const elapsed = usageDays(item, today)
  return { level: Math.max(0, 1 - elapsed / lifespan), needsRestock: elapsed >= lifespan }
}

/** Cost and amount used per day. A same-day finish counts as one day. */
export function dailyUsage(item: SupplyItem, today: string): { costPerDay?: number; quantityPerDay?: number } {
  const days = Math.max(1, usageDays(item, today))
  return {
    costPerDay: item.price ? item.price / days : undefined,
    quantityPerDay: item.quantity ? item.quantity / days : undefined,
  }
}

function trimNumber(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '')
}

export function formatDuration(days: number): string {
  const whole = Math.round(days)
  if (whole <= 0) return 'ไม่ถึง 1 วัน'
  if (whole < 30) return `${whole} วัน`
  if (whole < 365) return `${whole} วัน (ราว ${trimNumber(whole / 30)} เดือน)`
  return `${whole} วัน (ราว ${trimNumber(whole / 365)} ปี)`
}

export function formatAmount(n: number): string {
  if (n >= 10) return Math.round(n).toLocaleString('th-TH')
  if (n >= 1) return trimNumber(n)
  return n.toFixed(2).replace(/\.?0+$/, '') || '0'
}
