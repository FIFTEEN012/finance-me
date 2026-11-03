import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/server-auth'
import { getDatabase } from '@/db/client'
import { financeTransactions } from '@/db/schema'
import { bulkTransactionSchema } from '@/lib/bulkTransactionSchema'

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bulkTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid transactions', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const values = parsed.data.transactions.map((item) => ({
      id: crypto.randomUUID(),
      ownerId: user.id,
      transactionType: item.type,
      amount: String(item.amount),
      currency: 'THB',
      description: item.description,
      occurredAt: new Date(`${item.date}T12:00:00Z`),
      categoryId: item.categoryId,
      note: item.note || null,
      tags: item.tags?.length ? item.tags : null,
      date: item.date,
      source: 'app',
      sourceMessageId: 'direct',
    }))

    // A single INSERT statement makes the batch atomic.
    const created = await getDatabase().insert(financeTransactions).values(values).returning()
    const byId = new Map(created.map((row) => [row.id, row]))
    return NextResponse.json({ transactions: values.map((value) => byId.get(value.id)) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create transactions' }, { status: 500 })
  }
}
