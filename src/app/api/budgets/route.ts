import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeBudgets } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    .from(financeBudgets)
    .where(eq(financeBudgets.ownerId, user.id));

  return NextResponse.json({ budgets: rows });
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
  const { id, categoryId, amount, month, year, allowRollover } = body;

  if (!categoryId || amount === undefined || !month || !year) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getDatabase();
  const budgetId = id || crypto.randomUUID();

  const [created] = await db
    .insert(financeBudgets)
    .values({
      id: budgetId,
      ownerId: user.id,
      categoryId,
      amount: String(amount),
      month,
      year,
      allowRollover: !!allowRollover,
    })
    .returning();

  return NextResponse.json({ budget: created }, { status: 201 });
}
