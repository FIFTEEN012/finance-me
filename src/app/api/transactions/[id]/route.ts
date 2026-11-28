import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeTransactions } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const db = getDatabase();

  const updateData: Record<string, any> = {
    editedAt: new Date(),
    updatedAt: sql`now()`,
  };

  if (body.type !== undefined) updateData.transactionType = body.type;
  if (body.amount !== undefined) updateData.amount = String(body.amount);
  if (body.description !== undefined) updateData.description = body.description;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.note !== undefined) updateData.note = body.note;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.transferKind !== undefined) updateData.transferKind = body.transferKind;
  if (body.linkedInvestmentOrderId !== undefined)
    updateData.linkedInvestmentOrderId = body.linkedInvestmentOrderId;
  if (body.date !== undefined) {
    updateData.date = body.date;
    updateData.occurredAt = new Date(
      body.date.length <= 10 ? `${body.date}T12:00:00Z` : body.date
    );
  }

  const [updated] = await db
    .update(financeTransactions)
    .set(updateData)
    .where(
      and(
        eq(financeTransactions.id, id),
        eq(financeTransactions.ownerId, user.id),
        isNull(financeTransactions.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ transaction: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDatabase();

  // Kept as a tombstone so no device can upload it again (ADR-0003).
  const now = new Date();
  const [deleted] = await db
    .update(financeTransactions)
    .set({ deletedAt: now, editedAt: now, updatedAt: sql`now()` })
    .where(
      and(
        eq(financeTransactions.id, id),
        eq(financeTransactions.ownerId, user.id),
        isNull(financeTransactions.deletedAt)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
