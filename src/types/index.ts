export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

export type TransferKind = 'investment_buy' | 'investment_sell' | 'internal_transfer'

export interface Category {
  id: string
  name: string
  type: TransactionType
  icon: string
  color: string
  isDefault: boolean
  /** Expense only. Absent = not set yet; use isFoodCategory() to read. */
  isFood?: boolean
}

export interface Transaction {
  id: string
  categoryId: string
  type: TransactionType
  amount: number
  description: string
  note?: string
  tags?: string[]
  linkedInvestmentOrderId?: string
  transferKind?: TransferKind
  date: string
  createdAt: string
}

export interface Budget {
  id: string
  categoryId: string
  amount: number
  month: number
  year: number
  allowRollover?: boolean
}

export type NetWorthItemType = 'ASSET' | 'LIABILITY'

export interface NetWorthItem {
  id: string
  name: string
  type: NetWorthItemType
  amount: number        // มูลค่าปัจจุบัน (asset) หรือยอดค้างชำระ (liability)
  category: string      // เช่น savings, investment, property, loan, credit
  icon: string
  color: string
  note?: string
  updatedAt: string
  createdAt: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  targetDate: string   // ISO date
  description?: string
  icon: string
  color: string
  createdAt: string
  milestonesCelebrated?: number[]  // percentages already celebrated e.g. [25, 50]
  /** If true, savedAmount auto-syncs from investment portfolio value (THB) */
  linkedPortfolio?: boolean
}

export interface NetWorthSnapshot {
  date: string          // YYYY-MM-DD
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}

export type {
  DebtType,
  DebtCategory,
  DebtPayment,
  DebtItem,
} from './debt'

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
  id: string
  categoryId: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  note?: string
  frequency: RecurringFrequency
  startDate: string  // YYYY-MM-DD — วันแรกที่บันทึก และเป็นตัวกำหนดรอบถัดไป
  lastGeneratedDate?: string // YYYY-MM-DD ของรอบล่าสุดที่บันทึกแล้ว
  isActive: boolean
  createdAt: string
}

export interface SupplyItem {
  id: string
  name: string
  startDate: string     // YYYY-MM-DD — วันที่ซื้อหรือเริ่มใช้
  finishedDate?: string // YYYY-MM-DD — วันที่ใช้หมด
  price?: number
  quantity?: number     // ปริมาณต่อชิ้น เช่น 200
  unit?: string         // หน่วยของ quantity เช่น ml
  note?: string
  /** Absent on items saved before shapes existed; guess it from the name. */
  shape?: SupplyShape
  /** The user's own guess at how many days it lasts, used until the Product has history. */
  expectedDays?: number
  createdAt: string
}

/** The physical form a Supply is drawn as (GLOSSARY: Supply Shape). */
export type SupplyShape = 'bottle' | 'tube' | 'bag' | 'box' | 'roll' | 'can' | 'sachet'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface FoodEntry {
  id: string
  date: string      // YYYY-MM-DD
  meal: MealType
  name: string
  kcal: number
  // Grams; optional, absent on entries saved before macros existed.
  proteinG?: number
  carbsG?: number
  fatG?: number
  /** Id of the Food Expense (expense Transaction) this entry was bought with, if any. */
  foodExpenseId?: string
  createdAt: string
}

export interface WaterEntry {
  id: string
  date: string      // YYYY-MM-DD
  ml: number
  createdAt: string
}

export interface ExerciseEntry {
  id: string
  date: string      // YYYY-MM-DD
  activity: string  // key from EXERCISES, or 'other'
  name: string      // shown label, free text for 'other'
  minutes: number
  kcal: number      // estimated or typed calories burned
  createdAt: string
  /** Moves done in this Workout Session; absent for a quick log such as "run 30 min". */
  moves?: SessionMove[]
  /** Format of the Workout Plan this session was done from; absent for a quick log or an older session. */
  planFormat?: PlanFormat
}

/** One Move as done in a Workout Session. */
export interface SessionMove {
  moveId: string    // Move.id from @/lib/moves
  sets: number      // sets completed
  count: number     // reps or seconds per set, read with the Move's countMode
  /** Rest after each set as the plan had it; absent on sessions logged before it was kept. */
  restSeconds?: number
}

/** One Move in a Workout Plan, with the sets, reps/seconds and rest intended. */
export interface PlanMove {
  moveId: string
  sets: number
  count: number
  restSeconds: number
}

/**
 * How a Workout Plan's main Moves are done: 'straight' does each Move's sets
 * back to back; 'circuit' does every main Move once per round, set n of each
 * Move in round n. Warm-up and cool-down Moves are done once, outside the rounds.
 */
export type PlanFormat = 'straight' | 'circuit'

/** The Moves intended for a session; finishing it logs a Workout Session of `activity`. */
export interface WorkoutPlan {
  activity: string  // Session Type key from EXERCISES; sets the MET for kcal
  moves: PlanMove[]
  /** Absent on plans saved before formats existed: read as 'straight'. */
  format?: PlanFormat
}

export type Sex = 'male' | 'female'
export type DailyActivity = 'sedentary' | 'light' | 'active' | 'very_active'
export type BodyGoal = 'lose' | 'maintain' | 'gain'

export interface HealthProfile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: DailyActivity
  goal: BodyGoal
  updatedAt: string
}

export type AssetClass = 'stock' | 'mutual_fund' | 'etf' | 'crypto' | 'bond' | 'other'

export interface PortfolioSnapshot {
  date: string         // YYYY-MM-DD
  totalValueTHB: number
  totalCostTHB: number
}

export interface DividendRecord {
  id: string
  holdingId: string
  amountPerUnit: number
  totalAmount: number
  date: string         // YYYY-MM-DD
  note?: string
  createdAt: string
}

export interface InvestmentOrder {
  id: string
  holdingId: string
  transactionId: string
  feeTransactionId?: string
  type: 'BUY'
  units: number
  pricePerUnit: number
  fee: number
  currency: string
  date: string
  note?: string
  createdAt: string
}

/** Monthly lump-sum expense record per category — for tracking variable monthly spending */
export interface MonthlyExpenseLog {
  id: string
  categoryId: string
  year: number
  month: number   // 1-12
  amount: number
  note?: string
  createdAt: string
}

export type BillSplitMode = 'equal' | 'custom' | 'percentage'

export interface BillParticipant {
  id: string
  name: string
  share: number   // จำนวนเงินที่ต้องจ่าย (THB หรือสกุลที่เลือก)
  paid: boolean   // จ่ายคืนแล้วหรือยัง
}

export interface BillSplit {
  id: string
  title: string
  totalAmount: number
  currency: string
  date: string           // YYYY-MM-DD
  paidBy: string         // ชื่อคนที่จ่ายบิล (ถ้าจ่ายเองใช้ "ฉัน")
  splitMode: BillSplitMode
  participants: BillParticipant[]
  note?: string
  createdAt: string
}

export type BankAccountType =
  | 'savings'        // บัญชีออมทรัพย์
  | 'current'        // บัญชีกระแสรายวัน
  | 'fixed_deposit'  // บัญชีฝากประจำ
  | 'e_wallet'       // กระเป๋าเงินอิเล็กทรอนิกส์
  | 'credit_card'    // บัตรเครดิต (ยอดเงินใช้ได้)
  | 'other'

export interface BankAccount {
  id: string
  bankName: string           // 'SCB' | 'KBank' | 'BBL' | ...
  accountName: string        // ชื่อบัญชี/ชื่อเล่น เช่น "บัญชีหลัก"
  accountNumberLast4?: string // 4 ตัวท้าย เช่น "1234"
  type: BankAccountType
  balance: number
  currency: string           // 'THB' | 'USD' | ...
  color: string
  emoji: string              // bank emoji / logo
  note?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SubscriptionBillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionCategory =
  | 'entertainment'
  | 'productivity'
  | 'cloud'
  | 'health'
  | 'gaming'
  | 'news'
  | 'food'
  | 'transport'
  | 'other'

export interface Subscription {
  id: string
  name: string
  emoji: string                         // e.g. "🎬"
  amount: number
  currency: string                      // 'THB' | 'USD' | ...
  billingCycle: SubscriptionBillingCycle
  nextBillingDate: string               // YYYY-MM-DD
  category: SubscriptionCategory
  color: string
  active: boolean
  note?: string
  website?: string
  createdAt: string
}

export interface InvestmentHolding {
  id: string
  name: string           // ชื่อหลักทรัพย์
  ticker?: string        // ตัวย่อ เช่น PTT, BTC
  assetClass: AssetClass
  units: number          // จำนวนหน่วย/หุ้น
  currency: string      // สกุลเงิน เช่น 'THB', 'USD', 'SGD'
  avgCostPerUnit: number // ราคาต้นทุนเฉลี่ยต่อหน่วย (ในสกุลเงินที่เลือก)
  currentPricePerUnit: number  // ราคาปัจจุบันต่อหน่วย (ในสกุลเงินที่เลือก)
  color: string
  note?: string
  lastPriceUpdate: string  // ISO date
  createdAt: string
}
