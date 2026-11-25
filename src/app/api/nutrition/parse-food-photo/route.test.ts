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
const photo = () => new File([pngBytes], 'lunch.png', { type: 'image/png' })

function request(file?: File) {
  const form = new FormData()
  if (file) form.append('image', file)
  return new Request('http://localhost/api/nutrition/parse-food-photo', { method: 'POST', body: form })
}

let userSeq = 0
function signInAsNewUser() {
  const id = `user-${++userSeq}`
  vi.mocked(getCurrentUser).mockResolvedValue({ id } as Awaited<ReturnType<typeof getCurrentUser>>)
  return id
}

const rice = { name: 'ข้าวผัดกะเพราไก่', portion: '1 จาน', kcal: 580, proteinG: 25, carbsG: 70, fatG: 20, confidence: 'high' }

describe('POST /api/nutrition/parse-food-photo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-key'
    signInAsNewUser()
  })

  it('requires sign-in', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null)
    const response = await POST(request(photo()))
    expect(response.status).toBe(401)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('returns 503 when the Gemini key is not configured', async () => {
    delete process.env.GEMINI_API_KEY
    expect((await POST(request(photo()))).status).toBe(503)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('rejects missing, unsupported and disguised files', async () => {
    expect((await POST(request())).status).toBe(400)
    expect((await POST(request(new File(['text'], 'menu.txt', { type: 'text/plain' })))).status).toBe(415)
    expect((await POST(request(new File(['fake'], 'fake.png', { type: 'image/png' })))).status).toBe(415)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('rejects photos above the server limit', async () => {
    const oversized = new File([pngBytes, new Uint8Array(4 * 1024 * 1024)], 'huge.png', { type: 'image/png' })
    expect((await POST(request(oversized))).status).toBe(413)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('limits how often one user can read photos', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ items: [rice] }) })
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) statuses.push((await POST(request(photo()))).status)
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true)
    expect(statuses[10]).toBe(429)
    expect(generateContent).toHaveBeenCalledTimes(10)

    signInAsNewUser()
    expect((await POST(request(photo()))).status).toBe(200)
  })

  it('returns the suggested food items using the same Gemini model', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ items: [rice, { ...rice, name: 'ไข่ดาว', portion: '1 ฟอง', kcal: 90, proteinG: null, carbsG: null, fatG: null, confidence: 'low' }] }) })
    const response = await POST(request(photo()))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      items: [
        rice,
        { name: 'ไข่ดาว', portion: '1 ฟอง', kcal: 90, proteinG: null, carbsG: null, fatG: null, confidence: 'low' },
      ],
    })
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-3.5-flash-lite' }))
  })

  it('drops items that do not fit the schema', async () => {
    generateContent.mockResolvedValue({ text: JSON.stringify({ items: [
      rice,
      { name: 'ไม่มีแคลอรี่', portion: '1 ถ้วย', kcal: null, proteinG: null, carbsG: null, fatG: null, confidence: 'low' },
      { name: '', portion: '1 ถ้วย', kcal: 100, proteinG: null, carbsG: null, fatG: null, confidence: 'low' },
      { name: 'ติดลบ', portion: '1 ถ้วย', kcal: -5, proteinG: null, carbsG: null, fatG: null, confidence: 'low' },
      { name: 'มั่นใจแปลก', portion: '1 ถ้วย', kcal: 100, proteinG: null, carbsG: null, fatG: null, confidence: 'certain' },
    ] }) })
    const body = await (await POST(request(photo()))).json()
    expect(body.items).toEqual([rice])
  })

  it('returns an empty list when no food is in the photo', async () => {
    generateContent.mockResolvedValue({ text: '{"items":[]}' })
    const response = await POST(request(photo()))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ items: [] })
  })

  it('explains Gemini failures in Thai', async () => {
    generateContent.mockRejectedValueOnce(new Error('network down'))
    const failed = await POST(request(photo()))
    expect(failed.status).toBe(502)
    expect((await failed.json()).error).toMatch(/[฀-๿]/)

    generateContent.mockResolvedValueOnce({ text: 'not json' })
    expect((await POST(request(photo()))).status).toBe(502)

    generateContent.mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED'))
    const quota = await POST(request(photo()))
    expect(quota.status).toBe(429)
    expect((await quota.json()).error).toMatch(/[฀-๿]/)
  })
})
