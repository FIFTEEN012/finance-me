import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockDb = { insert: vi.fn() }
vi.mock('@/db/client', () => ({ getDatabase: vi.fn(() => mockDb) }))

const mockUser = { id: 'user-123' }
vi.mock('@/lib/server-auth', () => ({ getCurrentUser: vi.fn(async () => mockUser) }))

import { POST } from './route'
import { getCurrentUser } from '@/lib/server-auth'

const validRows = [
  { type: 'EXPENSE', categoryId: 'food', amount: 120.5, description: 'Lunch', date: '2026-10-12', note: '', tags: [] },
  { type: 'INCOME', categoryId: 'salary', amount: 2500, description: 'Bonus', date: '2026-10-11' },
  { type: 'TRANSFER', categoryId: 'transfer', amount: 400, description: 'Move funds', date: '2026-10-10' },
]

const request = (transactions: unknown) => new Request('http://localhost/api/transactions/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transactions }),
})

describe('POST /api/transactions/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as Awaited<ReturnType<typeof getCurrentUser>>)
  })

  it('requires authentication', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null)
    const response = await POST(request(validRows))
    expect(response.status).toBe(401)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('rejects missing fields and does not insert any row', async () => {
    const response = await POST(request([{ ...validRows[0], description: '' }]))
    expect(response.status).toBe(400)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('rejects more than 50 rows', async () => {
    const response = await POST(request(Array.from({ length: 51 }, () => validRows[0])))
    expect(response.status).toBe(400)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('rejects the entire batch when one row is invalid', async () => {
    const response = await POST(request([validRows[0], { ...validRows[1], amount: -1 }]))
    expect(response.status).toBe(400)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it('inserts mixed income, expense, and transfer with one statement', async () => {
    const values = vi.fn((rows: Array<{ id: string; ownerId: string; transactionType: string; amount: string }>) => ({
      returning: vi.fn(async () => [...rows].reverse()),
    }))
    mockDb.insert.mockReturnValue({ values })

    const response = await POST(request(validRows))
    expect(response.status).toBe(201)
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
    expect(values).toHaveBeenCalledTimes(1)
    const saved = values.mock.calls[0][0]
    expect(saved).toHaveLength(3)
    expect(saved.map((row) => row.transactionType)).toEqual(['EXPENSE', 'INCOME', 'TRANSFER'])
    expect(saved.map((row) => row.ownerId)).toEqual(['user-123', 'user-123', 'user-123'])
    expect(saved.map((row) => row.amount)).toEqual(['120.5', '2500', '400'])
    const data = await response.json()
    expect(data.transactions.map((row: { id: string }) => row.id)).toEqual(saved.map((row) => row.id))
  })

  it('accepts a single transaction through the same endpoint', async () => {
    const values = vi.fn((rows: Array<{ id: string }>) => ({ returning: vi.fn(async () => rows) }))
    mockDb.insert.mockReturnValue({ values })
    const response = await POST(request([validRows[0]]))
    expect(response.status).toBe(201)
    expect(values.mock.calls[0][0]).toHaveLength(1)
    expect((await response.json()).transactions).toHaveLength(1)
  })

  it('reports database failure without returning partial success', async () => {
    mockDb.insert.mockReturnValue({ values: vi.fn(() => ({ returning: vi.fn().mockRejectedValue(new Error('db down')) })) })
    const response = await POST(request(validRows))
    expect(response.status).toBe(500)
    expect((await response.json()).transactions).toBeUndefined()
  })
})
