import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeGoals } from "@/db/schema";
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
    .from(financeGoals)
    .where(eq(financeGoals.ownerId, user.id));

  return NextResponse.json({ goals: rows });
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
  const { id, name, targetAmount, savedAmount, targetDate, description, icon, color } = body;

  if (!name || targetAmount === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getDatabase();
  const goalId = id || crypto.randomUUID();

  const [created] = await db
    .insert(financeGoals)
    .values({
      id: goalId,
      ownerId: user.id,
      name,
      targetAmount: String(targetAmount),
      savedAmount: String(savedAmount || 0),
      targetDate: targetDate || new Date().toISOString().split("T")[0],
      description: description || null,
      icon: icon || "Target",
      color: color || "#10b981",
    })
    .returning();

  return NextResponse.json({ goal: created }, { status: 201 });
}
