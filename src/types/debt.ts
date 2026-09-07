export type DebtType = 'I_OWE' | 'OWED_TO_ME'

export type DebtCategory = 'person' | 'credit_card' | 'loan' | 'family' | 'other'

export interface DebtPayment {
  id: string
  debtId: string
  amount: number
  date: string // YYYY-MM-DD
  note?: string
  transactionId?: string
  createdAt: string
}

export interface DebtItem {
  id: string
  personName: string
  type: DebtType
  category: DebtCategory
  totalAmount: number
  paidAmount: number
  startDate: string // YYYY-MM-DD
  dueDate?: string // YYYY-MM-DD
  note?: string
  color: string
  isSettled: boolean
  payments: DebtPayment[]
  initialTransactionId?: string
  createdAt: string
  updatedAt: string
}
