import { describe, it, expect, beforeEach } from 'vitest'
import { useDebtStore } from './useDebtStore'
import { useTransactionStore } from './useTransactionStore'

describe('useDebtStore', () => {
  beforeEach(() => {
    useDebtStore.setState({ debts: [] })
    useTransactionStore.setState({ transactions: [] })
  })

  it('adds an I_OWE debt and computes totals', () => {
    const debt = useDebtStore.getState().addDebt({
      personName: 'สมชาย',
      type: 'I_OWE',
      category: 'person',
      totalAmount: 5000,
      startDate: '2026-09-01',
      dueDate: '2026-09-30',
      note: 'ยืมมาซื้อของ',
    })

    expect(debt.id).toBeDefined()
    expect(debt.personName).toBe('สมชาย')
    expect(debt.totalAmount).toBe(5000)
    expect(debt.paidAmount).toBe(0)
    expect(debt.isSettled).toBe(false)

    expect(useDebtStore.getState().getTotalIOwe()).toBe(5000)
    expect(useDebtStore.getState().getTotalOwedToMe()).toBe(0)
    expect(useDebtStore.getState().getNetDebt()).toBe(-5000)
  })

  it('adds an OWED_TO_ME debt and computes net debt positively', () => {
    useDebtStore.getState().addDebt({
      personName: 'สมศรี',
      type: 'OWED_TO_ME',
      category: 'friend' as any,
      totalAmount: 3000,
      startDate: '2026-09-02',
    })

    expect(useDebtStore.getState().getTotalIOwe()).toBe(0)
    expect(useDebtStore.getState().getTotalOwedToMe()).toBe(3000)
    expect(useDebtStore.getState().getNetDebt()).toBe(3000)
  })

  it('creates an initial transaction when requested', () => {
    useDebtStore.getState().addDebt(
      {
        personName: 'เพื่อนเอ',
        type: 'OWED_TO_ME',
        category: 'person',
        totalAmount: 1500,
        startDate: '2026-09-05',
      },
      { create: true }
    )

    const txs = useTransactionStore.getState().transactions
    expect(txs.length).toBe(1)
    expect(txs[0].type).toBe('EXPENSE')
    expect(txs[0].amount).toBe(1500)
    expect(txs[0].description).toContain('ให้ยืมเงิน: เพื่อนเอ')
  })

  it('handles partial repayment and settles when paid in full', () => {
    const debt = useDebtStore.getState().addDebt({
      personName: 'พี่วิน',
      type: 'I_OWE',
      category: 'person',
      totalAmount: 2000,
      startDate: '2026-09-01',
    })

    // First partial payment
    useDebtStore.getState().addPayment(debt.id, {
      amount: 800,
      date: '2026-09-10',
      note: 'งวดที่ 1',
    })

    let updated = useDebtStore.getState().getDebtById(debt.id)!
    expect(updated.paidAmount).toBe(800)
    expect(updated.isSettled).toBe(false)
    expect(updated.payments.length).toBe(1)
    expect(useDebtStore.getState().getTotalIOwe()).toBe(1200)

    // Second payment to clear full amount
    useDebtStore.getState().addPayment(debt.id, {
      amount: 1200,
      date: '2026-09-20',
      note: 'งวดปิดยอด',
    })

    updated = useDebtStore.getState().getDebtById(debt.id)!
    expect(updated.paidAmount).toBe(2000)
    expect(updated.isSettled).toBe(true)
    expect(updated.payments.length).toBe(2)
    expect(useDebtStore.getState().getTotalIOwe()).toBe(0)
    expect(useDebtStore.getState().getTotalCleared()).toBe(2000)
  })

  it('creates transaction when repayment is made', () => {
    const debt = useDebtStore.getState().addDebt({
      personName: 'น้องบี',
      type: 'OWED_TO_ME',
      category: 'person',
      totalAmount: 1000,
      startDate: '2026-09-01',
    })

    useDebtStore.getState().addPayment(debt.id, {
      amount: 1000,
      date: '2026-09-05',
      note: 'คืนครบ',
      createTransaction: true,
    })

    const txs = useTransactionStore.getState().transactions
    expect(txs.length).toBe(1)
    expect(txs[0].type).toBe('INCOME')
    expect(txs[0].amount).toBe(1000)
    expect(txs[0].description).toContain('รับคืนเงินจาก: น้องบี')
  })

  it('deletes a payment and reopens the debt', () => {
    const debt = useDebtStore.getState().addDebt({
      personName: 'สมชาย',
      type: 'I_OWE',
      category: 'person',
      totalAmount: 1000,
      startDate: '2026-09-01',
    })

    useDebtStore.getState().addPayment(debt.id, {
      amount: 1000,
      date: '2026-09-02',
    })

    let current = useDebtStore.getState().getDebtById(debt.id)!
    expect(current.isSettled).toBe(true)

    const paymentId = current.payments[0].id
    useDebtStore.getState().deletePayment(debt.id, paymentId)

    current = useDebtStore.getState().getDebtById(debt.id)!
    expect(current.paidAmount).toBe(0)
    expect(current.isSettled).toBe(false)
    expect(current.payments.length).toBe(0)
    expect(useDebtStore.getState().getTotalIOwe()).toBe(1000)
  })

  it('deletes a debt item', () => {
    const debt = useDebtStore.getState().addDebt({
      personName: 'สมชาย',
      type: 'I_OWE',
      category: 'person',
      totalAmount: 1000,
      startDate: '2026-09-01',
    })

    useDebtStore.getState().deleteDebt(debt.id)
    expect(useDebtStore.getState().debts.length).toBe(0)
  })
})
