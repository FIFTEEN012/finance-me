import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { getDatabase } from "@/db/client";
import { pullRecords, pushChanges } from "@/lib/sync/serverRecords";
import { pushRequestSchema, sinceSchema } from "@/lib/sync/contract";

export const dynamic = "force-dynamic";

// Generic on purpose: no database or validation details reach the client.
const INVALID = { error: "คำขอซิงก์ไม่ถูกต้อง" };
const FAILED = { error: "ซิงก์ข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง" };

/**
 * GET /api/sync/changes?since=<cursor>
 * The caller's User Data records changed after the cursor (all without one),
 * tombstones included, plus the next cursor. See `src/lib/sync/contract.ts`.
 */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = sinceSchema.safeParse(new URL(request.url).searchParams.get("since") ?? undefined);
  if (!since.success) {
    return NextResponse.json(INVALID, { status: 400 });
  }

  try {
    return NextResponse.json(await pullRecords(getDatabase(), user.id, since.data));
  } catch (error) {
    console.error("Sync pull failed:", error);
    return NextResponse.json(FAILED, { status: 500 });
  }
}

/**
 * POST /api/sync/changes  { changes: [{ kind, id, editedAt, data | null }] }
 * Last edit wins per record; answers accepted/rejected per change.
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(INVALID, { status: 400 });
  }
  const parsed = pushRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(INVALID, { status: 400 });
  }

  try {
    const results = await pushChanges(getDatabase(), user.id, parsed.data.changes);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Sync push failed:", error);
    return NextResponse.json(FAILED, { status: 500 });
  }
}
