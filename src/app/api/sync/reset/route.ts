import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { resetRecords } from "@/lib/sync/serverRecords";

export const dynamic = "force-dynamic";

// Generic on purpose: no database details reach the client.
const FAILED = { error: "รีเซ็ตข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง" };

/**
 * POST /api/sync/reset → { resetAt }
 * Reset: deletes all of the signed-in user's User Data and recreates the
 * default categories, in one transaction. See `SYNC_RESET_PATH` in
 * `src/lib/sync/contract.ts`.
 */
export async function POST() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await resetRecords(getDatabase(), user.id));
  } catch (error) {
    console.error("Reset failed:", error);
    return NextResponse.json(FAILED, { status: 500 });
  }
}
