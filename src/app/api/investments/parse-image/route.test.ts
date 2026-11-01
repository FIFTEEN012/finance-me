import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const generateContent = vi.hoisted(() => vi.fn())
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
}))
vi.mock('@/lib/server-auth', () => ({ getCurrentUser: vi.fn(async () => ({ id: 'test-user' })) }))

import { POST } from './route'
import { getCurrentUser } from '@/lib/server-auth'

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])

function request(file?: File) {
  const form = new FormData()
  if (file) form.append('image', file)
  return new Request('http://localhost/api/investments/parse-image', { method: 'POST', body: form })
}

describe('POST /api/investments/parse-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'test-user' } as Awaited<ReturnType<typeof getCurrentUser>>)
  })

  it('requires authentication', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null)
    expect((await POST(request(new File([pngBytes], 'portfolio.png', { type: 'image/png' })))).status).toBe(401)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('rejects missing and unsupported files', async () => {
    expect((await POST(request())).status).toBe(400)
    expect((await POST(request(new File(['text'], 'data.txt', { type: 'text/plain' })))).status).toBe(415)
    expect((await POST(request(new File(['fake'], 'fake.png', { type: 'image/png' })))).status).toBe(415)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('rejects files above the server limit', async () => {
    const oversized = new File([pngBytes, new Uint8Array(4 * 1024 * 1024)], 'huge.png', { type: 'image/png' })
    expect((await POST(request(oversized))).status).toBe(413)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('returns nullable fields without inventing missing prices', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ holdings: [{
      name: 'Apple', ticker: 'AAPL', assetClass: 'stock', currency: 'USD',
      units: 5, avgCostPerUnit: null, currentPricePerUnit: 120,
    }] }) })
    const response = await POST(request(new File([pngBytes], 'portfolio.png', { type: 'image/png' })))
    expect(response.status).toBe(200)
    expect((await response.json()).holdings[0].avgCostPerUnit).toBeNull()
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-3.5-flash-lite' }))
  })

  it('rejects empty and malformed model output', async () => {
    generateContent.mockResolvedValueOnce({ text: '{"holdings":[]}' })
    expect((await POST(request(new File([pngBytes], 'empty.png', { type: 'image/png' })))).status).toBe(422)
    generateContent.mockResolvedValueOnce({ text: '{"holdings":[{"name":"AAPL"}]}' })
    expect((await POST(request(new File([pngBytes], 'invalid.png', { type: 'image/png' })))).status).toBe(502)
  })
})
