export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

export type TransferKind = 'investment_buy' | 'investment_sell' | 'internal_transfer'

export interface Category {
  id: string
  name: string
  type: TransactionType
  icon: string
  color: string
  isDefault: boolean
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

export type RecurringFrequency = 'monthly' | 'yearly'

export interface RecurringTransaction {
  id: string
  categoryId: string
  type: TransactionType
  amount: number
  description: string
  note?: string
  frequency: RecurringFrequency
  dayOfMonth: number // 1-28
  startDate: string  // ISO date — เริ่มสร้างตั้งแต่เดือนนี้
  lastGeneratedDate?: string // ISO date ของ transaction ล่าสุดที่สร้าง
  isActive: boolean
  createdAt: string
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

export type {
  CyclePhase,
  CycleSettings,
  CyclePeriodLog,
  CurrentCycleInfo,
} from './cycle'
