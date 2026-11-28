import { NextResponse } from "next/server";
import { softDeleteRow } from "@/lib/sync/softDelete";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeDebts } from "@/db/schema";
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
    // A change made here is an edit like any device's: it takes part in
    // last-edit-wins and reaches every device on its next pull.
    editedAt: new Date(),
    updatedAt: sql`now()`,
  };

  if (body.person !== undefined) updateData.person = body.person;
  if (body.type !== undefined) updateData.type = body.type;
  if (body.originalAmount !== undefined) updateData.originalAmount = String(body.originalAmount);
  if (body.remainingAmount !== undefined) updateData.remainingAmount = String(body.remainingAmount);
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate;
  if (body.note !== undefined) updateData.note = body.note;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.payments !== undefined) updateData.payments = body.payments;

  const [updated] = await db
    .update(financeDebts)
    .set(updateData)
    .where(
      and(
        eq(financeDebts.id, id),
        eq(financeDebts.ownerId, user.id),
        isNull(financeDebts.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Debt not found" }, { status: 404 });
  }

  return NextResponse.json({ debt: updated });
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

  if (!(await softDeleteRow(financeDebts, user.id, id))) {
    return NextResponse.json({ error: "Debt not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
