import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeTransactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDatabase();
  const rows = await db
    .select()
    .from(financeTransactions)
    .where(eq(financeTransactions.ownerId, user.id))
    .orderBy(desc(financeTransactions.occurredAt));

  return NextResponse.json({ transactions: rows });
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    id,
    type,
    amount,
    description,
    categoryId,
    note,
    tags,
    transferKind,
    linkedInvestmentOrderId,
    date,
  } = body;

  if (!type || !amount || !description || !categoryId || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getDatabase();
  const occurredAt = new Date(date.length <= 10 ? `${date}T12:00:00Z` : date);

  const [created] = await db
    .insert(financeTransactions)
    .values({
      id: id || crypto.randomUUID(),
      ownerId: user.id,
      transactionType: type,
      amount: String(amount),
      currency: "THB",
      description,
      occurredAt,
      categoryId,
      note: note || null,
      tags: tags || null,
      transferKind: transferKind || null,
      linkedInvestmentOrderId: linkedInvestmentOrderId || null,
      date,
      source: "app",
      sourceMessageId: "direct",
    })
    .returning();

  return NextResponse.json({ transaction: created }, { status: 201 });
}
