'use client'

export async function migrateLocalDataToNeon(): Promise<{
  ok: boolean
  count?: number
  error?: string
}> {
  try {
    const rawTx = localStorage.getItem('finance-transactions')
    const rawCat = localStorage.getItem('finance-categories')
    const rawBudgets = localStorage.getItem('finance-budgets')
    const rawGoals = localStorage.getItem('finance-goals')
    const rawDebts = localStorage.getItem('finance-debts')

    const transactions = rawTx ? JSON.parse(rawTx)?.state?.transactions || [] : []
    const categories = rawCat ? JSON.parse(rawCat)?.state?.categories || [] : []
    const budgets = rawBudgets ? JSON.parse(rawBudgets)?.state?.budgets || [] : []
    const goals = rawGoals ? JSON.parse(rawGoals)?.state?.goals || [] : []
    const debts = rawDebts ? JSON.parse(rawDebts)?.state?.debts || [] : []

    const res = await fetch('/api/migrate/import-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions, categories, budgets, goals, debts }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.error || 'Failed to import data' }
    }

    const data = await res.json()
    localStorage.setItem('finance-migrated-to-neon', 'true')
    return { ok: true, count: data.imported?.transactions || 0 }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error importing' }
  }
}
