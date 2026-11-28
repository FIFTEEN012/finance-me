import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { financeTransactions } from "@/db/schema";
import { and, eq, desc, isNull } from "drizzle-orm";

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
    .where(and(eq(financeTransactions.ownerId, user.id), isNull(financeTransactions.deletedAt)))
    .orderBy(desc(financeTransactions.occurredAt));

  return NextResponse.json({ transactions: rows });
}

// Transactions are created through the sync engine (/api/sync/changes); there is no POST here.
