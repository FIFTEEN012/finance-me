import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter'

let _client: Anthropic | null = null
function getClient() {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

/* ── Types ──────────────────────────────────────────── */

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface CategorySummary {
  name:   string
  amount: number
  budget?: number
}

interface MonthSummary {
  label:   string
  income:  number
  expense: number
}

interface FinancialContext {
  totalTransactions:    number
  currentMonthIncome:   number
  currentMonthExpense:  number
  currentMonthSavings:  number
  savingsRate:          number
  topExpenseCategories: CategorySummary[]
  last3Months:          MonthSummary[]
  budgetStatus:         CategorySummary[]
  netWorth?:            number
  currency:             string
  displayName?:         string
}

/* ── System prompt builder ──────────────────────────── */

function buildSystemPrompt(ctx: FinancialContext): string {
  const name = ctx.displayName ? `คุณ${ctx.displayName}` : 'คุณ'
  const fmt  = (n: number) => n.toLocaleString('th-TH', { maximumFractionDigits: 0 })

  const topCats = ctx.topExpenseCategories
    .slice(0, 5)
    .map((c) => {
      const budgetNote = c.budget
        ? ` (งบ ${fmt(c.budget)} บาท, ใช้ไป ${Math.round((c.amount / c.budget) * 100)}%)`
        : ''
      return `  • ${c.name}: ${fmt(c.amount)} บาท${budgetNote}`
    })
    .join('\n')

  const months = ctx.last3Months
    .map((m) => `  • ${m.label}: รายรับ ${fmt(m.income)} | รายจ่าย ${fmt(m.expense)} | ออม ${fmt(m.income - m.expense)} บาท`)
    .join('\n')

  const overBudget = ctx.budgetStatus
    .filter((b) => b.budget && b.amount > b.budget)
    .map((b) => `  ⚠️ ${b.name}: ใช้ ${fmt(b.amount)} เกินงบ ${fmt(b.budget!)} บาท`)
    .join('\n')

  return `คุณคือ "FinanceMe Coach" — โค้ชการเงินส่วนตัวอัจฉริยะสำหรับแอป FinanceMe

บุคลิก:
- พูดภาษาไทยเป็นกันเอง อบอุ่น ให้กำลังใจ ไม่ตัดสิน
- ตอบกระชับ ชัดเจน เน้นประเด็นสำคัญ
- ใช้ตัวเลขจริงจากข้อมูลของ${name}เมื่อวิเคราะห์
- ให้คำแนะนำที่ปฏิบัติได้จริง (actionable) เป็นข้อๆ
- เชิญชวนให้ถามต่อ หรือเสนอหัวข้อที่น่าสนใจ
- ไม่แนะนำให้ลงทุนในสินทรัพย์เสี่ยง ไม่แนะนำหลักทรัพย์เฉพาะเจาะจง
- ห้ามแชร์ข้อมูลนี้กับใคร เป็นข้อมูลส่วนตัว

ข้อมูลการเงินของ${name} (ข้อมูล ณ ปัจจุบัน):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 เดือนนี้
  • รายรับ:  ${fmt(ctx.currentMonthIncome)} ${ctx.currency}
  • รายจ่าย: ${fmt(ctx.currentMonthExpense)} ${ctx.currency}
  • ออมได้:  ${fmt(ctx.currentMonthSavings)} ${ctx.currency}
  • อัตราออม: ${ctx.savingsRate.toFixed(1)}%${ctx.netWorth !== undefined ? `\n  • Net Worth: ${fmt(ctx.netWorth)} ${ctx.currency}` : ''}

📈 ย้อนหลัง 3 เดือน
${months || '  ยังไม่มีข้อมูลเพียงพอ'}

🏆 หมวดใช้จ่ายสูงสุดเดือนนี้
${topCats || '  ยังไม่มีข้อมูล'}

${overBudget ? `🚨 เกินงบประมาณ\n${overBudget}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
จำนวนธุรกรรมทั้งหมดในระบบ: ${ctx.totalTransactions} รายการ

เริ่มต้น: ถ้า${name}ถามครั้งแรก ให้ทักทายสั้นๆ แล้วสรุปสถานการณ์การเงินเดือนนี้และให้คำแนะนำ 1-2 ข้อที่เกี่ยวข้องที่สุด`
}

/* ── Route handler ──────────────────────────────────── */

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  const ip = getClientIp(request)
  const rl = checkRateLimit(`coach:${ip}`, 30, 60_000) // 30 req/min
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  let body: { messages: Message[]; context: FinancialContext }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { messages, context } = body
  if (!messages?.length || !context) {
    return NextResponse.json({ error: 'Missing messages or context' }, { status: 400 })
  }

  const systemPrompt = buildSystemPrompt(context)

  // Convert to Anthropic message format
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role:    m.role,
    content: m.content,
  }))

  try {
    // Create a streaming response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await getClient().messages.create({
            model:      'claude-haiku-4-5',
            max_tokens: 1024,
            system:     systemPrompt,
            messages:   anthropicMessages,
            stream:     true,
          })

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          const status  = (err as { status?: number }).status

          let userMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
          if (status === 401)  userMessage = '⚠️ API Key ไม่ถูกต้อง'
          if (status === 402)  userMessage = '⚠️ เครดิต Anthropic หมด'
          if (status === 429)  userMessage = '⚠️ ส่งคำขอถี่เกินไป กรุณารอสักครู่'
          if (message.includes('overloaded')) userMessage = '⚠️ เซิร์ฟเวอร์ AI ยุ่งมาก กรุณาลองใหม่ในอีกสักครู่'

          controller.enqueue(encoder.encode(userMessage))
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type':  'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
