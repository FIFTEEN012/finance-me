import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeGoals } from "@/db/schema";
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

  if (body.name !== undefined) updateData.name = body.name;
  if (body.targetAmount !== undefined) updateData.targetAmount = String(body.targetAmount);
  if (body.savedAmount !== undefined) updateData.savedAmount = String(body.savedAmount);
  if (body.targetDate !== undefined) updateData.targetDate = body.targetDate;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.color !== undefined) updateData.color = body.color;

  const [updated] = await db
    .update(financeGoals)
    .set(updateData)
    .where(
      and(
        eq(financeGoals.id, id),
        eq(financeGoals.ownerId, user.id),
        isNull(financeGoals.deletedAt)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json({ goal: updated });
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

  // Soft delete: the row stays as a tombstone so no device can upload it again.
  const now = new Date();
  const [deleted] = await db
    .update(financeGoals)
    .set({ deletedAt: now, editedAt: now, updatedAt: sql`now()` })
    .where(
      and(
        eq(financeGoals.id, id),
        eq(financeGoals.ownerId, user.id),
        isNull(financeGoals.deletedAt)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
