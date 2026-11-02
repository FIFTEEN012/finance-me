import { describe, it, expect } from 'vitest'
import { mergeStoreData, SYNC_STORE_KEYS } from './cloudSync'

describe('cloudSync - mergeStoreData', () => {
  it('merges transactions from local that are not yet in cloud without duplicates', () => {
    const localData = {
      state: {
        transactions: [
          { id: 'tx-1', amount: 100, description: 'Coffee', date: '2026-09-08' },
          { id: 'tx-2', amount: 50, description: 'Snack', date: '2026-09-08' },
        ],
      },
      version: 0,
    }

    const cloudData = {
      state: {
        transactions: [
          { id: 'tx-1', amount: 100, description: 'Coffee', date: '2026-09-08' },
          { id: 'tx-3', amount: 500, description: 'Salary', date: '2026-09-01' },
        ],
      },
      version: 0,
    }

    const merged = mergeStoreData('finance-transactions', localData, cloudData)

    expect(merged.state.transactions).toHaveLength(3)
    const ids = merged.state.transactions.map((t: any) => t.id)
    expect(ids).toContain('tx-1')
    expect(ids).toContain('tx-2')
    expect(ids).toContain('tx-3')
  })

  it('preserves all local items if cloud has empty array', () => {
    const localData = {
      state: {
        transactions: [
          { id: 'tx-1', amount: 100, description: 'Coffee', date: '2026-09-08' },
        ],
      },
      version: 0,
    }

    const cloudData = {
      state: {
        transactions: [],
      },
      version: 0,
    }

    const merged = mergeStoreData('finance-transactions', localData, cloudData)
    expect(merged.state.transactions).toHaveLength(1)
    expect(merged.state.transactions[0].id).toBe('tx-1')
  })

  it('merges other stores such as budgets and goals by id', () => {
    const localBudgets = {
      state: {
        budgets: [{ id: 'b-1', name: 'Food', amount: 5000 }],
      },
      version: 0,
    }
    const cloudBudgets = {
      state: {
        budgets: [{ id: 'b-2', name: 'Transport', amount: 2000 }],
      },
      version: 0,
    }

    const merged = mergeStoreData('finance-budgets', localBudgets, cloudBudgets)
    expect(merged.state.budgets).toHaveLength(2)
    const ids = merged.state.budgets.map((b: any) => b.id)
    expect(ids).toEqual(['b-2', 'b-1'])
  })
})

describe('cloudSync - SYNC_STORE_KEYS', () => {
  it('does not sync the removed cycle store', () => {
    expect(SYNC_STORE_KEYS as readonly string[]).not.toContain('finance-cycle')
  })
})
