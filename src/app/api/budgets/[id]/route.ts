import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeBudgets } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { recordTombstones } from "@/lib/tombstones";

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
    updatedAt: new Date(),
  };

  if (body.amount !== undefined) updateData.amount = String(body.amount);
  if (body.allowRollover !== undefined) updateData.allowRollover = !!body.allowRollover;

  const [updated] = await db
    .update(financeBudgets)
    .set(updateData)
    .where(
      and(
        eq(financeBudgets.id, id),
        eq(financeBudgets.ownerId, user.id)
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
  const db = getDatabase();

  const [deleted] = await db
    .delete(financeBudgets)
    .where(
      and(
        eq(financeBudgets.id, id),
        eq(financeBudgets.ownerId, user.id)
      )
    )
    .returning();

  // Even when the row never reached the server, other devices may hold it.
  await recordTombstones(db, user.id, "budgets", [id]);

  if (!deleted) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
