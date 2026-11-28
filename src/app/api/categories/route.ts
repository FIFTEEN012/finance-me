import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeCategories } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { foodFlagFrom } from "@/lib/foodCategory";

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
    .from(financeCategories)
    .where(and(eq(financeCategories.ownerId, user.id), isNull(financeCategories.deletedAt)));

  return NextResponse.json({ categories: rows });
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
  const { id, name, type, icon, color, isDefault, isFood } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getDatabase();
  const catId = id || crypto.randomUUID();

  const [created] = await db
    .insert(financeCategories)
    .values({
      id: catId,
      ownerId: user.id,
      name,
      type,
      icon: icon || "Folder",
      color: color || "#7c3aed",
      isDefault: !!isDefault,
      isFood: foodFlagFrom(isFood),
    })
    .returning();

  return NextResponse.json({ category: created }, { status: 201 });
}
