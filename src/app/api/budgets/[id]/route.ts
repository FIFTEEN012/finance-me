import { NextResponse } from "next/server";
import { softDeleteRow } from "@/lib/sync/softDelete";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeBudgets } from "@/db/schema";
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

  if (body.amount !== undefined) updateData.amount = String(body.amount);
  if (body.allowRollover !== undefined) updateData.allowRollover = !!body.allowRollover;

  const [updated] = await db
    .update(financeBudgets)
    .set(updateData)
    .where(
      and(
        eq(financeBudgets.id, id),
        eq(financeBudgets.ownerId, user.id),
        isNull(financeBudgets.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  return NextResponse.json({ budget: updated });
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

  if (!(await softDeleteRow(financeBudgets, user.id, id))) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
