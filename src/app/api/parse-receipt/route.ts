import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PARSE_PROMPT = `
คุณเป็น OCR parser สำหรับสลิปและใบเสร็จภาษาไทย
วิเคราะห์รูปภาพนี้แล้วดึงข้อมูลออกมาเป็น JSON ตามรูปแบบด้านล่าง

กฎสำคัญ:
- amount: ยอดรวมสุดท้าย/ยอดโอน/ยอดสุทธิ เป็นตัวเลขเท่านั้น (ไม่มีสัญลักษณ์หรือ comma)
- type: "EXPENSE" ถ้าเป็นการจ่ายเงิน/ซื้อของ/โอนออก, "INCOME" ถ้าเป็นรับเงิน/โอนเข้า, "UNKNOWN" ถ้าไม่แน่ใจ
- merchant: ชื่อร้าน/ผู้รับเงิน/ผู้โอน (ภาษาไทยหรืออังกฤษตามที่ปรากฎ)
- description: คำอธิบายสั้นภาษาไทย 1-5 คำ เช่น "ซื้อกาแฟ", "โอนเงิน", "ค่าอาหาร"
- date: วันที่ในรูปแบบ YYYY-MM-DD (ถ้าไม่พบให้ใช้ null)
- currency: สกุลเงิน (THB เป็นค่าเริ่มต้น)
- confidence: ความมั่นใจ 0.0-1.0

รองรับ: สลิปพร้อมเพย์, สลิปโอนเงินธนาคาร, ใบเสร็จร้านค้า, บิลบัตรเครดิต

ตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น:
{
  "amount": number | null,
  "currency": string,
  "type": "EXPENSE" | "INCOME" | "UNKNOWN",
  "merchant": string | null,
  "description": string | null,
  "date": string | null,
  "confidence": number
}
`

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 503 }
    )
  }

  let body: { image: string; mimeType: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { image, mimeType } = body
  if (!image || !mimeType) {
    return NextResponse.json({ error: 'Missing image or mimeType' }, { status: 400 })
  }

  const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!supported.includes(mimeType)) {
    return NextResponse.json({ error: `Unsupported image type: ${mimeType}` }, { status: 400 })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: image,
              },
            },
            {
              type: 'text',
              text: PARSE_PROMPT,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON (handle markdown code blocks if present)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No JSON in response', raw: text }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const status = (err as { status?: number }).status

    if (status === 401 || message.includes('authentication')) {
      return NextResponse.json(
        { error: 'API Key ไม่ถูกต้อง — ตรวจสอบ ANTHROPIC_API_KEY ใน .env.local' },
        { status: 401 }
      )
    }
    if (status === 402 || message.includes('credit balance')) {
      return NextResponse.json(
        { error: 'เครดิต Anthropic หมด — เติมเงินที่ console.anthropic.com', code: 'INSUFFICIENT_CREDIT' },
        { status: 402 }
      )
    }
    if (status === 429 || message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' },
        { status: 429 }
      )
    }

    return NextResponse.json({ error: 'วิเคราะห์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 })
  }
}
