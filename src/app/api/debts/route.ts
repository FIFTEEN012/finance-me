import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeDebts } from "@/db/schema";
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
    .from(financeDebts)
    .where(eq(financeDebts.ownerId, user.id));

  return NextResponse.json({ debts: rows });
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
  const { id, person, type, originalAmount, remainingAmount, dueDate, note, status, payments } = body;

  if (!person || originalAmount === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getDatabase();
  const debtId = id || crypto.randomUUID();

  const [created] = await db
    .insert(financeDebts)
    .values({
      id: debtId,
      ownerId: user.id,
      person,
      type: type || "I_OWE",
      originalAmount: String(originalAmount),
      remainingAmount: String(remainingAmount !== undefined ? remainingAmount : originalAmount),
      dueDate: dueDate || null,
      note: note || null,
      status: status || "ACTIVE",
      payments: payments || [],
    })
    .returning();

  return NextResponse.json({ debt: created }, { status: 201 });
}
