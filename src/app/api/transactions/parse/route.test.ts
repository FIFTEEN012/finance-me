import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const generateContent = vi.hoisted(() => vi.fn())
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
}))

const mockUser = { id: 'user-123' }
vi.mock('@/lib/server-auth', () => ({ getCurrentUser: vi.fn(async () => mockUser) }))

import { POST } from './route'
import { getCurrentUser } from '@/lib/server-auth'

const input = {
  text: 'กาแฟ 85 บาทเมื่อวาน',
  today: '2026-10-17',
  maxEntries: 10,
  categories: [
    { id: 'food', name: 'อาหาร', type: 'EXPENSE' },
    { id: 'salary', name: 'เงินเดือน', type: 'INCOME' },
  ],
  existingTags: ['กาแฟ', 'วันทำงาน'],
}

const request = (body: unknown) => new Request('http://localhost/api/transactions/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

describe('POST /api/transactions/parse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser as Awaited<ReturnType<typeof getCurrentUser>>)
  })

  it('requires authentication before calling Gemini', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null)
    expect((await POST(request(input))).status).toBe(401)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('requires server configuration', async () => {
    delete process.env.GEMINI_API_KEY
    expect((await POST(request(input))).status).toBe(503)
  })

  it('rejects oversized input without calling Gemini', async () => {
    expect((await POST(request({ ...input, text: 'x'.repeat(1001) }))).status).toBe(400)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('returns validated suggestions and clears a mismatched category', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ transactions: [
      { type: 'EXPENSE', categoryId: 'food', amount: 85, description: 'กาแฟ', date: '2026-10-16', suggestedTags: ['กาแฟ', 'เครื่องดื่ม'] },
      { type: 'INCOME', categoryId: 'food', amount: 200, description: 'รับเงิน', date: '2026-10-17', suggestedTags: [] },
    ] }) })
    const response = await POST(request(input))
    expect(response.status).toBe(200)
    const transactions = (await response.json()).transactions
    expect(transactions.map((item: { categoryId: string }) => item.categoryId)).toEqual(['food', ''])
    expect(transactions[0].suggestedTags).toEqual(['กาแฟ', 'เครื่องดื่ม'])
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-3.5-flash-lite' }))
    expect(generateContent.mock.calls[0][0].config.systemInstruction).toContain('วันทำงาน')
  })

  it('reuses existing tags and normalizes duplicate new suggestions', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ transactions: [
      { type: 'EXPENSE', categoryId: 'food', amount: 85, description: 'กาแฟ', date: '2026-10-16', suggestedTags: [' กาแฟ ', 'กาแฟ', 'Coffee Shop', 'coffee-shop', 'x'.repeat(41)] },
    ] }) })
    const response = await POST(request(input))
    expect(response.status).toBe(200)
    expect((await response.json()).transactions[0].suggestedTags).toEqual(['กาแฟ', 'coffee-shop'])
  })

  it('rejects invalid model output instead of returning unsafe data', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ transactions: [
      { type: 'EXPENSE', categoryId: 'food', amount: -85, description: 'กาแฟ', date: '2026-10-16', suggestedTags: [] },
    ] }) })
    expect((await POST(request(input))).status).toBe(502)
  })

  it('reports a full free-tier quota', async () => {
    generateContent.mockRejectedValue(new Error('429 RESOURCE_EXHAUSTED'))
    expect((await POST(request(input))).status).toBe(429)
  })
})
